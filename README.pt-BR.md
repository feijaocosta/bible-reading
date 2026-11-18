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
- [ ] F1 — Pipeline local (arte + MP4) e identidade visual
- [ ] F2 — Execução manual no GitHub Actions
- [ ] F3 — Upload no YouTube + catálogo
- [ ] F4 — Entrada pelo Google Forms
- [ ] F5 — PWA
- [ ] F6 — Retorno do status na planilha

## Reaproveitando o projeto

O código está em inglês e os textos para o usuário final estão em português. O `data/books.json` traz também os nomes em inglês (`nameEn`) para facilitar outros idiomas.
