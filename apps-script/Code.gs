/**
 * Bíblia lida por elas — Google Forms → GitHub Actions.
 *
 * Paste this file into the form's Apps Script editor (Extensions → Apps Script) and follow
 * docs/SETUP, section 3. Script properties (Project Settings → Script properties):
 *   GITHUB_REPO              owner/repo, e.g. "feijaocosta/bible-reading"
 *   GITHUB_TOKEN_DISPATCH    fine-grained token for that repo only (Contents: read and write)
 *
 * Functions to run by hand (select it in the toolbar, then ▶ Run):
 *   setupForm()            creates the questions (except the audio upload, which Google does not
 *                          allow scripts to create — add it by hand)
 *   installTrigger()       makes every form submission start the video workflow
 *   resendLatestResponse() sends the latest response again (e.g. after fixing a token)
 */

// Question titles: the code finds the answers by these exact titles.
var Q = {
  NARRATOR: 'Nome de quem leu',
  BOOK: 'Livro',
  PART: 'Parte da leitura',
  CHAPTER: 'Capítulo',
  AUDIO: 'Áudio',
  VALIDATED: 'Conferência',
};
var PARTS = { 'Capítulo': 'chapter', 'Introdução': 'intro', 'Encerramento': 'closing' };
var VALIDATED_OPTION = 'Ouvi e validei esta leitura';

// ---------- Form setup ----------

function setupForm() {
  var form = FormApp.getActiveForm();
  var books = fetchBooks_();
  var existing = form.getItems().map(function (item) { return item.getTitle(); });
  var has = function (title) { return existing.indexOf(title) !== -1; };

  form.setTitle('Bíblia lida por elas — nova leitura');
  form.setDescription('Preencha depois de ouvir e conferir o áudio. Ao enviar, o vídeo é gerado e publicado sozinho no YouTube em alguns minutos.');
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);

  if (!has(Q.NARRATOR)) form.addTextItem().setTitle(Q.NARRATOR).setRequired(true);
  if (!has(Q.BOOK)) {
    form.addListItem().setTitle(Q.BOOK).setRequired(true)
      .setChoiceValues(books.map(function (b) { return b.name; }));
  }
  if (!has(Q.PART)) {
    form.addMultipleChoiceItem().setTitle(Q.PART).setRequired(true)
      .setChoiceValues(['Capítulo', 'Introdução', 'Encerramento']);
  }
  if (!has(Q.CHAPTER)) {
    form.addTextItem().setTitle(Q.CHAPTER).setRequired(false)
      .setHelpText('Só o número. Deixe em branco se for introdução ou encerramento.')
      .setValidation(FormApp.createTextValidation().requireWholeNumber()
        .setHelpText('Digite só o número do capítulo, por exemplo 3.').build());
  }
  if (!has(Q.VALIDATED)) {
    form.addCheckboxItem().setTitle(Q.VALIDATED).setRequired(true).setChoiceValues([VALIDATED_OPTION]);
  }
  Logger.log('Questions ready. Now add the "' + Q.AUDIO + '" file upload question by hand (docs/SETUP, section 3).');
}

// Reads data/books.json through the GitHub API with the same token, so it works for private repos too.
function fetchBooks_() {
  var repo = property_('GITHUB_REPO');
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/contents/data/books.json', {
    headers: {
      Authorization: 'Bearer ' + property_('GITHUB_TOKEN_DISPATCH'),
      Accept: 'application/vnd.github.raw+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('Não foi possível ler data/books.json de "' + repo + '" (HTTP ' + code + '). ' +
      'Confira a propriedade GITHUB_REPO (formato dono/repositório, sem espaços) e se o token ' +
      'GITHUB_TOKEN_DISPATCH tem acesso a esse repositório.');
  }
  return JSON.parse(res.getContentText());
}

function installTrigger() {
  var form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
  Logger.log('Trigger installed: each new response starts the video workflow.');
}

// ---------- Submission → GitHub ----------

function onFormSubmit(e) {
  handleResponse_(e.response);
}

function resendLatestResponse() {
  var responses = FormApp.getActiveForm().getResponses();
  if (!responses.length) throw new Error('The form has no responses yet.');
  handleResponse_(responses[responses.length - 1]);
}

function handleResponse_(response) {
  try {
    var payload = buildPayload(answersOf_(response), response.getId());
    dispatch_(payload);
    Logger.log('Sent to GitHub: ' + JSON.stringify(payload));
  } catch (err) {
    notifyOwner_(err, response);
    throw err;
  }
}

function answersOf_(response) {
  var answers = {};
  response.getItemResponses().forEach(function (r) { answers[r.getItem().getTitle()] = r.getResponse(); });
  return answers;
}

/**
 * Turns the form answers into the repository_dispatch payload. Pure function (tested in Node).
 * The testament is not asked: the pipeline derives it from the book.
 */
function buildPayload(answers, responseId) {
  var text = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); };
  var narrator = text(answers[Q.NARRATOR]);
  var book = text(answers[Q.BOOK]);
  var part = PARTS[text(answers[Q.PART])];
  var chapterText = text(answers[Q.CHAPTER]);
  var files = answers[Q.AUDIO] || [];
  var validated = [].concat(answers[Q.VALIDATED] || []);

  if (!responseId) throw new Error('Missing response id.');
  if (!narrator) throw new Error('Faltou o nome de quem leu.');
  if (!book) throw new Error('Faltou o livro.');
  if (!part) throw new Error('Faltou a parte da leitura (capítulo, introdução ou encerramento).');
  if (validated.indexOf(VALIDATED_OPTION) === -1) throw new Error('A leitura não foi marcada como validada.');
  if (!files.length) throw new Error('Faltou o áudio. A pergunta "' + Q.AUDIO + '" existe no formulário?');

  var chapter = null;
  if (part === 'chapter') {
    if (!/^\d+$/.test(chapterText) || Number(chapterText) < 1) throw new Error('Para "Capítulo", informe o número do capítulo.');
    chapter = Number(chapterText);
  }

  return { id: responseId, book: book, part: part, chapter: chapter, narrator: narrator, driveFileId: String(files[0]) };
}

function dispatch_(payload) {
  var repo = property_('GITHUB_REPO');
  var res = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + property_('GITHUB_TOKEN_DISPATCH'),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload: JSON.stringify({ event_type: 'new-reading', client_payload: payload }),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code !== 204) {
    var hint = code === 401 || code === 403 || code === 404
      ? ' O token do GitHub está inválido, venceu ou não tem permissão "Contents: read and write" em ' + repo + '.' : '';
    throw new Error('O GitHub recusou o envio (HTTP ' + code + ').' + hint + ' ' + res.getContentText());
  }
}

function property_(name) {
  var value = (PropertiesService.getScriptProperties().getProperty(name) || '').trim();
  if (!value) throw new Error('A propriedade ' + name + ' não está configurada (Configurações do projeto → Propriedades do script).');
  return value;
}

function notifyOwner_(err, response) {
  try {
    var to = Session.getEffectiveUser().getEmail();
    MailApp.sendEmail(to, 'Bíblia lida por elas: uma leitura não foi enviada',
      'Uma resposta do formulário não pôde ser enviada para gerar o vídeo.\n\n' +
      'Motivo: ' + err.message + '\n\n' +
      'Corrija o problema e, no editor do Apps Script, rode a função resendLatestResponse ' +
      '(ou envie o formulário de novo).\n\nResposta: ' + response.getEditResponseUrl());
  } catch (mailErr) {
    Logger.log('Could not send the e-mail: ' + mailErr);
  }
}
