# Duplex 1.3.1

Duplex is a small, installable Twine 2 story format with two navigation modes and one SugarCube-like passage syntax.

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
4. Select **Duplex 1.3.1** for your story.

Browser-based Twine generally cannot install a local `file://` URL. Host the folder on a web server or use Twine Desktop.

## Included syntax

- Links: `[[Passage]]`, `[[Label->Passage]]`, `[[Label|Passage]]`
- Variables: `$name`
- Set: `<<set $name = "Nest">>` or `<<set $name to "Nest">>`
- Print: `<<print $name>>` or `<<= $name>>`
- Conditions: `<<if condition>>...<<elseif condition>>...<<else>>...<</if>>`
- Switches: `<<switch expression>><<case value>>...<<default>>...<</switch>>`
- Scripting: `<<run>>`, `<<script>>`, and `<<unset>>`
- Interactive controls: `<<button>>`, `<<link>>`, `<<linkappend>>`, `<<linkprepend>>`, `<<linkreplace>>`, `<<checkbox>>`, `<<radiobutton>>`, `<<cycle>>`, `<<listbox>>`, `<<numberbox>>`, `<<textbox>>`, and `<<textarea>>`
- Audio: `<<cacheaudio>>`, `<<audio>>`, `<<createaudiogroup>>`, `<<createplaylist>>`, `<<masteraudio>>`, `<<playlist>>`, `<<removeaudiogroup>>`, `<<removeplaylist>>`, and `<<waitforaudio>>`
- Operators: `is`, `is not`, `isnot`, `and`, `or`, `not`, plus ordinary JavaScript operators
- Story JavaScript and Story Stylesheet
- Back and Restart controls
- JavaScript API: `Duplex.go("Passage")`, `Duplex.back()`, `Duplex.restart()`, and `Duplex.mode()`

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

The `UI` object provides `alert()`, `restart()`, `saves()`, `settings()`, `update()`, `jumpto()`, and `share()`. Duplex includes a lightweight single browser-save interface; it is not SugarCube's complete multi-slot Save API.

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

Duplex is not Harlowe or SugarCube 2 and does not implement every macro from either format. It deliberately uses one SugarCube-like syntax in both display modes. Existing projects may need conversion for unsupported macros. Interactive and audio macros follow SugarCube's common syntax, but Duplex uses the browser's native audio engine and does not reproduce SugarCube's save integration or every edge case.

## Rebuild after editing

Requires Node.js 18 or newer:

```sh
node build.mjs
```

The generated `format.js` is the file Twine installs.

## License

MIT.
