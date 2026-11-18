# Step-by-step setup

*Leia em português: [SETUP.pt-BR.md](SETUP.pt-BR.md)*

This guide collects everything that has to be done by hand, outside the code. It grows with each project phase. Follow the sections in order.

## 1. Generate a video manually (GitHub Actions)

This lets you test the whole process without the form and without YouTube. The video is available for download on the run page.

### 1.1. Make the audio reachable through a link

GitHub needs to download the audio from somewhere. Use one of these:

1. **Google Drive:** upload the file, right-click it, **Share** → under "General access" pick **Anyone with the link** → **Copy link**.
2. **Dropbox:** **Share** → **Copy link**.
3. Any **direct link** to an `.ogg`, `.opus`, `.mp3` or `.m4a` file.

> ⚠️ **Privacy:** the repository is public, so **the link you type is visible** in the Actions run history. Use test recordings. After testing, set the Drive sharing back to **Restricted**. In normal operation (phase F4) the audio is downloaded from Drive with a service account and no link is exposed.

### 1.2. Run the workflow

1. On GitHub, open the repository and click the **Actions** tab.
2. In the list on the left, click **Nova leitura**.
3. On the right, click **Run workflow**.
4. Fill in the fields:
   - **Livro (book):** NVI name, e.g. `Gênesis`, `Salmos`, `1 Tessalonicenses`. Case and accents don't matter.
   - **Capítulo (chapter):** the number, or `introdução` / `encerramento` (introduction / closing).
   - **Nome de quem leu (narrator)**.
   - **Link do áudio (audio link):** the link from step 1.1.
5. Click the green **Run workflow** button.

### 1.3. Download the video

1. After a few seconds the run shows up in the list. Click it.
2. Wait for the yellow circle to turn into a green ✅. It takes about 2 to 3 minutes.
3. The page shows a summary of the reading. Scroll down to **Artifacts** and click `leitura-N` to download a `.zip` with:
   - `output.mp4`: the video;
   - `artwork.png`: the 1920x1080 artwork;
   - `thumbnail.jpg`: the YouTube thumbnail;
   - `reading.json`: the reading details.

The files are kept for 30 days.

### If it fails (red ❌)

Click the run, then **video**, and open the failed step. The message starting with `Error:` says what happened. The most common ones:

| Message | What to do |
|---|---|
| `Unknown book` | Check the book name (NVI). |
| `Invalid chapter` | The book doesn't have that chapter. |
| `returned a web page instead of an audio file` | The Drive link is not set to "Anyone with the link". |
| `the minimum is 10s` | The audio is shorter than 10 seconds. Check that it is the right file. |
