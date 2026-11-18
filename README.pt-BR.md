# Bíblia lida por elas

*Read in English: [README.md](README.md)*

Um fluxo de custo zero que transforma leituras de capítulos da Bíblia, gravadas em áudio por um grupo de mulheres da igreja, em vídeos padronizados no YouTube. Inclui também um app instalável (PWA) para ouvir as leituras.

## Por quê

As leituras são gravadas no WhatsApp e enviadas para uma coordenadora, que ouve e confere cada uma. Este projeto automatiza tudo o que vem depois dessa conferência. **A única coisa que a coordenadora precisa fazer é preencher um formulário.**

## Como funciona

```
Google Forms ──► Drive (áudio) + planilha de respostas
     │
     ▼ (onFormSubmit)
Apps Script ──► GitHub API: repository_dispatch "new-reading"
                        │
                        ▼
              GitHub Actions
              1. baixa o áudio do Drive
              2. gera a arte 1920x1080 a partir de um template HTML
              3. FFmpeg: arte + áudio ──► MP4
              4. sobe no YouTube + adiciona na playlist
              5. atualiza data/readings.json (commit)
              6. (alternativa) guarda o MP4 como artifact do workflow
                        │
                        ▼
              GitHub Pages ──► o PWA lê data/readings.json
```

- **Gratuito:** Google Forms, Drive, Apps Script, GitHub Actions, GitHub Pages e a API de dados do YouTube.
- **Nenhum segredo no front-end:** as credenciais ficam no GitHub Secrets e nas propriedades do Apps Script.
- **Idempotente:** cada leitura é identificada pelo ID da resposta do Forms e nunca é processada duas vezes.

## Estrutura do repositório

| Caminho | Conteúdo |
|---|---|
| `pipeline/` | Pipeline em Node.js: arte, vídeo, upload no YouTube, catálogo |
| `apps-script/` | Google Apps Script que dispara o pipeline quando o formulário é enviado |
| `data/books.json` | Os 66 livros (cânon protestante), nomes conforme a NVI, número de capítulos |
| `data/readings.json` | Catálogo das leituras publicadas (escrito pelo pipeline) |
| `site/` | O PWA |
| `docs/` | Guias de configuração manual (Google Cloud, OAuth, secrets, Pages) |

## Andamento

Em construção, por fases:

- [x] F0 — Estrutura base e dados dos livros
- [x] F1 — Pipeline local (arte + MP4) e identidade visual
- [ ] F2 — Execução manual no GitHub Actions
- [ ] F3 — Upload no YouTube + catálogo
- [ ] F4 — Entrada pelo Google Forms
- [ ] F5 — PWA
- [ ] F6 — Retorno do status na planilha

## Rodando o pipeline localmente

Requisitos: Node.js 20+ e FFmpeg (que já inclui o `ffprobe`).

```bash
cd pipeline
npm install
npx playwright install chromium   # navegador invisível usado para gerar a arte
cd ..
node pipeline/src/index.js --audio leitura.ogg --book "Gênesis" --chapter 1 --narrator "Maria" --testament OT
```

O resultado vai para `out/<livro>-<capítulo>/`:

- `artwork.png`: a arte em 1920x1080
- `thumbnail.jpg`: a miniatura do YouTube em 1280x720
- `output.mp4`: o vídeo. A voz ganha um reverb sutil de sala e uma trilha de fundo suave (composta por código, veja `pipeline/template/assets/audio/`) que abaixa sozinha quando ela fala, e o volume é nivelado

O `--chapter` também aceita `introdução` ou `encerramento`, que são opcionais em cada livro.

Os nomes dos livros seguem o `data/books.json` (NVI) e não diferenciam maiúsculas nem acentos. A execução para com uma mensagem clara se o livro ou o capítulo não existir, se o testamento não bater com o livro ou se o áudio tiver menos de 10 segundos.

Para ajustar o visual, abra `pipeline/template/artwork.html` no navegador: ele mostra uma leitura de exemplo. As fontes ficam em `pipeline/template/assets/fonts` (SIL Open Font License).

Os testes rodam com `npm test` dentro de `pipeline/`.

## Reaproveitando o projeto

O código está em inglês e os textos para o usuário final estão em português. O `data/books.json` traz também os nomes em inglês (`nameEn`) para facilitar outros idiomas.

## Licença

Código: [MIT](LICENSE). As gravações de áudio e os vídeos não fazem parte deste repositório e não estão cobertos por esta licença.
