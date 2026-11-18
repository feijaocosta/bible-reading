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

According to YouTube's documentation, videos uploaded by an **unaudited** API project may be locked as **private**, with no appeal. The audit is free.

> 📝 In our first test (Nov 2026) the video came out **public even without the audit**. Request it anyway: the rule is still documented, the lock may happen after the upload, and the audit is also how you ask for more quota. If a video ever shows up as private without you asking for it, this is why.

1. Open the [YouTube API Services – Audit and Quota Extension](https://support.google.com/youtube/contact/yt_api_form) form.
2. Choose the audit option and fill in your project details (project name and number are on the Google Cloud dashboard). Describe the use: *"Automated uploads of Bible readings recorded by volunteers to our own channel; internal use, no external users."*
3. The reply may take a few weeks. Meanwhile, check YouTube Studio now and then to confirm the videos keep the visibility you chose.

### 2.9. Test

1. Follow section 1, but check **Publicar no YouTube e no catálogo** (publish).
2. When the run finishes, the summary shows the video link, and a commit by `github-actions[bot]` adds the reading to `data/readings.json`.
3. Running again with the same **reading ID** doesn't upload twice: the run says "already published" and stops.

### Known limits and issues

- **Daily API quota:** Google recently changed the upload quota rules and sources disagree: some say about 6 uploads a day, others about 100. Check the real value under **Google Cloud → APIs & Services → YouTube Data API v3 → Quotas**. If the quota runs out, the run fails with `quotaExceeded`, the video stays in the Artifacts, and you just run it again the next day.
- **Thumbnail not applied:** the channel isn't phone-verified (step 2.1). The video is still published and the summary shows a warning.
- **`invalid_grant`:** the authorization expired or was revoked. Redo step 2.6 and update the `YT_REFRESH_TOKEN` secret.
- **Protected `main` branch:** if a protection rule blocks pushes, the catalog commit fails. Allow `github-actions[bot]` or turn the rule off.

## 3. Form (automatic input)

Done once. After this, daily operation is **just filling in the form**: on submit, the video is generated and published by itself within a few minutes.

Use the **same Google account** as the channel and the Google Cloud project.

### 3.1. Service account (lets GitHub read the audio on Drive)

1. In [Google Cloud](https://console.cloud.google.com), with the `biblia-lida-por-elas` project selected: menu ☰ → **APIs & Services** → **Library** → search **Google Drive API** → **Enable**.
2. Menu ☰ → **IAM & Admin** → **Service accounts** → **Create service account**.
3. Name: `drive-reader` → **Create and continue** → skip the roles (**Continue**) → **Done**.
4. Click the new account → **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**. A `.json` file is downloaded.
5. Note the service account **e-mail**, which ends with `@biblia-lida-por-elas.iam.gserviceaccount.com`. You need it in step 3.6.

> ⚠️ If you see "Service account key creation is disabled" (organization policy), the account belongs to a Google Workspace that blocks keys. Ask the Workspace admin to lift the `iam.disableServiceAccountKeyCreation` policy for this project.

6. On GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name: `GOOGLE_SA_JSON`. Value: open the `.json` file in a text editor, copy **all** of it and paste.
7. **Delete the `.json` file** from your computer after saving the secret.

### 3.2. GitHub token (lets the form notify GitHub)

1. On GitHub, click your picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `bible-form`. Expiration: the longest available (up to 1 year).
3. **Repository access:** **Only select repositories** → pick `bible-reading`.
4. **Permissions** → **Repository permissions** → **Contents** → **Read and write**.
5. **Generate token** and copy it (starts with `github_pat_`). It is shown only once.

> 📅 **Put a reminder in your calendar** one week before the token expires. When it expires, the form stops triggering videos and you get an e-mail. To fix it, generate a new token and replace it in step 3.4.

### 3.3. Create the form

1. Go to [forms.google.com](https://forms.google.com) → **Blank form**.
2. **⋮** menu (top) → **Apps Script**.
3. Delete the code shown. Open [Code.gs](../apps-script/Code.gs) in the repository, click **Copy raw file** and paste it into the editor. Click 💾 **Save**.

### 3.4. Configure the script

1. In the Apps Script editor, click ⚙️ **Project Settings** (left side).
2. At the bottom, **Script Properties** → **Add script property**. Create two:

   | Property | Value |
   |---|---|
   | `GITHUB_REPO` | `feijaocosta/bible-reading` (owner/repository) |
   | `GITHUB_TOKEN_DISPATCH` | the token from step 3.2 |

3. **Save script properties**.
4. Back in the editor (`< >` icon on the left), pick the **setupForm** function in the toolbar → ▶ **Run**.
5. Google asks for authorization: **Review permissions** → pick your account → **Advanced** → **Go to (unsafe)** → **Allow**. That's expected, because the script is yours.
6. When it finishes, the form has its questions: name, book (all 66), reading part, chapter, and the "Ouvi e validei esta leitura" (I listened and validated this reading) checkbox.

### 3.5. Add the audio question (by hand)

Google doesn't let scripts create file upload questions, so this one is manual:

1. Open the form. Click the **Capítulo** question, then ➕ (add question).
2. Type: **File upload** → **Continue**.
3. Title, exactly: `Áudio`
4. Turn on **Allow only specific file types** → check **Audio**.
5. **Maximum number of files:** 1. **Maximum file size:** 100 MB.
6. Check **Required**.
7. Check the order: **Áudio** must come before **Conferência**. Drag it if needed.

### 3.6. Give the service account access to the audio files

1. Open [Google Drive](https://drive.google.com). There is now a folder named after the form, ending in `(File responses)`.
2. Right-click it → **Share** → paste the **service account e-mail** (step 3.1) → role **Viewer** → **uncheck** "Notify people" → **Share**.

### 3.7. Turn on automatic sending

1. In the Apps Script editor, pick **installTrigger** → ▶ **Run** (authorize again if asked).
2. Done: from now on, every submitted response triggers the video.

### 3.8. Test

1. Open the form (👁 **Preview**) and fill it in with a real reading.
2. In about a minute, a run shows up in GitHub's **Actions** tab with the book name. In 3 to 5 minutes the video is on YouTube and in the catalog.
3. Send the form link (**Send** → 🔗) to the coordinator only. To upload audio, she needs to be signed in to a Google account.

### If something goes wrong

- **The form owner gets an e-mail** when a response can't be sent to GitHub (expired token, missing property, empty chapter...). Fix it and run **resendLatestResponse** in the Apps Script editor. It resends the latest response, without duplicating the video.
- **The Actions run is red:** read the `Error:` message in the failed step (section 1). `Share the form's upload folder` means step 3.6 is missing.
- **The same reading sent twice:** each response has its own ID, so the same response never makes two videos. Two different responses do make two videos. In that case, delete the extra one in YouTube Studio and its entry in `data/readings.json`.

## 4. App (GitHub Pages)

The app is published on GitHub Pages, which is free for public repositories. Done once. After that, the app updates itself with every new reading.

### 4.1. Make the repository public

1. In the repository: **Settings** → **General** → scroll to **Danger Zone** → **Change visibility** → **Make public** → confirm.
2. This exposes no secrets: tokens and keys live in **Secrets**, which are never public.

### 4.2. Turn on GitHub Pages

1. **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**.

### 4.3. First publication

1. **Actions** tab → **Publicar app** → **Run workflow** → **Run workflow**.
2. In 1 to 2 minutes the run turns green. The app address shows in the run summary and under **Settings → Pages**. It looks like `https://<your-user>.github.io/bible-reading/`.
3. From now on, every new reading published through the form also updates the app.

### 4.4. Install on a phone

- **Android (Chrome):** open the address → **⋮** menu → **Install app** (or **Add to Home screen**).
- **iPhone (Safari):** open the address → **Share** button → **Add to Home Screen**.

### 4.5. Older readings without app audio

Readings published before the app's own audio existed show the YouTube video in the app. To generate their audio:

1. Open [data/readings.json](../data/readings.json) and copy the reading's `id` (the text in quotes after `"id":`).
2. Get the link to the original audio. If it was sent through the form, it is in the form's response folder on Drive: right-click the file → **Share** → **Copy link**. No need to change the sharing, because the service account can already read that folder.
3. **Actions** tab → **Gerar áudio do app** → **Run workflow**. Paste the id and the link → **Run workflow**.
4. In about 3 minutes, the reading plays with its own audio in the app. YouTube is not changed.

### What the app does

- Plays each reading's **own audio** (MP3 served by the site itself), including with the screen locked.
- **Download (Baixar):** saves a reading on the device to listen offline. On iPhones, if the app goes unused for weeks, the system may clear downloaded audio. Just download it again.
- Readings published before the app audio existed show the **YouTube video** instead of the player.
- Each reading has **its own address**. When shared on WhatsApp, the preview shows the reading's artwork.

### Where the audio lives

The MP3s are stored in **GitHub Releases** (one release per book). Every time the app is published, they are copied into the GitHub Pages site itself, because iPhones can't play audio straight from Releases. A GitHub Pages site can be **up to 1 GB**, roughly **500 readings** of 4 minutes. The **Publicar app** run summary shows how much is used and warns above 85%. At that point, it's time to move the audio to another free host (for example, the Internet Archive).

## 5. Google Analytics (optional)

The app already sends events to Google Analytics 4. Until an id is configured, **nothing is loaded or sent**.

1. Go to [analytics.google.com](https://analytics.google.com) → **Admin** (gear) → **Create** → **Property**. Name: `Bíblia lida por elas`. Brazil time zone and currency.
2. Choose **Web** as the platform. URL: the app address (section 4 or 6). Stream name: `App`.
3. Copy the **Measurement ID**, which starts with `G-`.
4. On GitHub: **Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**. Name: `GA_MEASUREMENT_ID`. Value: the `G-...`.
5. **Actions** tab → **Publicar app** → **Run workflow**. Within minutes, visits show up under **Reports → Realtime**.

### Events sent

| Event | When | Details |
|---|---|---|
| `page_view` | every screen opened | address and title |
| `audio_play` | a reading starts playing | book, part, narrator, online/offline |
| `audio_progress` | 25%, 50% and 75% heard | book, percent |
| `audio_complete` | the reading reached the end | book, narrator |
| `autoplay_toggle` / `autoplay_next` | autoplay switched on/off / moved to the next reading | — |
| `speed_change` | playback speed changed | speed |
| `download` | a reading or a whole book downloaded | reading or book |
| `download_remove` | downloads deleted | one or all |
| `share` | share button | reading or book, how it was shared |
| `search` | search typed | term |
| `app_installed` / `app_update` | app installed / reloaded for a new version | — |

> ⚖️ **Privacy laws (LGPD in Brazil, GDPR in Europe):** Google Analytics uses cookies. Before turning it on, add a privacy notice to the app (and, if preferred, a consent prompt).

## 6. Custom domain

To serve the app at `biblia.kingdomapps.net` instead of `feijaocosta.github.io/bible-reading` (if you reuse this project, use your own domain instead):

1. In your domain's DNS panel (wherever `kingdomapps.net` is managed: Cloudflare, Registro.br, GoDaddy...), create a **CNAME** record:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `biblia` (the chosen subdomain) | `feijaocosta.github.io` |

   On Cloudflare, keep the cloud **grey** ("DNS only").
2. On GitHub: **Settings** → **Pages** → **Custom domain** → type `biblia.kingdomapps.net` → **Save**. GitHub checks the DNS (from minutes to a few hours).
3. When it says "DNS check successful", check **Enforce HTTPS**.
4. **Actions** tab → **Publicar app** → **Run workflow**. The app adapts to the new address by itself (links, WhatsApp previews, icons).
5. Recommended: verify the domain in your GitHub account settings (**Pages → Verify domain**) so nobody else can use it on GitHub.

> 💡 Downloads and "continue where you left off" are stored per address. People who used the old address need to download again at the new one. The old address redirects to the new one.
