# Configuração passo a passo

*Read in English: [SETUP.md](SETUP.md)*

Este guia reúne tudo o que precisa ser feito à mão, fora do código. Ele cresce a cada fase do projeto. Siga as seções na ordem.

## 1. Gerar um vídeo manualmente (GitHub Actions)

Serve para testar o processo completo sem formulário e sem YouTube. O vídeo fica disponível para download na página da execução.

### 1.1. Deixe o áudio acessível por um link

O GitHub precisa baixar o áudio de algum lugar. Use uma destas opções:

1. **Google Drive:** envie o arquivo para o Drive, clique com o botão direito nele, **Compartilhar** → em "Acesso geral" escolha **Qualquer pessoa com o link** → **Copiar link**.
2. **Dropbox:** **Compartilhar** → **Copiar link**.
3. Qualquer **link direto** para um arquivo `.ogg`, `.opus`, `.mp3` ou `.m4a`.

> ⚠️ **Privacidade:** o repositório é público, então **o link digitado fica visível** no histórico de execuções do Actions. Use áudios de teste. Depois de testar, volte o compartilhamento do Drive para **Restrito**. Na operação normal (fase F4), o áudio é baixado do Drive com uma conta de serviço e nenhum link fica exposto.

### 1.2. Dispare o workflow

1. No GitHub, abra o repositório e clique na aba **Actions**.
2. Na lista da esquerda, clique em **Nova leitura**.
3. À direita, clique em **Run workflow**.
4. Preencha os campos:
   - **Livro:** nome como na NVI, por exemplo `Gênesis`, `Salmos`, `1 Tessalonicenses`. Maiúsculas e acentos não importam.
   - **Capítulo:** o número, ou `introdução` / `encerramento`.
   - **Nome de quem leu**.
   - **Link do áudio:** o link do passo 1.1.
5. Clique no botão verde **Run workflow**.

### 1.3. Baixe o vídeo

1. Depois de alguns segundos, a execução aparece na lista. Clique nela.
2. Espere o círculo amarelo virar um ✅ verde. Leva uns 2 a 3 minutos.
3. A página mostra um resumo da leitura. Role até **Artifacts** e clique em `leitura-N` para baixar um `.zip` com:
   - `output.mp4`: o vídeo;
   - `artwork.png`: a arte em 1920x1080;
   - `thumbnail.jpg`: a miniatura do YouTube;
   - `reading.json`: os dados da leitura.

Os arquivos ficam disponíveis por 30 dias.

### Se der erro (❌ vermelho)

Clique na execução, depois em **video** e abra o passo que falhou. A mensagem que começa com `Error:` diz o que aconteceu. As mais comuns:

| Mensagem | O que fazer |
|---|---|
| `Unknown book` | Confira o nome do livro (NVI). |
| `Invalid chapter` | O livro não tem esse capítulo. |
| `returned a web page instead of an audio file` | O link do Drive não está como "Qualquer pessoa com o link". |
| `the minimum is 10s` | O áudio tem menos de 10 segundos. Confira se o arquivo é o certo. |

## 2. Publicar no YouTube

Feito uma vez só. Ao final, o workflow sobe o vídeo no canal, coloca na playlist do testamento e atualiza o catálogo do app.

> 💡 O Google muda os nomes dos menus com frequência. Se algum botão estiver com outro nome, procure pelo termo mais próximo. O caminho continua o mesmo.

### 2.1. Canal do YouTube

1. Entre em [youtube.com](https://www.youtube.com) com a conta Google que vai cuidar do projeto.
2. Se ainda não houver um canal, clique na foto → **Criar um canal**. Use o nome "Bíblia lida por elas".
3. Acesse [youtube.com/verify](https://www.youtube.com/verify) e verifique o canal pelo celular. **Sem isso, o YouTube não aceita a miniatura personalizada** (a arte do vídeo).

### 2.2. Playlists

1. Abra o [YouTube Studio](https://studio.youtube.com) → **Conteúdo** → **Playlists** → **Nova playlist**.
2. Crie duas, com visibilidade **Pública** ou **Não listada**: `Antigo Testamento` e `Novo Testamento`.
3. Abra cada playlist. O endereço termina em `list=PL...`. Copie o código que começa com `PL` e anote qual é de qual testamento.

### 2.3. Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) com a mesma conta. Aceite os termos se for o primeiro acesso. **Não é preciso cadastrar cartão de crédito.**
2. No topo, clique no seletor de projetos → **Novo projeto**. Nome: `biblia-lida-por-elas` → **Criar**. Confira se o projeto novo ficou selecionado no topo.
3. No menu ☰ → **APIs e serviços** → **Biblioteca**. Procure **YouTube Data API v3** → **Ativar**.

### 2.4. Tela de consentimento (OAuth)

1. Menu ☰ → **APIs e serviços** → **Tela de permissão OAuth** (pode aparecer como **Google Auth Platform**) → **Começar**.
2. Nome do app: `Bíblia lida por elas`. E-mail de suporte: o seu. → **Próxima**.
3. Público: **Externo** → **Próxima**. Informe seu e-mail de contato → **Próxima** → aceite → **Criar**.
4. Vá em **Público-alvo** (Audience) → **Publicar app** → **Confirmar**. O status deve ficar **Em produção**.
   > ⚠️ Se o app ficar em "Teste", a autorização **expira em cerca de 7 dias** e os uploads param de funcionar.

### 2.5. Credencial OAuth

1. Em **Clientes** (ou **APIs e serviços** → **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**):
2. Tipo de aplicativo: **Aplicativo da Web**. Nome: `GitHub Actions`.
3. Em **URIs de redirecionamento autorizados**, adicione exatamente: `https://developers.google.com/oauthplayground`
4. **Criar**. Aparecem o **ID do cliente** e a **Chave secreta do cliente**. Copie os dois para um lugar seguro, por enquanto.

### 2.6. Autorizar o canal (refresh token)

O GitHub vai usar esta autorização para enviar vídeos em nome do canal. Ela é feita pelo OAuth Playground do Google, sem instalar nada.

1. Abra [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Clique na engrenagem ⚙️ (canto superior direito) → marque **Use your own OAuth credentials** → cole o **ID do cliente** e a **Chave secreta** do passo 2.5 → feche a engrenagem.
3. À esquerda, no campo **Input your own scopes**, digite: `https://www.googleapis.com/auth/youtube` → **Authorize APIs**.
4. Entre com a conta do canal. Se o canal for de uma "conta de marca", **escolha o canal** na lista.
5. Vai aparecer "O Google não verificou este app". É esperado, porque o app é seu. Clique em **Avançado** → **Acessar Bíblia lida por elas (não seguro)** → **Continuar**.
6. De volta ao Playground, clique em **Exchange authorization code for tokens**.
7. Copie o **Refresh token**, um texto longo que começa com `1//`.

### 2.7. Guardar tudo no GitHub

1. No repositório: **Settings** → **Secrets and variables** → **Actions**.
2. Aba **Secrets** → **New repository secret**. Crie um por vez:

   | Nome | Valor |
   |---|---|
   | `YT_CLIENT_ID` | ID do cliente (2.5) |
   | `YT_CLIENT_SECRET` | Chave secreta do cliente (2.5) |
   | `YT_REFRESH_TOKEN` | Refresh token (2.6) |

3. Aba **Variables** → **New repository variable**:

   | Nome | Valor |
   |---|---|
   | `YT_PLAYLIST_OT` | código `PL...` da playlist Antigo Testamento |
   | `YT_PLAYLIST_NT` | código `PL...` da playlist Novo Testamento |
   | `YT_PRIVACY` | `unlisted` (não listado), `public` ou `private` |

> 🔒 Segredos nunca aparecem nos logs e não ficam visíveis no repositório público. Não cole esses valores em nenhum arquivo.

### 2.8. Pedir a auditoria da API (importante)

Pela documentação do YouTube, vídeos enviados por um projeto de API **não auditado** podem ser travados como **privados**, sem possibilidade de recurso. A auditoria é gratuita.

> 📝 No nosso primeiro teste (nov/2026), o vídeo saiu **público mesmo sem auditoria**. Ainda assim, peça a auditoria: a regra continua na documentação, a trava pode acontecer depois do envio e a auditoria também é o caminho para pedir mais cota. Se algum vídeo aparecer como privado sem você ter pedido, a causa é essa.

1. Abra o formulário [YouTube API Services – Audit and Quota Extension](https://support.google.com/youtube/contact/yt_api_form).
2. Escolha a opção de auditoria (audit) e preencha com os dados do projeto (nome e número do projeto aparecem no painel do Google Cloud). Explique o uso: *"Uploads automáticos de leituras bíblicas gravadas por voluntárias para o nosso próprio canal; uso interno, sem usuários externos."*
3. A resposta pode levar algumas semanas. Enquanto isso, confira de vez em quando no YouTube Studio se os vídeos continuam com a visibilidade escolhida.

### 2.9. Testar

1. Siga a seção 1, mas marque **Publicar no YouTube e no catálogo**.
2. No fim da execução, o resumo mostra o link do vídeo. Um commit do `github-actions[bot]` adiciona a leitura em `data/readings.json`.
3. Rodar de novo com o mesmo **ID da leitura** não envia o vídeo duas vezes: a execução diz "already published" e para.

### Limites e problemas conhecidos

- **Cota diária da API:** o Google mudou as regras de cota de upload recentemente e as fontes divergem: algumas falam em cerca de 6 envios por dia, outras em cerca de 100. Confira o valor real em **Google Cloud → APIs e serviços → YouTube Data API v3 → Cotas**. Se a cota acabar, a execução falha com `quotaExceeded`, o vídeo fica salvo nos Artifacts e basta rodar de novo no dia seguinte.
- **Miniatura não aplicada:** o canal não foi verificado pelo celular (passo 2.1). O vídeo é publicado mesmo assim, e o aviso aparece no resumo.
- **`invalid_grant`:** a autorização expirou ou foi revogada. Refaça o passo 2.6 e atualize o segredo `YT_REFRESH_TOKEN`.
- **Branch `main` protegida:** se houver regra de proteção que bloqueie pushes, o commit do catálogo falha. Libere o `github-actions[bot]` ou desative a regra.

## 3. Formulário (entrada automática)

Feito uma vez só. Depois disso, a operação diária é **só preencher o formulário**: ao enviar, o vídeo é gerado e publicado sozinho em poucos minutos.

Use a **mesma conta Google** do canal e do projeto no Google Cloud.

### 3.1. Conta de serviço (para o GitHub ler o áudio no Drive)

1. No [Google Cloud](https://console.cloud.google.com), com o projeto `biblia-lida-por-elas` selecionado: menu ☰ → **APIs e serviços** → **Biblioteca** → procure **Google Drive API** → **Ativar**.
2. Menu ☰ → **IAM e administrador** → **Contas de serviço** → **Criar conta de serviço**.
3. Nome: `leitor-drive` → **Criar e continuar** → pule as permissões (**Continuar**) → **Concluir**.
4. Clique na conta criada → aba **Chaves** → **Adicionar chave** → **Criar nova chave** → **JSON** → **Criar**. Um arquivo `.json` é baixado.
5. Anote o **e-mail** da conta de serviço, que termina em `@biblia-lida-por-elas.iam.gserviceaccount.com`. Ele é usado no passo 3.6.

> ⚠️ Se aparecer "A criação de chaves está desativada" (política da organização), a conta Google faz parte de um Google Workspace que bloqueia chaves. Peça a quem administra o Workspace para liberar a política `iam.disableServiceAccountKeyCreation` neste projeto.

6. No GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Nome: `GOOGLE_SA_JSON`. Valor: abra o arquivo `.json` num editor de texto (Bloco de Notas), copie **todo** o conteúdo e cole.
7. **Apague o arquivo `.json`** do computador depois de salvar o segredo.

### 3.2. Token do GitHub (para o formulário avisar o GitHub)

1. No GitHub, clique na sua foto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Nome: `formulario-biblia`. Expiração: a maior disponível (até 1 ano).
3. **Repository access:** **Only select repositories** → escolha `bible-reading`.
4. **Permissions** → **Repository permissions** → **Contents** → **Read and write**.
5. **Generate token** e copie o token (começa com `github_pat_`). Ele só aparece uma vez.

> 📅 **Coloque um lembrete na agenda** para uma semana antes de o token vencer. Quando ele vence, o formulário para de disparar os vídeos e você recebe um e-mail avisando. Para resolver, gere outro token e troque no passo 3.4.

### 3.3. Criar o formulário

1. Acesse [forms.google.com](https://forms.google.com) → **Formulário em branco**.
2. Menu **⋮** (três pontinhos, no alto) → **Apps Script**.
3. Apague o código que aparece. Abra o [Code.gs](../apps-script/Code.gs) do repositório, clique em **Copy raw file** (ícone de copiar) e cole no editor. Clique em 💾 **Salvar**.

### 3.4. Configurar o script

1. No editor do Apps Script, clique em ⚙️ **Configurações do projeto** (à esquerda).
2. Lá embaixo, em **Propriedades do script** → **Adicionar propriedade do script**. Crie duas:

   | Propriedade | Valor |
   |---|---|
   | `GITHUB_REPO` | `feijaocosta/bible-reading` (dono/repositório) |
   | `GITHUB_TOKEN_DISPATCH` | o token do passo 3.2 |

3. **Salvar propriedades do script**.
4. Volte para o editor (ícone `< >` à esquerda). Na barra de cima, escolha a função **setupForm** → ▶ **Executar**.
5. O Google pede autorização: **Revisar permissões** → escolha sua conta → **Avançado** → **Acessar (não seguro)** → **Permitir**. É esperado, porque o script é seu.
6. Ao terminar, o formulário já tem as perguntas: nome, livro (os 66), parte da leitura, capítulo e a caixa "Ouvi e validei esta leitura".

### 3.5. Adicionar a pergunta do áudio (à mão)

O Google não deixa scripts criarem perguntas de upload, então esta é manual:

1. Abra o formulário. Clique na pergunta **Capítulo** e depois em ➕ (adicionar pergunta).
2. Tipo: **Upload de arquivo** → **Continuar**.
3. Título exatamente: `Áudio`
4. Ative **Permitir apenas tipos de arquivo específicos** → marque **Áudio**.
5. **Número máximo de arquivos:** 1. **Tamanho máximo:** 100 MB.
6. Marque **Obrigatória**.
7. Confira a ordem: o **Áudio** deve ficar antes de **Conferência**. Arraste se precisar.

### 3.6. Dar acesso aos áudios para a conta de serviço

1. Abra o [Google Drive](https://drive.google.com). Apareceu uma pasta com o nome do formulário e `(File responses)` ou `(Respostas de arquivos)`.
2. Clique com o botão direito na pasta → **Compartilhar** → cole o **e-mail da conta de serviço** (passo 3.1) → papel **Leitor** → **desmarque** "Notificar pessoas" → **Compartilhar**.

### 3.7. Ligar o envio automático

1. No editor do Apps Script, escolha a função **installTrigger** → ▶ **Executar** (autorize de novo se pedir).
2. Pronto: a partir de agora, cada resposta enviada dispara o vídeo.

### 3.8. Testar

1. Abra o formulário (botão **Visualizar** 👁) e preencha com uma leitura real.
2. Em cerca de 1 minuto, aparece uma execução na aba **Actions** do GitHub, com o nome do livro. Em 3 a 5 minutos o vídeo está no YouTube e no catálogo.
3. Envie o link do formulário (botão **Enviar** → 🔗) só para a coordenadora. Para enviar o áudio, ela precisa estar logada numa conta Google.

### Se algo der errado

- **A dona do formulário recebe um e-mail** quando uma resposta não consegue ser enviada ao GitHub (token vencido, propriedade faltando, capítulo em branco...). Corrija e rode **resendLatestResponse** no editor do Apps Script. Isso reenvia a última resposta, sem duplicar o vídeo.
- **A execução no Actions ficou vermelha:** veja a mensagem `Error:` no passo que falhou (seção 1). O erro `Share the form's upload folder` significa que faltou o passo 3.6.
- **Mesma leitura enviada duas vezes:** cada resposta tem um ID próprio, então a mesma resposta nunca gera dois vídeos. Já duas respostas diferentes geram dois vídeos. Nesse caso, apague o vídeo extra no YouTube Studio e a linha correspondente em `data/readings.json`.

## 4. App (GitHub Pages)

O app é publicado no GitHub Pages, gratuito para repositórios públicos. Feito uma vez só. Depois disso, o app se atualiza sozinho a cada leitura nova.

### 4.1. Deixar o repositório público

1. No repositório: **Settings** → **General** → role até **Danger Zone** → **Change visibility** → **Make public** → confirme.
2. Isso não expõe nenhum segredo: tokens e chaves ficam em **Secrets**, que nunca aparecem publicamente.

### 4.2. Ligar o GitHub Pages

1. **Settings** → **Pages**.
2. Em **Build and deployment** → **Source**, escolha **GitHub Actions**.

### 4.3. Primeira publicação

1. Aba **Actions** → **Publicar app** → **Run workflow** → **Run workflow**.
2. Em 1 a 2 minutos, a execução fica verde. O endereço do app aparece no resumo da execução e em **Settings → Pages**. Ele tem o formato `https://<seu-usuário>.github.io/bible-reading/`.
3. A partir daqui, cada leitura nova publicada pelo formulário também atualiza o app.

### 4.4. Instalar no celular

- **Android (Chrome):** abra o endereço → menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**).
- **iPhone (Safari):** abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**.

### 4.5. Leituras antigas sem áudio no app

Leituras publicadas antes do áudio próprio do app existir aparecem no app com o vídeo do YouTube. Para gerar o áudio delas:

1. Abra o [data/readings.json](../data/readings.json) e copie o `id` da leitura (o texto entre aspas depois de `"id":`).
2. Pegue o link do áudio original. Se ele foi enviado pelo formulário, está na pasta de respostas do formulário no Drive: clique com o botão direito no arquivo → **Compartilhar** → **Copiar link**. Não precisa abrir o compartilhamento, porque a conta de serviço já tem acesso à pasta.
3. Aba **Actions** → **Gerar áudio do app** → **Run workflow**. Cole o ID e o link → **Run workflow**.
4. Em uns 3 minutos, a leitura passa a tocar com o áudio próprio no app. O YouTube não é alterado.

### O que o app faz

- Toca o **áudio próprio** de cada leitura (MP3 servido pelo próprio site), inclusive com a tela bloqueada.
- **Baixar:** guarda a leitura no aparelho para ouvir sem internet. No iPhone, se o app ficar semanas sem uso, o sistema pode apagar os áudios baixados. Basta baixar de novo.
- Leituras publicadas antes do áudio próprio existir aparecem com o **vídeo do YouTube** no lugar do player.
- Cada leitura tem um **endereço próprio**. Ao compartilhar no WhatsApp, a prévia mostra a arte da leitura.

### Onde ficam os áudios

Os MP3 ficam guardados no **GitHub Releases** (uma release por livro). A cada publicação do app, eles são copiados para o próprio site do GitHub Pages, porque o iPhone não toca áudio direto do Releases. O site do GitHub Pages pode ter **até 1 GB**, o que dá umas **500 leituras** de 4 minutos. O resumo da execução **Publicar app** mostra quanto já foi usado e avisa quando passar de 85%. Nesse ponto, é hora de mover os áudios para outro serviço gratuito (por exemplo, o Internet Archive).

## 5. Google Analytics (opcional)

O app já envia eventos para o Google Analytics 4. Enquanto não houver um ID configurado, **nada é carregado nem enviado**.

1. Acesse [analytics.google.com](https://analytics.google.com) → **Administrador** (engrenagem) → **Criar** → **Propriedade**. Nome: `Bíblia lida por elas`. Fuso horário e moeda do Brasil.
2. Escolha **Web** como plataforma. URL: o endereço do app (seção 4 ou 6). Nome do fluxo: `App`.
3. Copie o **ID da métrica**, que começa com `G-`.
4. No GitHub: **Settings** → **Secrets and variables** → **Actions** → aba **Variables** → **New repository variable**. Nome: `GA_MEASUREMENT_ID`. Valor: o `G-...`.
5. Aba **Actions** → **Publicar app** → **Run workflow**. Pronto: em poucos minutos os acessos aparecem em **Relatórios → Tempo real**.

### Eventos enviados

| Evento | Quando | Detalhes |
|---|---|---|
| `page_view` | cada tela aberta | endereço e título |
| `audio_play` | uma leitura começa a tocar | livro, parte, leitora, online/offline |
| `audio_progress` | 25%, 50% e 75% ouvidos | livro, porcentagem |
| `audio_complete` | a leitura chegou ao fim | livro, leitora |
| `autoplay_toggle` / `autoplay_next` | "tocar em sequência" ligado/desligado / passou para a próxima | — |
| `speed_change` | velocidade alterada | velocidade |
| `download` | leitura ou livro inteiro baixado | leitura ou livro |
| `download_remove` | baixados apagados | um ou todos |
| `share` | botão compartilhar | leitura ou livro, como foi compartilhado |
| `search` | busca digitada | termo |
| `app_installed` / `app_update` | app instalado / atualizado para nova versão | — |

> ⚖️ **LGPD:** o Google Analytics usa cookies. Antes de ativar, vale incluir no app um aviso de privacidade (e, se a igreja preferir, um pedido de consentimento). Peça que preparamos.

## 6. Domínio próprio

Para o app ficar em `biblia.kingdomapps.net` em vez de `feijaocosta.github.io/bible-reading` (quem reaproveitar o projeto usa o próprio domínio no lugar):

1. No painel do seu domínio (onde o `kingdomapps.net` foi registrado ou onde está o DNS, por exemplo Cloudflare, Registro.br, GoDaddy), crie um registro **CNAME**:

   | Tipo | Nome | Valor |
   |---|---|---|
   | CNAME | `biblia` (o subdomínio escolhido) | `feijaocosta.github.io` |

   Se usar a Cloudflare, deixe a nuvem **cinza** ("Somente DNS").
2. No GitHub: **Settings** → **Pages** → **Custom domain** → digite `biblia.kingdomapps.net` → **Save**. O GitHub confere o DNS (pode levar de minutos a algumas horas).
3. Quando aparecer "DNS check successful", marque **Enforce HTTPS**.
4. Aba **Actions** → **Publicar app** → **Run workflow**. O app se ajusta sozinho ao novo endereço (links, prévias do WhatsApp, ícones).
5. Recomendado: em **Settings → Pages**, verifique o domínio (**Verify domain**, nas configurações da sua conta) para ninguém mais usá-lo no GitHub.

> 💡 Leituras baixadas e o "continue de onde parou" ficam guardados por endereço. Quem já usava o endereço antigo vai precisar baixar de novo no endereço novo. O endereço antigo passa a redirecionar para o novo.
