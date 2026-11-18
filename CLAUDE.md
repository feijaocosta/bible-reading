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
              4. sobe no YouTube + adiciona na playlist
              5. atualiza data/readings.json (commit)
              6. (fallback) guarda o MP4 como artifact
                        │
                        ▼
              GitHub Pages ──► PWA lê data/readings.json
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
| Publicação | YouTube Data API v3 (`googleapis`) |
| App | PWA no GitHub Pages. Framework permitido (decidir na F5); build feito no workflow de deploy |

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
| Nome de quem narrou | texto curto | sim |
| Testamento | Antigo / Novo | sim |
| Livro | lista suspensa (66 livros, NVI) | sim |
| Capítulo | número | sim |
| Áudio | upload de arquivo (.ogg/.opus/.mp3/.m4a) | sim |
| "Ouvi e validei esta leitura" | caixa de seleção | sim |

> O upload de arquivo no Forms exige que quem responde esteja logado no Google. Tudo bem, porque quem preenche é só a coordenadora.

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
    "chapter": 1,
    "narrator": "Maria Silva",
    "youtubeId": "abc123",
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
    "testament": "OT",
    "book": "Gênesis",
    "chapter": 1,
    "narrator": "Maria Silva",
    "driveFileId": "..."
  }
}
```

## 6. Peças-chave

### Identidade visual
- Nome do projeto: **"Bíblia lida por elas"**. Não usa a identidade da igreja.
- Identidade própria a ser elaborada (logo/wordmark, paleta, tipografia), usada na arte dos vídeos e no PWA.
- Propor opções antes de fechar; a arte da F1 é o primeiro teste da identidade.

### Arte (template)
- 1920x1080. Mostra: **livro + capítulo** (destaque), **testamento**, **"Leitura: {narradora}"** e a marca "Bíblia lida por elas".
- Visual bonito e sóbrio, legível no celular. Fontes de licença livre embutidas nos assets, sem depender de CDN.
- O mesmo PNG serve de thumbnail (redimensionado para 1280x720).

### FFmpeg
```bash
ffmpeg -y -loop 1 -framerate 1 -i artwork.png -i audio.ogg \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 1 \
  -c:a aac -b:a 128k -shortest output.mp4
```
- O `loudnorm` nivela o volume dos áudios de WhatsApp, que chegam com níveis bem diferentes.
- Valide a duração com `ffprobe` e falhe se o áudio tiver menos de 10 segundos.

### YouTube
- Título (em português): `{Livro} {Capítulo} — Leitura por {Narradora}`
- Descrição: texto padrão + referência + nome da leitora.
- Privacidade configurável por variável (`YT_PRIVACY`, padrão `unlisted`).
- Playlist por testamento: `YT_PLAYLIST_OT` e `YT_PLAYLIST_NT`.
- **Se o upload falhar, o workflow não perde o trabalho:** o MP4 fica como artifact do Actions e o erro aparece claro no log.

### PWA
- Resultado visual caprichado: pode usar framework se isso ajudar.
- Navegação: Testamento → Livro → Capítulos disponíveis → player (embed `youtube-nocookie.com`).
- Busca simples por livro e por narradora.
- Instalável (manifest + service worker). Cache só do shell e do JSON, nunca dos vídeos.
- Mobile first, acessível. Interface em português, com textos centralizados para permitir outros idiomas.

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
- **Projetos de API não auditados** podem ter os envios travados como privados. Peça a auditoria do YouTube API Services (é gratuita).
- **Cota padrão** de 10.000 unidades/dia. Cada upload custa cerca de 1.600, o que dá umas 6 por dia. Se chegarem mais, elas ficam na fila e saem no dia seguinte.
- Use `concurrency` no workflow para que duas leituras simultâneas não briguem no commit do `readings.json`.

> Confira esses números na documentação oficial na hora de implementar, porque podem ter mudado.

## 9. Fases (entregas curtas)

Cada fase termina com algo testável. **Não avance sem a anterior funcionando.**

- [x] **F0 — Base:** estrutura de pastas, `books.json` completo (66 livros, nomes NVI, nº de capítulos), READMEs (en + pt-BR) e `.gitignore`.
- [ ] **F1 — Pipeline local + identidade:** propostas de identidade visual; `node pipeline/src/index.js --audio x.ogg --book "Gênesis" --chapter 1 --narrator "Maria" --testament OT` gera `artwork.png` e `output.mp4` localmente, sem Drive nem YouTube.
- [ ] **F2 — Actions manual:** workflow com `workflow_dispatch` (inputs manuais + URL ou caminho do áudio de teste) gera o MP4 e publica como artifact.
- [ ] **F3 — YouTube + catálogo:** upload, playlist, atualização do `readings.json` com commit pelo bot. Idempotente.
- [ ] **F4 — Entrada pelo Forms:** download do Drive via service account + `apps-script/Code.gs` disparando o `repository_dispatch`.
- [ ] **F5 — PWA:** escolha do framework, navegação, player, instalação, deploy no Pages.
- [ ] **F6 — Retorno para a coordenadora:** o workflow escreve status (`processando` / `publicado` / `erro`) e o link do vídeo de volta na planilha de respostas.

## 10. Como trabalhar neste repo

- Comece pela **F0 e F1**. Mostre a arte gerada antes de seguir.
- **Código, comentários, nomes de arquivos, variáveis e mensagens de commit em inglês.**
- **Textos para o usuário final** (formulário, arte, títulos do YouTube, interface do PWA, status na planilha) em português.
- **Documentação em dois idiomas:** inglês no arquivo principal (`README.md`, `docs/SETUP.md`) e português na versão `.pt-BR.md`. As duas versões andam juntas.
- Dependências mínimas no pipeline. No PWA, framework é permitido quando melhorar o resultado visual.
- Toda etapa manual (Google Cloud, OAuth, Pages, secrets) vai para o SETUP em passo a passo numerado, pensado para alguém que nunca fez isso.
- Pergunte antes de criar recursos externos ou de mudar a arquitetura descrita aqui.
