# Bíblia lida por elas

*Leia em português: [README.pt-BR.md](README.pt-BR.md)*

A zero-cost pipeline that turns Bible chapter readings, recorded as audio by a group of women from a church, into standardized YouTube videos, plus an installable web app (PWA) to listen to them.

## Why

The readings are recorded on WhatsApp and sent to a coordinator, who listens to each one and checks it. This project automates everything after that check. **The only thing the coordinator ever has to do is fill out a form.**

## How it works

```
Google Forms ──► Drive (audio) + responses spreadsheet
     │
     ▼ (onFormSubmit)
Apps Script ──► GitHub API: repository_dispatch "new-reading"
                        │
                        ▼
              GitHub Actions
              1. download the audio from Drive
              2. render the 1920x1080 artwork from an HTML template
              3. FFmpeg: artwork + audio ──► MP4
              4. upload to YouTube + add to playlist
              5. update data/readings.json (commit)
              6. (fallback) keep the MP4 as a workflow artifact
                        │
                        ▼
              GitHub Pages ──► PWA reads data/readings.json
```

- **Free:** Google Forms, Drive, Apps Script, GitHub Actions, GitHub Pages and the YouTube Data API.
- **No secrets in the front-end:** credentials live in GitHub Secrets and Apps Script properties.
- **Idempotent:** each reading is keyed by its Forms response ID and is never processed twice.

## Repository layout

| Path | Contents |
|---|---|
| `pipeline/` | Node.js pipeline: artwork, video, YouTube upload, catalog |
| `apps-script/` | Google Apps Script that triggers the pipeline on form submit |
| `data/books.json` | The 66 books (Protestant canon), Portuguese names from the NVI, chapter counts |
| `data/readings.json` | Catalog of published readings (written by the pipeline) |
| `site/` | The PWA |
| `docs/` | Manual setup guides (Google Cloud, OAuth, secrets, Pages) |

## Status

Work in progress, built in phases:

- [x] F0 — Base structure and book data
- [ ] F1 — Local pipeline (artwork + MP4) and visual identity
- [ ] F2 — Manual GitHub Actions run
- [ ] F3 — YouTube upload + catalog
- [ ] F4 — Google Forms input
- [ ] F5 — PWA
- [ ] F6 — Status feedback in the spreadsheet

## Reusing this project

The code is in English and the user-facing texts are in Portuguese. Book names in `data/books.json` include English names (`nameEn`) to make other languages easier.
