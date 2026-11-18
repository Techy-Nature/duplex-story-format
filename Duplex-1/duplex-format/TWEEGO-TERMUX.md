# Build Duplex stories with Tweego on Android (Termux)

[Tweego](https://www.motoslave.net/tweego/) is a command-line compiler for Twine stories written as plain text (Twee). There is no official Android download, but [Termux](https://termux.dev/) packages it, so you can install it in one command. This guide walks through installing it, adding Duplex as a story format, and building a playable `story.html` on your phone.

> **Get Termux from F-Droid or GitHub**, not the Play Store. The Play Store version is outdated and its package installs often fail.

## 1. Install Tweego and Git

Termux has its own Tweego package, so you don't need to build anything. Open Termux and run:

```sh
pkg update
pkg install tweego git
```

Check it:

```sh
tweego --version
```

You should see `tweego, v2.1.1`.

## 2. (Only if step 1 failed) Build Tweego with Go instead

Skip this step if `tweego --version` worked. If the package isn't available on your device, build Tweego yourself:

```sh
pkg install golang
go install github.com/tmedwards/tweego@master
```

Use `@master`, **not** `@latest`. Tweego's version tags predate Go modules, so `@latest` picks an old `v2.0.0+incompatible` build with no pinned dependencies, which can fail or demand a newer Go than you have. `@master` is the same code as the Tweego 2.1.1 release, with its dependencies pinned.

Check that the program was built. This should list `tweego`:

```sh
ls ~/go/bin
```

Go puts the program in `~/go/bin`, so add that folder to your `PATH`. **Type or copy this line exactly, with no backslashes before the `$` signs.** A line like `"\$PATH:..."` breaks your `PATH`, and then Termux can't find any program.

```sh
echo 'export PATH="$PATH:$HOME/go/bin"' >> ~/.bashrc
source ~/.bashrc
tweego --version
```

## 3. Add Duplex as a story format

Tweego looks for story formats in folders. Each format gets its own subfolder holding its `format.js`, and **the subfolder's name becomes the format's ID** for the `-f` option.

Download Duplex and copy its `format.js` into a folder named `duplex-1`:

```sh
cd ~
git clone https://github.com/Techy-Nature/duplex-story-format.git
mkdir -p ~/storyformats/duplex-1
cp "duplex-story-format/Duplex-1/duplex-format/format.js" ~/storyformats/duplex-1/
```

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
  duplex-1               Duplex (1.9.0)
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
	"format-version": "1.9.0",
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
cp "$HOME/duplex-story-format/Duplex-1/duplex-format/example.twee" src/
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
| `The program tweego is not installed` or `tweego: command not found` | Run `pkg install tweego` (step 1). If you built it with Go, run `ls ~/go/bin` to check it exists and `source ~/.bashrc` to load your `PATH` (step 2). |
| Every command says it is not installed, even `ls` | A broken `PATH` line, often `"\$PATH:\$HOME/go/bin"` with backslashes, is in `~/.bashrc`. Run `export PATH="$PREFIX/bin"`, then `sed -i '/go\/bin/d' ~/.bashrc`, then close and reopen Termux. |
| `requires go >= …` or a dependency error during `go install` | You used `@latest`. Use `@master` (step 2). If it still fails, run `pkg upgrade golang`, or use `pkg install tweego` instead. |
| `Story format search directories not found.` | `TWEEGO_PATH` isn't set. Run `source ~/.bashrc` (step 3). |
| `Story IFID not found` | Add a `StoryData` passage (step 4). |
| `--list-formats` doesn't show Duplex | Make sure the file is at `~/storyformats/duplex-1/format.js`, not one folder deeper. |

## What was tested

- Termux's `tweego` package is version 2.1.1, built from the official release (checked against the [Termux package recipe](https://github.com/termux/termux-packages/blob/master/packages/tweego/build.sh)).
- On a real phone with F-Droid Termux and Go 1.27.3, `go install …@master` downloaded fine. The `PATH` line was then entered with backslashes (`\$PATH`), which broke `PATH`; that is why step 2 now warns about it.

The rest was checked on a Linux computer with Tweego 2.1.1 built from `@master`:

- `go install github.com/tmedwards/tweego@master` builds; `@latest` failed here because it pulled in dependencies that need a newer Go.
- The same build compiles for Android (`GOOS=android GOARCH=arm64`), the target Termux uses.
- `tweego --list-formats` lists Duplex 1.9.0 under the ID `duplex-1`.
- Building the Duplex example with and without `-f`, and decompiling it with `-d`, all work, and the built story plays in a mobile-sized browser.

Not yet tried on a real phone: running Termux itself, `termux-setup-storage`, and opening the story from Downloads.
