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

## 2. Publish on YouTube

Done once. Afterwards the workflow uploads the video to the channel, adds it to the testament's playlist and updates the app catalog.

> 💡 Google renames its menus often. If a button has a different name, look for the closest one: the path is the same.

### 2.1. YouTube channel

1. Sign in to [youtube.com](https://www.youtube.com) with the Google account that will own the project.
2. If there is no channel yet, click your picture → **Create a channel**. Name it "Bíblia lida por elas".
3. Go to [youtube.com/verify](https://www.youtube.com/verify) and verify the channel by phone. **Without this, YouTube rejects custom thumbnails** (the video artwork).

### 2.2. Playlists

1. Open [YouTube Studio](https://studio.youtube.com) → **Content** → **Playlists** → **New playlist**.
2. Create two, with **Public** or **Unlisted** visibility: `Antigo Testamento` (Old Testament) and `Novo Testamento` (New Testament).
3. Open each playlist. The address ends with `list=PL...`. Copy the code starting with `PL` and note which testament it belongs to.

### 2.3. Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com) with the same account. Accept the terms if it's your first time. **No credit card is needed.**
2. At the top, click the project picker → **New project**. Name: `biblia-lida-por-elas` → **Create**. Make sure the new project is selected at the top.
3. Menu ☰ → **APIs & Services** → **Library**. Search for **YouTube Data API v3** → **Enable**.

### 2.4. OAuth consent screen

1. Menu ☰ → **APIs & Services** → **OAuth consent screen** (may show as **Google Auth Platform**) → **Get started**.
2. App name: `Bíblia lida por elas`. Support email: yours. → **Next**.
3. Audience: **External** → **Next**. Enter your contact email → **Next** → agree → **Create**.
4. Go to **Audience** → **Publish app** → **Confirm**. The status must read **In production**.
   > ⚠️ If the app stays in "Testing", the authorization **expires after about 7 days** and uploads stop working.

### 2.5. OAuth client

1. In **Clients** (or **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**):
2. Application type: **Web application**. Name: `GitHub Actions`.
3. Under **Authorized redirect URIs**, add exactly: `https://developers.google.com/oauthplayground`
4. **Create**. You get a **Client ID** and a **Client secret**. Copy both somewhere safe for now.

### 2.6. Authorize the channel (refresh token)

GitHub uses this authorization to upload videos on behalf of the channel. You get it through Google's OAuth Playground, with nothing to install.

1. Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the gear ⚙️ (top right) → check **Use your own OAuth credentials** → paste the **Client ID** and **Client secret** from step 2.5 → close the gear.
3. On the left, in **Input your own scopes**, type: `https://www.googleapis.com/auth/youtube` → **Authorize APIs**.
4. Sign in with the channel's account. If the channel is a Brand Account, **pick the channel** from the list.
5. You'll see "Google hasn't verified this app". That's expected, because the app is yours. Click **Advanced** → **Go to Bíblia lida por elas (unsafe)** → **Continue**.
6. Back in the Playground, click **Exchange authorization code for tokens**.
7. Copy the **Refresh token**, a long string starting with `1//`.

### 2.7. Store everything in GitHub

1. In the repository: **Settings** → **Secrets and variables** → **Actions**.
2. **Secrets** tab → **New repository secret**. Create one at a time:

   | Name | Value |
   |---|---|
   | `YT_CLIENT_ID` | Client ID (2.5) |
   | `YT_CLIENT_SECRET` | Client secret (2.5) |
   | `YT_REFRESH_TOKEN` | Refresh token (2.6) |

3. **Variables** tab → **New repository variable**:

   | Name | Value |
   |---|---|
   | `YT_PLAYLIST_OT` | `PL...` code of the Old Testament playlist |
   | `YT_PLAYLIST_NT` | `PL...` code of the New Testament playlist |
   | `YT_PRIVACY` | `unlisted`, `public` or `private` |

> 🔒 Secrets never show up in logs and are not visible in the public repository. Never paste these values into any file.

### 2.8. Request the API audit (important)

Until the Google Cloud project is audited, **every video uploaded through the API is locked as private**, and you can't appeal it later. The audit is free.

1. Open the [YouTube API Services – Audit and Quota Extension](https://support.google.com/youtube/contact/yt_api_form) form.
2. Choose the audit option and fill in your project details (project name and number are on the Google Cloud dashboard). Describe the use: *"Automated uploads of Bible readings recorded by volunteers to our own channel; internal use, no external users."*
3. The reply may take a few weeks. Meanwhile, test with `YT_PRIVACY` = `private`.

### 2.9. Test

1. Follow section 1, but check **Publicar no YouTube e no catálogo** (publish).
2. When the run finishes, the summary shows the video link, and a commit by `github-actions[bot]` adds the reading to `data/readings.json`.
3. Running again with the same **reading ID** doesn't upload twice: the run says "already published" and stops.

### Known limits and issues

- **Daily API quota:** Google recently changed the upload quota rules and sources disagree: some say about 6 uploads a day, others about 100. Check the real value under **Google Cloud → APIs & Services → YouTube Data API v3 → Quotas**. If the quota runs out, the run fails with `quotaExceeded`, the video stays in the Artifacts, and you just run it again the next day.
- **Thumbnail not applied:** the channel isn't phone-verified (step 2.1). The video is still published and the summary shows a warning.
- **`invalid_grant`:** the authorization expired or was revoked. Redo step 2.6 and update the `YT_REFRESH_TOKEN` secret.
- **Protected `main` branch:** if a protection rule blocks pushes, the catalog commit fails. Allow `github-actions[bot]` or turn the rule off.
