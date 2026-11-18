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
