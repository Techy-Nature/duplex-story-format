# Turning a Duplex story into an Android app

Your story stays plain Twee in its own repo. GitHub builds the app for you every time you push, so nothing needs installing on your phone.

## What you get

- A real Android app with your story's name and (optionally) your own icon.
- A dark screen from the first frame, with no white flash.
- Saves, settings and installed mods work the same as in a browser.
- **Export** in the story opens Android's "Save to" screen, and **Import** opens the file picker.
- Links to websites open in your browser. Back sends the app to the background instead of closing it, so you never lose your place.
- Each new build installs over the last one (same key, higher version number).

## Set it up (once)

1. **Lay out your story repo.** Put your `.twee` / `.tw` files in a folder, for example `src/`. Make sure one file has a `StoryData` passage with an `ifid` (Tweego refuses to build without one):

   ```
   :: StoryData
   {
     "ifid": "PUT-YOUR-IFID-HERE",
     "format": "Duplex",
     "format-version": "1.8.0",
     "start": "Start"
   }
   ```

   No IFID yet? Run `tweego src` once in Termux; it prints one you can paste in.

2. **Add the build file.** In your story repo, create `.github/workflows/app.yml` and paste in the whole of [`story-repo-workflow.yml`](story-repo-workflow.yml). Change these lines to fit:

   | Line | What it means |
   |---|---|
   | `app_name` | The name under the app icon. |
   | `app_id` | A unique ID like `io.github.yourname.storyname`. Lowercase letters, numbers, dots. **Never change it once installed**, or Android treats it as a different app. |
   | `story_path` | The file or folder Tweego compiles. |
   | `assets_path` | (Optional) A folder of images or audio. It's copied next to the story, so `media/forest.jpg` in your story works if the folder is `media`. |
   | `icon` | (Optional) A square PNG, 512×512 is ideal. |

3. **Commit and push** (NestSync's one-tap sync works for this).

4. **Wait for the build.** Open the repo on GitHub, tap **Actions**, and watch **Build story app**. It takes about 4 minutes the first time.

5. **Install it.** Tap **Releases** on the repo's main page, tap the newest one, then tap the `.apk` file. Open it and allow your browser to install unknown apps if asked.

From then on, every push builds a new version, and installing it updates the app in place.

**Tip:** to build without pushing, open **Actions → Build story app → Run workflow**.

## On git.gay (or another Forgejo server)

This only works if your account has Actions runners: check **Settings → Actions → Runners** for at least one runner that shows as online, and note its label.

1. In your story repo on git.gay, create `.forgejo/workflows/app.yml` and paste in the whole of [`forgejo-story-workflow.yml`](forgejo-story-workflow.yml).
2. Change the lines under `env:` the same way as in the table above (`APP_NAME`, `APP_ID`, `STORY_PATH`, and optionally `ASSETS_PATH` and `ICON`).
3. Change `runs-on: docker` to your runner's label if it's different.
4. Make sure Actions is turned on for the repo (**Settings → Units** or **Settings → Repository**, depending on the version), then commit and push.
5. Watch the **Actions** tab. When it's green, the APK is on the repo's **Releases** page.

If publishing fails with a permission error, make an access token (**Settings → Applications**, with repository write access) and add it as a repo secret named `RELEASE_TOKEN`. Signing secrets work the same as below, added under the repo's **Settings → Actions → Secrets**.

Android builds need a few GB of memory, so a very small shared runner may run out. If that happens, the GitHub mirror route (git.gay pushes to a GitHub copy that builds the app) always works.

## Optional: sign with your own key

Builds are signed with a shared public key by default. That's fine for you and friends, but anyone with that key could make an update that installs over yours. To use your own key instead:

1. In **NestSigner**, make a keystore (Make a key tab). Remember the password and alias.
2. Turn the keystore into base64 text. In Termux: `base64 -w0 /storage/emulated/0/Download/your.jks`
3. In your story repo on GitHub, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

   | Secret | Value |
   |---|---|
   | `STORY_KEYSTORE_BASE64` | The base64 text |
   | `STORY_KEYSTORE_PASSWORD` | The keystore password |
   | `STORY_KEY_ALIAS` | The key alias |
   | `STORY_KEY_PASSWORD` | The key password (same as the keystore one if you didn't set a separate one) |

4. Uninstall the old app once (the key changed), then install the new build. Later builds update normally.

## Troubleshooting

- **"No story found at app/src/main/assets/story/index.html"**: Tweego produced nothing. Check `story_path`.
- **Tweego says the IFID is missing**: add the `StoryData` passage from step 1.
- **"App not installed" when updating**: the signing key or `app_id` changed. Uninstall the old app first (export your saves before you do).
- **Images don't show**: paths in the story must be relative (`media/pic.png`, not `/media/pic.png`), and `assets_path` must point at that folder.

## How it works

`.github/workflows/story-app.yml` in duplex-story-format checks out your story and this repo, compiles the story with Tweego 2.1.1 and the current Duplex `format.js` into `android-app/app/src/main/assets/story/index.html`, then builds the small WebView app in `android-app/` with Gradle. The app serves the story from `https://appassets.androidplatform.net/assets/story/`, which gives it normal browser storage.
