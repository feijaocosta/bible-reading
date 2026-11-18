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
