# [Duplex 1.5.0](https://techy-nature.github.io/duplex-story-format/)

Duplex is a small, installable, [modifiable](https://github.com/Techy-Nature/duplex-story-format/blob/main/Duplex%201.5.0/duplex-format/MODS.md) Twine 2 story format with two navigation modes and one SugarCube-like passage syntax.

## Choose the mode in `StoryInit`

Append each new passage beneath the previous passage:

```twine
<<set $passageMode = "append">>
```

Replace the old passage with the new one:

```twine
<<set $passageMode = "replace">>
```

The value may be conditional:

```twine
<<set $useScrolling = true>>
<<set $passageMode = $useScrolling ? "append" : "replace">>
```

For JavaScript-based setup, Story JavaScript may set `Config.displayMode` to `"append"` or `"replace"`. That setting takes priority.

## Install in Twine 2 Desktop

1. Extract this folder somewhere permanent.
2. In Twine, open **Story Formats**, then **Add a New Format**.
3. Enter the full file URL to `format.js`, such as `file:///home/you/Twine/Duplex/format.js`.
4. Select **Duplex 1.5.0** for your story.

Browser-based Twine generally cannot install a local `file://` URL. Host the folder on a web server or use Twine Desktop.

## Included syntax

- Links: `[[Passage]]`, `[[Label->Passage]]`, `[[Label|Passage]]`
- Variables: `$name`
- Set: `<<set $name = "Nest">>` or `<<set $name to "Nest">>`
- Print: `<<print $name>>` or `<<= $name>>`
- Conditions: `<<if condition>>...<<elseif condition>>...<<else>>...<</if>>`
- Switches: `<<switch expression>><<case value>>...<<default>>...<</switch>>`
- Scripting: `<<run>>`, `<<script>>`, and `<<unset>>`
- Comments: `//` to the end of a line, `/* ... */` across lines, and `<<comment>>...<</comment>>`
- Markdown: `[markdown]`-tagged passages and `<<markdown>>...<</markdown>>` macro supports headings, emphasis, inline code, links, images, block quotes, and ordered or unordered lists
- Interactive controls: `<<button>>`, `<<link>>`, `<<linkappend>>`, `<<linkprepend>>`, `<<linkreplace>>`, `<<checkbox>>`, `<<radiobutton>>`, `<<cycle>>`, `<<listbox>>`, `<<numberbox>>`, `<<textbox>>`, and `<<textarea>>`
- Audio: `<<cacheaudio>>`, `<<audio>>`, `<<createaudiogroup>>`, `<<createplaylist>>`, `<<masteraudio>>`, `<<playlist>>`, `<<removeaudiogroup>>`, `<<removeplaylist>>`, and `<<waitforaudio>>`
- Operators: `is`, `is not`, `isnot`, `and`, `or`, `not`, plus ordinary JavaScript operators
- Story JavaScript and Story Stylesheet
- Back and Restart controls
- JavaScript API: `Duplex.go("Passage")`, `Duplex.back()`, `Duplex.restart()`, and `Duplex.mode()`

### Comments and Markdown

Comments are removed without rendering or running any macros inside them. A `//` comment begins at the start of a line or after whitespace; this means URLs such as `https://example.com` are left intact.

```twine
// A single-line comment
The nest is empty. // This is also a comment
/* A comment may
span multiple lines. */
<<comment>>Nothing here is displayed or evaluated.<</comment>>
```

Wrap Markdown in the `<<markdown>>` container. Duplex processes macros and variables within the rendered Markdown.

```twine
<<markdown>>
# Field notes

**Species:** $birdName

- Seen at dusk
- [Read more](https://example.com/birds)
<</markdown>>
```

## Left and right UI bars

Duplex displays a bar on each side by default. They automatically stow to narrow tabs on smaller screens.

- `StoryCaption` and `StoryMenu` populate the left bar.
- `StoryLeftBar` adds custom left-bar content.
- `StoryRightBar` adds custom right-bar content.
- The right bar also shows the current passage and display mode.

`UIBarL` controls the left bar. `UIBarR` controls the right bar. Both provide `destroy()`, `hide()`, `show()`, `isHidden()`, `isStowed()`, `stow()`, `unstow()`, and `update()`.

```javascript
UIBarL.stow();
UIBarR.unstow();
```

The older `UIBar`, `UIBarRight`, `UIBars.left`, and `UIBars.right` names remain as compatibility aliases.

The `UI` object provides `alert()`, `restart()`, `saves()`, `settings()`, `update()`, `jumpto()`, and `share()`.

## Keyboard shortcuts and StorySettings

Duplex includes keyboard shortcuts for **Inventory** (`Shift+I`), **Story settings** (`Shift+Alt`), **Reset story** (`Shift+Backspace`), and **Select** (`Enter`). Number keys follow the familiar keyboard layout for visible story links: `1` selects the first link, `2` the second, and so on, while `0` selects the last link. Shortcuts do not fire while the player is typing in an input.

If a `StorySettings` passage exists, its compiled contents appear at the top of the Settings dialog. The built-in shortcut rows keep the action label separate from the shortcut button. A player selects that button and presses a one- or two-key shortcut; the new value is saved immediately for that story and the button displays the actual value. No additional save or apply button is needed.

Authors can register additional actions from story JavaScript with `Duplex.shortcuts.add()`. Players can change registered bindings in Settings, but cannot add actions themselves:

```js
Duplex.shortcuts.add('journal', {
  label: 'Open journal',
  defaultShortcut: 'Shift+J',
  selector: '#open-journal'
});

Duplex.shortcuts.add('map', {
  label: 'Open map',
  defaultShortcut: 'M',
  action: () => setup.openMap()
});
```

IDs must be unique. Each definition needs a label, a default shortcut of no more than two keys, and either an `action` function or a CSS `selector` for the button to activate. The read-only `Duplex.shortcuts.get(id)` and `Duplex.shortcuts.list()` methods expose effective player bindings; `set(id, shortcut)` is also available for author tooling.

## Saves and portable backups

Duplex keeps one browser save per story and can export or import portable JSON backups. Open **Saves** in the left UI bar to use **Save**, **Load**, **Export**, **Import**, or **Delete**. Exported files include the story identity and are validated before import, so a save from another story or a damaged file will not replace the current progress.

The JavaScript `Save` API is also available:

```javascript
Save.save();                 // Store progress in this browser.
Save.load();                 // Restore the browser save.
Save.delete();               // Remove the browser save.
Save.export();               // Download <story-name>-save.json.
Save.import(jsonOrFile);     // Import JSON text, an object, or a File.
Save.serialize();            // Return the current save as JSON text.
Save.parse(jsonText);        // Validate and return save state.
```

`Save.import(file)` returns a promise when passed a browser `File`. The API is available as both `Save` and `Duplex.Save`. Duplex still provides one browser slot rather than SugarCube's full multi-slot Save API.

## Data-only JSON mods

Duplex 1.5.0 supports validated item-definition and passageExtended JSON mods through `Duplex.mods`, stored per story in IndexedDB. See the [mod authoring and player guide](Duplex%201.5.0/duplex-format/MODS.md) and its [complete example manifest](Duplex%201.5.0/duplex-format/examples/more-birds.json).

## Nested Bag Inventory

Duplex 1.5.0 represents inventory as a JSON-serializable hierarchy of stable bag instances. Each populated bag has its own ID, definition/name, properties, item stacks, and child bags. Only compatible empty bags stack (up to 1000); a bag is automatically split from an empty stack before it receives contents.

```text
Travel pack (bag-1)
└── Medicine pouch (bag-2)
    └── Lockbox (bag-3)
        └── vial
```

Moving the medicine pouch into another bag moves that whole branch without merging or redistributing stacks. Opening shows its immediate rows. **Take Everything** (also available by double-click) unpacks only the pouch's immediate items and child bags, so the vial remains inside the lockbox. Duplex validates capacity, room, and ancestry rules before changing anything, making unpacking atomic. Rooms stay top-level: safe-room trees persist when the player leaves, and danger-room cleanup recursively removes only the abandoned room tree. Inventory is included in Back history and save/export/import JSON.

See [`Duplex 1.5.0/duplex-format/README.md`](Duplex%201.5.0/duplex-format/README.md#Nested-Bag-Inventory) and the documentation website linked at the top of this file for API and interaction details.

## Widgets

Create one or more passages with the `widget` tag. Duplex processes their `<<widget>>` definitions during startup.

```twine
<<widget "birdname">>
  The bird is <<= _args[0]>>.
<</widget>>
```

Use it in a normal passage:

```twine
<<birdname "Common nighthawk">>
```

Container widgets are also supported with the `container` keyword and `_contents`:

```twine
<<widget "birdnote" container>>
  <aside class="bird-note"><<= _contents>></aside>
<</widget>>
```

## Passage tags

Use `tags()` to obtain a passage's tags and `hasTag()` to test one tag. In `StoryInit`, name the passage explicitly:

```twine
<<if tags("Start").includes("scrolling")>>
  <<set $passageMode = "append">>
<<elseif hasTag("Start", "pages")>>
  <<set $passageMode = "replace">>
<<else>>
  <<set $passageMode = "replace">>
<</if>>
```

Within an ordinary passage while it is rendering, the title may be omitted:

```twine
<<if hasTag("forest")>>You are beneath the trees.<</if>>
```

Unknown passage names return an empty tag array. The helpers are also available as `Duplex.tags()` and `Duplex.hasTag()`.

## Important compatibility note

Duplex is not Harlowe or SugarCube 2 and does not implement every macro from either format. It deliberately uses one SugarCube-like syntax in both display modes. Existing projects may need conversion for unsupported macros. Interactive and audio macros follow SugarCube's common syntax, but Duplex uses the browser's native audio engine and does not reproduce SugarCube's complete save system or every edge case.

## Rebuild after editing

Requires Node.js 18 or newer:

```sh
node build.mjs
```

The generated `format.js` is the file Twine installs.

## License

MIT.
