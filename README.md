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
- [x] F1 — Local pipeline (artwork + MP4) and visual identity
- [x] F2 — Manual GitHub Actions run
- [ ] F3 — YouTube upload + catalog
- [ ] F4 — Google Forms input
- [ ] F5 — PWA
- [ ] F6 — Status feedback in the spreadsheet

## Generating a video on GitHub Actions

See [docs/SETUP.md](docs/SETUP.md). Section 1: run the **Nova leitura** workflow from the Actions tab and download the MP4 from the run page. Section 2: one-time YouTube setup, after which the same workflow can upload the video, add it to the playlist and update `data/readings.json`.

## Running the pipeline locally

Requirements: Node.js 20+ and FFmpeg (which includes `ffprobe`).

```bash
cd pipeline
npm install
npx playwright install chromium   # headless browser used to render the artwork
cd ..
node pipeline/src/index.js --audio reading.ogg   # or a link (Drive, Dropbox, direct) --book "Gênesis" --chapter 1 --narrator "Maria" --testament OT
```

The output goes to `out/<book>-<chapter>/`:

- `artwork.png`: the 1920x1080 artwork
- `thumbnail.jpg`: the 1280x720 YouTube thumbnail
- `output.mp4`: the video. The voice gets a subtle room reverb and a soft background pad (composed in code, see `pipeline/template/assets/audio/`) that ducks under the voice, and the volume is normalized

`--chapter` also accepts `introdução` (book introduction) or `encerramento` (book closing); both are optional for each book.

Book names follow `data/books.json` (NVI) and are case- and accent-insensitive. The run fails with a clear message if the book or chapter does not exist, the testament does not match the book, or the audio is shorter than 10 seconds.

To tweak the design, open `pipeline/template/artwork.html` in a browser: it shows a sample reading. Fonts are bundled in `pipeline/template/assets/fonts` (SIL Open Font License).

Run the tests with `npm test` inside `pipeline/`.

## Reusing this project

The code is in English and the user-facing texts are in Portuguese. Book names in `data/books.json` include English names (`nameEn`) to make other languages easier.

## License

Code: [MIT](LICENSE). Audio recordings and videos are not part of this repository and are not covered by this license.
