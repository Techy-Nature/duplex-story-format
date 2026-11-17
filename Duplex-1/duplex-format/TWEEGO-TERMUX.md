# Build Duplex stories with Tweego on Android (Termux)

[Tweego](https://www.motoslave.net/tweego/) is a command-line compiler for Twine stories written as plain text (Twee). There is no official Android download, but Tweego is written in Go, so you can build it inside [Termux](https://termux.dev/) in a few minutes. This guide walks through installing it, adding Duplex as a story format, and building a playable `story.html` on your phone.

> **Get Termux from F-Droid or GitHub**, not the Play Store. The Play Store version is outdated and its package installs often fail.

## 1. Install Go and Git

Open Termux and run:

```sh
pkg update
pkg install golang git
```

Check that Go works:

```sh
go version
```

## 2. Build and install Tweego

```sh
go install github.com/tmedwards/tweego@master
```

Use `@master`, **not** `@latest`. Tweego's version tags predate Go modules, so `@latest` picks an old `v2.0.0+incompatible` build with no pinned dependencies. Go then grabs the newest versions of everything, which can fail or demand a newer Go than you have. `@master` is the same code as the Tweego 2.1.1 release, with its dependencies pinned.

Go puts the program in `~/go/bin`. Add that folder to your `PATH`, now and for every future session:

```sh
echo 'export PATH="$PATH:$HOME/go/bin"' >> ~/.bashrc
source ~/.bashrc
```

Check it:

```sh
tweego --version
```

You should see `tweego, v2.1.1`.

## 3. Add Duplex as a story format

Tweego looks for story formats in folders. Each format gets its own subfolder holding its `format.js`, and **the subfolder's name becomes the format's ID** for the `-f` option.

Download Duplex and copy its `format.js` into a folder named `duplex-1`:

```sh
cd ~
git clone https://github.com/Techy-Nature/duplex-story-format.git
mkdir -p ~/storyformats/duplex-1
cp "duplex-story-format/Duplex 1.5.0/duplex-format/format.js" ~/storyformats/duplex-1/
```

The quotes matter, because the folder name `Duplex 1.5.0` contains a space. (The folder name is historical; the `format.js` inside it is the current Duplex release.)

Tell Tweego where your formats live:

```sh
echo 'export TWEEGO_PATH="$HOME/storyformats"' >> ~/.bashrc
source ~/.bashrc
```

Confirm Tweego sees Duplex:

```sh
tweego --list-formats
```

Expected output:

```
Available formats:
  ID                     Name (Version) [Details]
  --------------------   ------------------------------
  duplex-1               Duplex (1.8.0)
```

**Updating Duplex later:** run `git -C ~/duplex-story-format pull`, then repeat the `cp` command above.

## 4. Set up a story project

Make a project folder with a `src` folder for your Twee files:

```sh
mkdir -p ~/stories/my-story/src
cd ~/stories/my-story
```

Every story needs a `StoryData` passage with an IFID (a unique ID). Run Tweego once with no IFID and it will generate one for you and print a ready-made passage:

```sh
tweego -f duplex-1 -o story.html src/
```

Copy the printed IFID into a file such as `src/StoryData.twee`, and add the format name and version so you don't need `-f` every time:

```twee
:: StoryTitle
My Story

:: StoryData
{
	"ifid": "PASTE-YOUR-IFID-HERE",
	"format": "Duplex",
	"format-version": "1.8.0",
	"start": "Start"
}
```

Then write your passages in one or more `.twee` files in `src/`, for example `src/story.twee`:

```twee
:: StoryInit
<<set $passageMode = "append">>

:: Start
Your journey begins here.

[[Step forward->Next]]

:: Next
The path continues.
```

The Duplex example story is a good starting point too:

```sh
cp "$HOME/duplex-story-format/Duplex 1.5.0/duplex-format/example.twee" src/
```

## 5. Build the story

From the project folder:

```sh
tweego -o story.html src/
```

Or name the format explicitly by its folder ID:

```sh
tweego -f duplex-1 -o story.html src/
```

No output means success. You now have `story.html`.

### Rebuild automatically while you write

Watch mode rebuilds every time you save a file in `src/`:

```sh
tweego -w -o story.html src/
```

Press **Ctrl+C** to stop it.

## 6. Play the story on your phone

Termux's home folder is private, so your browser can't open files there directly. Pick one of these.

**Option A: a local web server (recommended).** This also keeps Duplex saves and mods working the way they would online.

```sh
pkg install python
cd ~/stories/my-story
python -m http.server 8080
```

Open `http://localhost:8080/story.html` in your browser. Leave Termux running in the background. Press **Ctrl+C** in Termux to stop the server.

**Option B: copy it to your Downloads folder.** First give Termux storage access (Android will ask for permission):

```sh
termux-setup-storage
```

Then build straight into Downloads:

```sh
tweego -o ~/storage/downloads/story.html src/
```

Open it from your Files app. Some browsers restrict local files, so use Option A if anything misbehaves.

## 7. Bring an existing Twine story into Twee

If you already have a story in Twine, publish it to an HTML file, copy that file into Termux, and decompile it:

```sh
tweego -d -o src/story.twee "My Story.html"
```

This keeps your `StoryData`, IFID and passages, so you can keep editing the story as text.

## Troubleshooting

| Message | Fix |
| --- | --- |
| `tweego: command not found` | Run `source ~/.bashrc`, or check that `~/go/bin` is on your `PATH` (step 2). |
| `requires go >= …` or a dependency error during `go install` | You used `@latest`. Use `@master` (step 2). If it still fails, run `pkg upgrade golang`. |
| `Story format search directories not found.` | `TWEEGO_PATH` isn't set. Run `source ~/.bashrc` (step 3). |
| `Story IFID not found` | Add a `StoryData` passage (step 4). |
| `--list-formats` doesn't show Duplex | Make sure the file is at `~/storyformats/duplex-1/format.js`, not one folder deeper. |

## What was tested

These steps were checked on a Linux computer with Tweego 2.1.1 built from `@master`:

- `go install github.com/tmedwards/tweego@master` builds; `@latest` failed here because it pulled in dependencies that need a newer Go.
- The same build compiles for Android (`GOOS=android GOARCH=arm64`), the target Termux uses.
- `tweego --list-formats` lists Duplex 1.8.0 under the ID `duplex-1`.
- Building the Duplex example with and without `-f`, and decompiling it with `-d`, all work, and the built story plays in a mobile-sized browser.

Not yet tried on a real phone: running Termux itself, `termux-setup-storage`, and opening the story from Downloads.
