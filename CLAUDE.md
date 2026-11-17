# Leituras Bíblicas em Áudio — brief do projeto

> Este arquivo é o ponto de partida do projeto no Claude Code. Leia tudo antes de começar e siga as fases em ordem.

## 1. Contexto

Um grupo de mulheres da igreja grava a leitura de capítulos da Bíblia. Hoje o fluxo acontece todo no WhatsApp:

1. A leitora grava um áudio e envia para a pessoa que coordena o grupo.
2. A coordenadora ouve, confere se está tudo certo e identifica o livro e o capítulo.

**Objetivo:** transformar cada áudio validado em um vídeo padronizado no YouTube e reunir tudo num PWA simples para ouvir as leituras. **Custo de infraestrutura: zero.**

**Quem opera é uma pessoa não técnica.** A operação diária tem que ser só preencher um formulário. Qualquer coisa além disso é falha de design.

## 2. Arquitetura

```
Google Forms ──► Drive (áudio) + Planilha de respostas
     │
     ▼ (onFormSubmit)
Apps Script ──► GitHub API: repository_dispatch "nova-leitura"
                        │
                        ▼
              GitHub Actions
              1. baixa o áudio do Drive (service account)
              2. gera a arte 1920x1080 a partir do template HTML
              3. FFmpeg: arte + áudio ──► MP4
              4. sobe no YouTube + adiciona na playlist
              5. atualiza data/leituras.json (commit)
              6. (fallback) guarda o MP4 como artifact
                        │
                        ▼
              GitHub Pages ──► PWA lê data/leituras.json
```

Princípios:
- **Nenhum segredo no front-end.** O GitHub Pages é estático: tudo que estiver nele é público.
- Os segredos ficam em **GitHub Secrets** (Actions) e no **Script Properties** (Apps Script).
- **Idempotência:** cada leitura tem um `id` (o ID da resposta do Forms). Se esse `id` já existir em `leituras.json`, a execução não faz nada.

## 3. Stack

| Parte | Tecnologia |
|---|---|
| Entrada | Google Forms + Planilha + Drive |
| Gatilho | Google Apps Script |
| Processamento | GitHub Actions (ubuntu-latest), Node.js 20 |
| Arte | Template HTML/CSS → PNG via Playwright (Chromium) |
| Vídeo | FFmpeg |
| Publicação | YouTube Data API v3 (`googleapis`) |
| App | PWA em HTML/CSS/JS puro, sem build, no GitHub Pages |

## 4. Estrutura do repositório

```
/
├── CLAUDE.md
├── README.md
├── docs/
│   └── SETUP.md              # passo a passo manual (Google Cloud, OAuth, secrets)
├── .github/workflows/
│   └── nova-leitura.yml      # repository_dispatch + workflow_dispatch
├── pipeline/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # orquestra: baixar → arte → mp4 → youtube → json
│   │   ├── drive.js
│   │   ├── arte.js           # renderiza template → PNG
│   │   ├── video.js          # chama ffmpeg
│   │   ├── youtube.js
│   │   └── catalogo.js       # lê/escreve data/leituras.json
│   └── template/
│       ├── arte.html         # layout com placeholders
│       └── assets/           # fontes, fundo, logo
├── apps-script/
│   └── Code.gs               # onFormSubmit → dispatch
├── data/
│   ├── livros.json           # 66 livros: nome, abreviação, testamento, ordem, nº de capítulos
│   └── leituras.json         # catálogo gerado pelo pipeline
└── site/                     # PWA (publicado pelo Pages)
    ├── index.html
    ├── app.js
    ├── style.css
    ├── manifest.webmanifest
    └── sw.js
```

> O PWA lê `data/leituras.json`. Configure o Pages (ou um passo de deploy no workflow) para que `site/` e `data/` sejam servidos juntos.

## 5. Modelo de dados

### Campos do formulário
| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome de quem narrou | texto curto | sim |
| Testamento | Antigo / Novo | sim |
| Livro | lista suspensa (66 livros) | sim |
| Capítulo | número | sim |
| Áudio | upload de arquivo (.ogg/.opus/.mp3/.m4a) | sim |
| "Ouvi e validei esta leitura" | caixa de seleção | sim |

> O upload de arquivo no Forms exige que quem responde esteja logado no Google. Tudo bem, porque quem preenche é só a coordenadora.

### `data/leituras.json`
```json
[
  {
    "id": "RESPONSE_ID_DO_FORMS",
    "testamento": "AT",
    "livro": "Gênesis",
    "livroSlug": "genesis",
    "ordemLivro": 1,
    "capitulo": 1,
    "narrador": "Maria Silva",
    "youtubeId": "abc123",
    "duracaoSeg": 312,
    "publicadoEm": "2026-11-17T22:00:00Z"
  }
]
```

### Payload do `repository_dispatch`
```json
{
  "event_type": "nova-leitura",
  "client_payload": {
    "id": "...",
    "testamento": "AT",
    "livro": "Gênesis",
    "capitulo": 1,
    "narrador": "Maria Silva",
    "driveFileId": "..."
  }
}
```

## 6. Peças-chave

### Arte (template)
- 1920x1080. Mostra: **livro + capítulo** (destaque), **testamento** e **"Leitura: {narrador}"**.
- Visual bonito e sóbrio, legível no celular. Fontes embutidas nos assets, sem depender de CDN.
- O mesmo PNG serve de thumbnail (redimensionado para 1280x720).

### FFmpeg
```bash
ffmpeg -y -loop 1 -framerate 1 -i arte.png -i audio.ogg \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 1 \
  -c:a aac -b:a 128k -shortest saida.mp4
```
- O `loudnorm` nivela o volume dos áudios de WhatsApp, que chegam com níveis bem diferentes.
- Valide a duração com `ffprobe` e falhe se o áudio tiver menos de 10 segundos.

### YouTube
- Título: `{Livro} {Capítulo} — Leitura por {Narrador}`
- Descrição: texto padrão + referência + nome da leitora.
- Privacidade configurável por variável (`YT_PRIVACY`, padrão `unlisted`).
- Playlist por testamento: `YT_PLAYLIST_AT` e `YT_PLAYLIST_NT`.
- **Se o upload falhar, o workflow não perde o trabalho:** o MP4 fica como artifact do Actions e o erro aparece claro no log.

### PWA
- Navegação: Testamento → Livro → Capítulos disponíveis → player (embed `youtube-nocookie.com`).
- Busca simples por livro e por narradora.
- Instalável (manifest + service worker). Cache só do shell e do JSON, nunca dos vídeos.
- Mobile first, acessível, em português.

## 7. Secrets e variáveis

| Nome | Onde | Uso |
|---|---|---|
| `GOOGLE_SA_JSON` | GitHub Secrets | service account com leitura na pasta do Drive dos uploads |
| `YT_CLIENT_ID` / `YT_CLIENT_SECRET` | GitHub Secrets | app OAuth do YouTube |
| `YT_REFRESH_TOKEN` | GitHub Secrets | token do canal |
| `YT_PLAYLIST_AT` / `YT_PLAYLIST_NT` | GitHub Variables | IDs das playlists |
| `YT_PRIVACY` | GitHub Variables | `public` / `unlisted` / `private` |
| `GITHUB_TOKEN_DISPATCH` | Apps Script Properties | PAT fine-grained, só neste repo (Contents: read/write) |

**Nunca commitar segredos.** Inclua `.env` no `.gitignore` e um `.env.example` para testes locais.

## 8. Limitações conhecidas (documentar no SETUP.md)

- **App OAuth em modo "Teste"** faz o refresh token expirar em cerca de 7 dias. Coloque o app em **produção**.
- **Projetos de API não auditados** podem ter os envios travados como privados. Peça a auditoria do YouTube API Services (é gratuita).
- **Cota padrão** de 10.000 unidades/dia. Cada upload custa cerca de 1.600, o que dá umas 6 por dia. Se chegarem mais, elas ficam na fila e saem no dia seguinte.
- Use `concurrency` no workflow para que duas leituras simultâneas não briguem no commit do `leituras.json`.

> Confira esses números na documentação oficial na hora de implementar, porque podem ter mudado.

## 9. Fases (entregas curtas)

Cada fase termina com algo testável. **Não avance sem a anterior funcionando.**

- [ ] **F0 — Base:** estrutura de pastas, `livros.json` completo (66 livros, nomes em português, nº de capítulos), README e `.gitignore`.
- [ ] **F1 — Pipeline local:** `node pipeline/src/index.js --audio x.ogg --livro "Gênesis" --capitulo 1 --narrador "Maria" --testamento AT` gera `arte.png` e `saida.mp4` localmente, sem Drive nem YouTube.
- [ ] **F2 — Actions manual:** workflow com `workflow_dispatch` (inputs manuais + URL ou caminho do áudio de teste) gera o MP4 e publica como artifact.
- [ ] **F3 — YouTube + catálogo:** upload, playlist, atualização do `leituras.json` com commit pelo bot. Idempotente.
- [ ] **F4 — Entrada pelo Forms:** download do Drive via service account + `apps-script/Code.gs` disparando o `repository_dispatch`.
- [ ] **F5 — PWA:** navegação, player, instalação, deploy no Pages.
- [ ] **F6 — Retorno para a coordenadora:** o workflow escreve status (`processando` / `publicado` / `erro`) e o link do vídeo de volta na planilha de respostas.

## 10. Como trabalhar neste repo

- Comece pela **F0 e F1**. Mostre a arte gerada antes de seguir.
- Código e comentários em português. Nomes de variáveis podem ficar em inglês ou português, desde que haja consistência.
- Dependências mínimas. Nada de framework no PWA.
- Toda etapa manual (Google Cloud, OAuth, Pages, secrets) vai para `docs/SETUP.md` em passo a passo numerado, pensado para alguém que nunca fez isso.
- Pergunte antes de criar recursos externos ou de mudar a arquitetura descrita aqui.
