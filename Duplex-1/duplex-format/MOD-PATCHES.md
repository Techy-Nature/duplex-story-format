# Writing quest mods as `.mod` files

Duplex 1.9.0 adds a simpler way to write quest and passage mods: a plain text `.mod` file that looks like Twee. You write `:: after Forest1`, then the text you want added, and Duplex does the rest. No JSON, no ids, no escaping quotes or `\n` line breaks.

The format is inspired by [KittyPatcher](https://github.com/GrasSlimeGaming/course-of-temptation/blob/main/KittyPatcher.py)'s plain-text patch files (a keyword line, then the text it applies to). Unlike KittyPatcher, Duplex never edits the story file: the mod's text is added around a passage when it is shown, so turning the mod off removes it cleanly.

JSON mods still work exactly as before, and items keep their JSON format (see [MODS.md](MODS.md)).

## A complete example

This is [`examples/haunted-house.mod`](examples/haunted-house.mod):

```
Mod: Haunted House
Version: 1.0.0
Author: Example
Description: Adds an old house to explore, reached from the town square.
Requires: >=1.9.0

:: after Town Square
[[Investigate the old house->Old House]]

:: Old House [skip unsafe-room]
<<skipto "Garden">>
<<skipsummary>>You search the house and slip out through the garden.<</skipsummary>>
The door creaks open onto a dark hall.

[[Go upstairs->Attic]]
[[Leave->Town Square]]

:: Attic [safe-room]
Dust, old letters, and a brass key on a nail.

[[Back down->Old House]]

:: Garden
Overgrown roses hide a gate back to town.

[[Return to town->Town Square]]

:: items
[
  { "id": "brass-key", "name": "Brass Key", "description": "Opens the attic.", "tags": ["quest"] }
]
```

## Step by step

### Step 1: Make the file

1. Create a new text file and name it after your mod, ending in `.mod`, for example `Haunted House.mod`.
2. If your phone's editor won't save a `.mod` file, `.txt` also works (`Haunted House.mod.txt` or `Haunted House.txt`).

### Step 2: Name the mod (optional)

1. On the first line, write `Mod:` and the mod's name: `Mod: Haunted House`.
2. The name **is** the mod's id. Players see it in the Mods menu, and saves remember it.
3. If you leave the `Mod:` line out, the file name is used instead (`Haunted House.mod` → `Haunted House`).
4. Names can have spaces, but not `:`, `[`, `]`, `|` or line breaks, and are at most 100 characters.

Other settings you can add at the top, one per line, all optional:

| Setting | What it does | Default |
| --- | --- | --- |
| `Mod:` | The name (and id) | The file name |
| `Version:` | Shown in the Mods menu and checked by saves | `1.0.0` |
| `Author:` | Shown in the Mods menu | none |
| `Description:` | A short summary | none |
| `Story:` | Only install into the story with this IFID or name | any story |
| `Requires:` | Minimum Duplex version, such as `>=1.9.0` | any version |

Lines starting with `//` or `#` at the top are comments.

### Step 3: Add text to a story passage

1. Start a line with `:: after` and the passage's exact name: `:: after Forest1`.
2. Write the text underneath, using normal Duplex markup: links, `<<if>>`, `<<set>>`, and so on.
3. Use `:: before Forest1` instead to put the text above the passage.
4. The text runs until the next `::` line or the end of the file.

```
:: after Forest1
<<if $metTheOwl>>The owl watches from a branch. [[Follow it->Owl Hollow]]<</if>>

:: before Forest1
A cold wind blows.
```

You can have as many `after` and `before` sections as you like, even several for the same passage. They appear in the order they are written.

Passage names must match exactly, including capital letters and spaces. If a name is wrong, the import says which line it is on.

### Step 4: Add your own places (optional)

1. Start a line with `::` and the place's name, exactly like a Twee passage: `:: Owl Hollow`.
2. Add tags in square brackets if you want them: `:: Owl Hollow [skip violence]`.
3. Write the place's text underneath.

```
:: Owl Hollow [safe-room]
A hollow full of feathers. [[Back to the forest->Forest1]]
```

* Links inside your mod go to **your mod's** places first. Any other name means the story's passage, so `[[Back to the forest->Forest1]]` returns to the story.
* Tag a place `safe-room` or `unsafe-room` to make it an inventory room (same as story passages).
* Content tags like `skip` or `violence` work as usual, and `<<skipto>>`/`<<skipsummary>>` work inside your places.
* If a place's name starts with `after`, `before`, `place` or `items`, write `:: place` first so Duplex knows it is a place: `:: place After Dark`.

### Step 5: Add items (optional)

Items keep the same JSON format as JSON mods. Put them in a `:: items` section as a JSON array:

```
:: items
[
  { "id": "owl-feather", "name": "Owl Feather", "tags": ["bird"] },
  { "id": "lantern", "name": "Lantern", "quantity": 1 }
]
```

Story code gets them with the mod's name: `Duplex.mods.createItem("Haunted House", "brass-key")`. See [MODS.md](MODS.md) for every item field.

### Step 6: Install it

1. Open the story and choose **Mods** in the left bar.
2. Choose **Import mod** and pick your `.mod` file.
3. The mod is installed and turned on. If something is wrong, Duplex shows which line to fix and nothing is installed.

To update a mod, **Remove** the old version first, then import the new file.

## Small rules

* A `::` line must start at the very beginning of the line.
* If your passage text needs a line that starts with `::`, write `\::` instead.
* Blank lines right after a `::` line and at the end of a section are ignored.
* Anything Twee puts after the tags, such as `{"position":"100,100"}`, is ignored, so you can copy passages out of a `.twee` file.
* Mod text is restricted, the same as in JSON mods: no `<<script>>`, `<<run>>`, widgets or JavaScript. See "Restricted passage extensions" in [MODS.md](MODS.md).
* A mod can never change where a story passage skips to. Its `<<skipsummary>>` text is shown with the passage's own.
* Protected passages (`StoryInit`, `PassageHeader` and the rest, or anything tagged `widget`, `grammar`, `script` or `stylesheet`) can't be targeted.

## Quick reference

| You write | What happens |
| --- | --- |
| `Mod: Name` | Names the mod. The name is its id. |
| `:: after Passage` | Adds the text below it after the story passage. |
| `:: before Passage` | Adds the text below it before the story passage. |
| `:: Place Name [tags]` | Adds a new place of the mod's own. |
| `:: place Name [tags]` | Same, for names starting with a keyword. |
| `:: items` | A JSON array of items. |
| `\::` | A literal `::` at the start of a line. |

## Checking a mod from code

`Duplex.mods.parse(text, fileName)` turns `.mod` text into the equivalent JSON manifest without installing it, which is handy for checking a mod or converting it. `Duplex.mods.import(text, fileName)` installs it.

## Converting a JSON quest mod

| JSON | `.mod` file |
| --- | --- |
| `"id"` and `"name"` | `Mod: Name` |
| `"version"`, `"author"`, `"description"` | `Version:`, `Author:`, `Description:` |
| `"forStory"` | `Story:` |
| `"requires": { "duplex": ">=1.9.0" }` | `Requires: >=1.9.0` |
| `{ "target": "X", "placement": "after", "content": "…" }` | `:: after X` and the content below it |
| `{ "name": "Y", "tags": ["skip"], "room": "safe", "text": "…" }` | `:: Y [skip safe-room]` and the text below it |
| `"items": [ … ]` | `:: items` and the same array below it |

Compare [`examples/quest-mod.json`](examples/quest-mod.json) with [`examples/haunted-house.mod`](examples/haunted-house.mod) to see the same mod both ways.
