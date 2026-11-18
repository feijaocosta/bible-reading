# Bíblia lida por elas — brief do projeto

> Este arquivo é o ponto de partida do projeto no Claude Code. Leia tudo antes de começar e siga as fases em ordem.

## 1. Contexto

Um grupo de mulheres da igreja grava a leitura de capítulos da Bíblia. Hoje o fluxo acontece todo no WhatsApp:

1. A leitora grava um áudio e envia para a pessoa que coordena o grupo.
2. A coordenadora ouve, confere se está tudo certo e identifica o livro e o capítulo.

**Objetivo:** transformar cada áudio validado em um vídeo padronizado no YouTube e reunir tudo num PWA bonito para ouvir as leituras. **Custo de infraestrutura: zero.**

**Quem opera é uma pessoa não técnica.** A operação diária tem que ser só preencher um formulário. Qualquer coisa além disso é falha de design.

**O repositório é público e pensado para o mundo:** código em inglês, documentação em português e inglês, para que outros grupos possam reaproveitar.

## 2. Arquitetura

```
Google Forms ──► Drive (áudio) + Planilha de respostas
     │
     ▼ (onFormSubmit)
Apps Script ──► GitHub API: repository_dispatch "new-reading"
                        │
                        ▼
              GitHub Actions
              1. baixa o áudio do Drive (service account)
              2. gera a arte 1920x1080 a partir do template HTML
              3. FFmpeg: arte + áudio ──► MP4
              4. FFmpeg: mesma mixagem ──► MP3 do app
              5. MP3 + capa ──► GitHub Releases (release "audio-<livro>")
              6. sobe no YouTube + adiciona na playlist
              7. atualiza data/readings.json (commit)
              8. (fallback) guarda MP4/MP3 como artifact
                        │
                        ▼ (chama deploy-site.yml)
              GitHub Pages ──► PWA (SvelteKit, páginas pré-geradas do catálogo)
```

Princípios:
- **Nenhum segredo no front-end.** O GitHub Pages é estático: tudo que estiver nele é público.
- Os segredos ficam em **GitHub Secrets** (Actions) e no **Script Properties** (Apps Script).
- **Idempotência:** cada leitura tem um `id` (o ID da resposta do Forms). Se esse `id` já existir em `readings.json`, a execução não faz nada.

## 3. Stack

| Parte | Tecnologia |
|---|---|
| Entrada | Google Forms + Planilha + Drive |
| Gatilho | Google Apps Script |
| Processamento | GitHub Actions (ubuntu-latest), Node.js 20 |
| Arte | Template HTML/CSS → PNG via Playwright (Chromium) |
| Vídeo | FFmpeg |
| Publicação | YouTube Data API v3 via `fetch` nativo (sem `googleapis`, para manter dependências mínimas) |
| App | PWA em SvelteKit (Svelte 5) + adapter-static no GitHub Pages; uma página pré-gerada por livro, capítulo, leitura e leitora |
| Áudio do app | MP3 64 kbps (mesma mixagem do vídeo), guardado no GitHub Releases e **servido pelo GitHub Pages** (copiado no deploy) |

## 4. Estrutura do repositório

```
/
├── CLAUDE.md
├── README.md                 # inglês
├── README.pt-BR.md           # português
├── docs/
│   ├── SETUP.md              # passo a passo manual (inglês)
│   └── SETUP.pt-BR.md        # passo a passo manual (português)
├── .github/workflows/
│   ├── new-reading.yml       # repository_dispatch + workflow_dispatch
│   ├── app-audio.yml         # gera o MP3 do app para uma leitura já publicada (sem YouTube)
│   └── deploy-site.yml       # build do PWA + deploy no Pages
├── pipeline/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # orquestra: download → arte → mp4 → youtube → catálogo
│   │   ├── drive.js
│   │   ├── artwork.js        # renderiza template → PNG
│   │   ├── video.js          # chama ffmpeg
│   │   ├── youtube.js
│   │   └── catalog.js        # lê/escreve data/readings.json
│   └── template/
│       ├── artwork.html      # layout com placeholders
│       └── assets/           # fontes, fundo, logo
├── apps-script/
│   └── Code.gs               # onFormSubmit → dispatch
├── brand/                    # avatar do canal etc. (mesmo código/paleta da arte; node brand/render.js)
├── data/
│   ├── books.json            # 66 livros (NVI): nome, abreviação, testamento, ordem, nº de capítulos
│   └── readings.json         # catálogo gerado pelo pipeline
└── site/                     # PWA (código-fonte; o build vai para o Pages)
```

> O PWA lê `data/readings.json`. O workflow de deploy junta o build do `site/` com `data/` e publica no Pages.

## 5. Modelo de dados

### Campos do formulário (rótulos em português, para a coordenadora)
| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome de quem leu | texto curto | sim |
| Livro | lista suspensa (66 livros, NVI) | sim |
| Parte da leitura | lista: Introdução / Capítulo / Encerramento | sim |
| Capítulo | número (só quando a parte é "Capítulo") | condicional |
| Áudio | upload de arquivo (.ogg/.opus/.mp3/.m4a) | sim |
| Conferência: "Ouvi e validei esta leitura" | caixa de seleção | sim |

> **Sem pergunta de testamento:** o livro já define o testamento (evita erro de preenchimento). As perguntas são criadas por `setupForm()` em `apps-script/Code.gs`, que lê `data/books.json` do repositório; só o upload "Áudio" é criado à mão (o Google não permite criar upload por script). Cada envio publica direto, sem etapa de revisão.

> O upload de arquivo no Forms exige que quem responde esteja logado no Google. Tudo bem, porque quem preenche é só a coordenadora.

### Partes de uma leitura
Além dos capítulos, cada livro pode ter, **opcionalmente**, uma **introdução** e um **encerramento**. O campo `part` vale `intro`, `chapter` ou `closing`; `chapter` só tem número quando `part` é `chapter` (senão é `null`). Na arte aparece "capítulo 3", "introdução" ou "encerramento". No PWA a introdução vem antes do capítulo 1 e o encerramento depois do último capítulo.

### `data/books.json`
Nomes dos livros conforme a **NVI** (Nova Versão Internacional). Cada item tem também o nome em inglês, para uso futuro em outros idiomas.

```json
{ "order": 1, "slug": "genesis", "name": "Gênesis", "nameEn": "Genesis", "abbrev": "Gn", "testament": "OT", "chapters": 50 }
```

### `data/readings.json`
```json
[
  {
    "id": "FORMS_RESPONSE_ID",
    "testament": "OT",
    "book": "Gênesis",
    "bookSlug": "genesis",
    "bookOrder": 1,
    "part": "chapter",
    "chapter": 1,
    "narrator": "Maria Silva",
    "youtubeId": "abc123",
    "audioUrl": "https://github.com/<dono>/<repo>/releases/download/audio-genesis/genesis-1-maria-silva-3f9a1c.mp3",
    "coverUrl": "https://github.com/<dono>/<repo>/releases/download/audio-genesis/genesis-1-maria-silva-3f9a1c.jpg",
    "durationSec": 312,
    "publishedAt": "2026-11-17T22:00:00Z"
  }
]
```

### Payload do `repository_dispatch`
```json
{
  "event_type": "new-reading",
  "client_payload": {
    "id": "...",
    "book": "Gênesis",
    "part": "chapter",
    "chapter": 1,
    "narrator": "Maria Silva",
    "driveFileId": "..."
  }
}
```

## 6. Peças-chave

### Identidade visual
- Nome do projeto: **"Bíblia lida por elas"**. Não usa a identidade da igreja.
- Identidade aprovada na F1 (base para o PWA):
  - **Logo:** "Bíblia" em Mr Dafoe (caligrafia de pincel) + "lida por elas" em Josefin Sans Bold, espaçada.
  - **Fundo:** painel em aquarela (rosé, pêssego, azul acinzentado, verde-sálvia) ao lado de papel antigo amarelado e pautado, com manchas.
  - **Flores em aquarela** (rosé, pêssego, azul, botões ocre e framboesa) e renda discreta.
  - **Tipografia:** livro em Pinyon Script (rosé `#A9464E`), capítulo e narradora em Fraunces Italic, rótulos em Jost com espaçamento largo. Texto em `#43302C`.
  - Referência: `pipeline/template/artwork.html`. Kit de aquarela compartilhado: `pipeline/template/assets/watercolor.js`.
  - **Avatar do YouTube aprovado:** versão aquarela com o logo em branco (`brand/avatar.png`).

### Arte (template)
- 1920x1080. Mostra: **livro + capítulo** (destaque), **testamento**, **"Leitura: {narradora}"** e a marca "Bíblia lida por elas".
- Visual bonito e sóbrio, legível no celular. Fontes de licença livre embutidas nos assets, sem depender de CDN.
- O mesmo PNG serve de thumbnail (redimensionado para 1280x720).

### FFmpeg
- Imagem fixa (1 fps, `libx264 -tune stillimage`) + áudio AAC 160k. Implementação em `pipeline/src/video.js`.
- **Mixagem aprovada (F1):**
  - voz com `highpass` e um reverb curto e sutil ("sala"), para não soar seca;
  - **trilha de fundo** `pipeline/template/assets/audio/pad.flac`: pad ambiente de 32 s em loop, composto por código (`pipeline/scripts/generate-pad.js`), sem direitos de terceiros;
  - a trilha entra 2,5 s antes da voz, sai em fade de 4 s depois dela e abaixa sozinha quando a voz fala (sidechain);
  - `loudnorm=I=-16:TP=-1.5:LRA=11` no final nivela o volume dos áudios de WhatsApp, que chegam com níveis bem diferentes.
- Valide a duração com `ffprobe` e falhe se o áudio tiver menos de 10 segundos.

### YouTube
- Título (em português): `{Livro} {Capítulo} — Leitura por {Narradora}`; para introdução/encerramento: `{Livro} — Introdução — Leitura por {Narradora}`
- Descrição: texto padrão + referência + nome da leitora.
- Categoria: Educação (27). Idioma: pt-BR. Miniatura = arte em 1280x720.
- Privacidade configurável por variável (`YT_PRIVACY`, padrão `unlisted`).
- Playlist por testamento: `YT_PLAYLIST_OT` e `YT_PLAYLIST_NT`.
- **Se o upload falhar, o workflow não perde o trabalho:** o MP4 fica como artifact do Actions e o erro aparece claro no log.
- **Depois que o vídeo subiu**, falhas de miniatura/playlist viram aviso e o catálogo é sempre atualizado, para nunca subir o mesmo vídeo duas vezes.
- Implementação: `pipeline/src/youtube.js` (cliente), `pipeline/src/publish.js` (upload → miniatura → playlist → catálogo), `pipeline/src/catalog.js`.

### PWA (decidido na F5)
- **SvelteKit + adapter-static**, todas as páginas pré-geradas a partir do catálogo no build (`site/`). Telas aprovadas: Início, Livro, Ouvindo, Leitora, com mini player persistente.
- **URLs únicas:** `/` · `/<livro>/` · `/<livro>/<capítulo|introducao|encerramento>/` (leitura mais recente) · `/<livro>/<parte>/<leitora>/` (leitura específica; é o link do botão Compartilhar) · `/leitora/<leitora>/`. Cada página tem Open Graph (prévia com a arte no WhatsApp).
- **Áudio próprio, não o YouTube:** o app toca o MP3 servido pelo próprio Pages (`/audio/<tag>/<arquivo>`, copiado do Releases por `site/scripts/fetch-media.js` no deploy) (toca com a tela bloqueada, Media Session na tela de bloqueio). Leituras antigas sem `audioUrl` mostram o embed `youtube-nocookie.com`. O botão "Ver no YouTube" leva ao vídeo.
- **Recursos:** busca por livro e leitora; recentes; continuar de onde parou (localStorage); capítulos sem áudio aparecem apagados; anterior/próximo; compartilhar (Web Share ou copiar link); **baixar para ouvir offline** (MP3 no Cache Storage, tocado por blob URL); velocidade 0,75–1,5x; indicador de carregando e recuperação automática de falhas de rede.
- **Cache:** o service worker guarda só o shell e as páginas visitadas (network-first) e **nunca intercepta áudio** (o Safari recusa mídia devolvida por service worker após redirect). O MP3 só é guardado quando a pessoa toca em "Baixar". Vídeos nunca.
- Instalável (manifest + ícones a partir de `brand/avatar.png`). Mobile first, acessível. Textos em `site/src/lib/strings.js`.
- Recursos visuais do app (aquarelas, fontes) gerados de `pipeline/template/assets` por `site/scripts/prepare-assets.js`.
- Deploy: `.github/workflows/deploy-site.yml` (push em `site/` ou `data/`, manual, e chamado pelo `new-reading.yml` após cada publicação, porque commits do bot não disparam workflows).
- **Por que não tocar direto do Releases:** o GitHub entrega os assets como `application/octet-stream` + `attachment` e sem CORS; o Safari (todo navegador no iPhone) não toca e o download offline não funciona. Servido pelo Pages: `audio/mpeg`, Range e mesma origem.
- **Limite:** site do Pages até 1 GB (~500 leituras de 4 min a 64 kbps). O deploy mostra o uso e avisa acima de 85%; aí mover os áudios para outro host (ex.: Internet Archive) — perguntar antes de criar a conta.

## 7. Secrets e variáveis

| Nome | Onde | Uso |
|---|---|---|
| `GOOGLE_SA_JSON` | GitHub Secrets | service account com leitura na pasta do Drive dos uploads |
| `YT_CLIENT_ID` / `YT_CLIENT_SECRET` | GitHub Secrets | app OAuth do YouTube |
| `YT_REFRESH_TOKEN` | GitHub Secrets | token do canal |
| `YT_PLAYLIST_OT` / `YT_PLAYLIST_NT` | GitHub Variables | IDs das playlists |
| `YT_PRIVACY` | GitHub Variables | `public` / `unlisted` / `private` |
| `GITHUB_TOKEN_DISPATCH` | Apps Script Properties | PAT fine-grained, só neste repo (Contents: read/write) |

**Nunca commitar segredos.** Inclua `.env` no `.gitignore` e um `.env.example` para testes locais.

## 8. Limitações conhecidas (documentar no SETUP)

- **App OAuth em modo "Teste"** faz o refresh token expirar em cerca de 7 dias. Coloque o app em **produção**.
- **Projetos de API não auditados** podem ter os envios travados como privados. Peça a auditoria do YouTube API Services (é gratuita). No primeiro teste real (18/nov/2026), o vídeo saiu público mesmo sem auditoria; a trava pode vir depois, então a auditoria segue recomendada.
- **Cota:** em nov/2026 as fontes divergiam (upload a ~1.600 de 10.000 unidades/dia, ~6/dia, ou cota própria de ~100 uploads/dia desde dez/2025); não foi possível checar a página oficial. O SETUP manda conferir em Cloud Console → Cotas. Com `quotaExceeded`, a execução falha com mensagem clara e o MP4 fica no artifact.
- Use `concurrency` no workflow para que duas leituras simultâneas não briguem no commit do `readings.json`.

> Confira esses números na documentação oficial na hora de implementar, porque podem ter mudado.

## 9. Fases (entregas curtas)

Cada fase termina com algo testável. **Não avance sem a anterior funcionando.**

- [x] **F0 — Base:** estrutura de pastas, `books.json` completo (66 livros, nomes NVI, nº de capítulos), READMEs (en + pt-BR) e `.gitignore`.
- [x] **F1 — Pipeline local + identidade:** propostas de identidade visual; `node pipeline/src/index.js --audio x.ogg --book "Gênesis" --chapter 1 --narrator "Maria" --testament OT` gera `artwork.png` e `output.mp4` localmente, sem Drive nem YouTube.
- [x] **F2 — Actions manual:** workflow com `workflow_dispatch` (inputs manuais + URL ou caminho do áudio de teste) gera o MP4 e publica como artifact.
- [x] **F3 — YouTube + catálogo:** upload, playlist, atualização do `readings.json` com commit pelo bot. Idempotente.
- [x] **F4 — Entrada pelo Forms:** download do Drive via service account + `apps-script/Code.gs` disparando o `repository_dispatch`.
- [x] **F5 — PWA:** escolha do framework, navegação, player, instalação, deploy no Pages.
- [ ] **F6 — Retorno para a coordenadora:** o workflow escreve status (`processando` / `publicado` / `erro`) e o link do vídeo de volta na planilha de respostas.

## 10. Como trabalhar neste repo

- Comece pela **F0 e F1**. Mostre a arte gerada antes de seguir.
- **Código, comentários, nomes de arquivos, variáveis e mensagens de commit em inglês.**
- **Textos para o usuário final** (formulário, arte, títulos do YouTube, interface do PWA, status na planilha) em português.
- **Documentação em dois idiomas:** inglês no arquivo principal (`README.md`, `docs/SETUP.md`) e português na versão `.pt-BR.md`. As duas versões andam juntas.
- Dependências mínimas no pipeline. No PWA, framework é permitido quando melhorar o resultado visual.
- Toda etapa manual (Google Cloud, OAuth, Pages, secrets) vai para o SETUP em passo a passo numerado, pensado para alguém que nunca fez isso.
- Pergunte antes de criar recursos externos ou de mudar a arquitetura descrita aqui.
