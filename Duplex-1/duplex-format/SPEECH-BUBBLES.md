# Speech bubbles in Duplex

`<<speech>>` draws a comic-style speech bubble: a rounded box with a thick outline, a character
portrait on one side, the words on the other, and a little tail at the bottom. You can change the
outline, the colors, the portrait shape and which side the speaker is on.

```twee
<<speech "Wynn">>Hey! Over here!<</speech>>
```

## Step 1: Put your portraits next to the story

1. Make a folder called `img` next to your story's `.html` file (or next to your `.twee` files if
   you build with Tweego).
2. Put one square picture per character in it, such as `img/wynn.png`. Square pictures look best,
   since the portrait box is square or round. Bigger pictures are cropped to fit, not stretched.

Web links (`https://…`) work as portraits too.

## Step 2: Save each character once in `StoryInit`

Open (or make) the passage called `StoryInit` and add one `<<speaker>>` line per character:

```twee
:: StoryInit
<<speaker "Wynn" "img/wynn.png">>
<<speaker "Rook" "img/rook.png" circle right lavender name "Rook">>
```

The first word in quotes is the name you will type later. The second is the picture. Anything after
that is a list of options (see Step 4). These options become that character's defaults.

## Step 3: Write dialogue

In any passage:

```twee
<<speech "Wynn">>Did you hear that?<</speech>>
<<speech "Rook">>It came from the attic.<</speech>>
```

The text inside can hold anything a passage can: links, `$variables`, `<<if>>`, grammar macros,
and blank lines for new paragraphs.

## Step 4: Change the look for one line

Add options after the speaker's name. They only change this one bubble:

```twee
<<speech "Wynn" shout pink>>WATCH OUT!<</speech>>
<<speech "Wynn" thought>>I hope they didn't see me...<</speech>>
<<speech "Wynn" "img/wynn-angry.png">>Not funny.<</speech>>
```

A picture after the name swaps the portrait for that bubble only, which is handy for expressions.

### Outline styles

| Option    | Looks like |
|-----------|------------|
| `solid`   | Thick solid line (the default, like the mockup) |
| `dashed`  | Dashed line |
| `dotted`  | Dotted line |
| `double`  | Two thin lines |
| `thought` | Extra-round bubble with little circles for a tail |
| `shout`   | Jagged, spiky burst with a spike for a tail, bold text |
| `whisper` | Thin dashed line, italic, slightly faded text |
| `none`    | No outline, just the fill |

### Colors

Presets: `cyan` (default), `pink`, `lavender`, `mint`, `peach`, `gold`, `white`, and `night`
(a dark bubble with a light outline that sits nicely on Duplex's dark page).

For your own colors, use these with a color in quotes, such as `"#ffb3b3"`, `"rebeccapurple"` or
`"rgb(255, 180, 180)"`:

| Option            | Changes |
|-------------------|---------|
| `fill "color"`    | The inside of the bubble |
| `outline "color"` | The outline and portrait frame (`line` and `ink` work too) |
| `text "color"`    | The words |

### Portrait and layout

| Option          | Does |
|-----------------|------|
| `square`        | Rounded-square portrait (the default) |
| `circle`        | Circular portrait (`round` works too) |
| `small`, `medium`, `large` | Portrait size (`medium` is the default) |
| `left`, `right` | Which side the portrait and tail are on (`left` is the default) |
| `notail`        | No tail |
| `tail`          | Bring the tail back if the speaker's defaults turned it off |
| `noportrait`    | Hide the portrait for this bubble |
| `name "Text"`   | Show a small name label above the words |
| `portrait "file.png"` | Set the picture by option instead of by position |
| `player`        | Use the player's own portrait (see below) |

On phones, portraits shrink automatically so the words still have room.

## Use the player's own portrait

If your story builds a player portrait (like the Astralscapes portrait renderer in Story
JavaScript, `setup.playerPortrait`), use the word `player` instead of a picture:

1. Make sure the portrait renderer script is in your Story JavaScript, as before.
2. In `StoryInit`, save the player as a speaker with `player` in place of the picture:

   ```twee
   <<speaker "You" player circle right lavender>>
   ```

3. Write their lines like anyone else's:

   ```twee
   <<speech "You">>I'm not scared.<</speech>>
   ```

The bubble shows the portrait the player made, including their chosen skin, hair and eye
colors, and a custom chat image if `$p.chatImageCustom` is set. When the player changes their
colors, the bubbles already on screen update too.

How it works: the renderer stores the finished picture in the CSS variable
`--player-chat-portrait`, and player bubbles show whatever that variable holds. If no portrait
has been drawn yet (for example right after loading a save), the first player bubble asks
`setup.playerPortrait.renderCurrent()` to draw it.

You can also use `player` on a single bubble, such as `<<speech player name "You">>…`, and a
picture after the name still swaps it out for one line: `<<speech "You" "img/you-masked.png">>`.

Stories without that renderer can set the player picture themselves:

```twee
<<run Duplex.speakers.setPlayerPortrait("img/player.png")>>
```

The portrait is cropped to a square from the top center. To crop elsewhere, add this to your
Story Stylesheet: `.duplex-speech { --duplex-player-portrait-position: center 20%; }`

## Bubbles without a saved speaker

You don't need `<<speaker>>` at all. Give the picture directly, or nothing:

```twee
<<speech "img/stranger.png" circle night>>Lost, are we?<</speech>>
<<speech fill "#ffe9a0">>A bubble with no portrait.<</speech>>
```

If you type a name that was never saved with `<<speaker>>` (and that doesn't look like a file),
Duplex draws the bubble without a portrait and leaves a warning in the browser console.

## A two-character conversation

```twee
:: StoryInit
<<speaker "Wynn" "img/wynn.png">>
<<speaker "Rook" "img/rook.png" circle right lavender>>

:: Attic Door
<<speech "Wynn">>You go first.<</speech>>
<<speech "Rook">>Absolutely not.<</speech>>
<<speech "Wynn" thought>>Coward.<</speech>>
[[Open the door]]
```

Wynn's bubbles sit on the left and Rook's on the right, like a chat.

## Restyle everything with CSS (optional)

Each bubble uses CSS custom properties, so a story stylesheet can change any preset:

```css
.duplex-speech { --duplex-speech-line: 3px; --duplex-speech-portrait: 6rem; }
.duplex-speech--cyan { --duplex-speech-fill: #b8f2ff; }
```

Other properties: `--duplex-speech-fill`, `--duplex-speech-ink`, `--duplex-speech-text`,
`--duplex-speech-radius`, and `--duplex-speech-halo` (the faint glow that keeps a dark outline
visible on the dark page; set it to `transparent` to remove it).

## JavaScript

```js
Duplex.speakers.define('Moth', '"img/moth.png" night whisper'); // same options as <<speaker>>
Duplex.speakers.get('Moth');   // { image: 'img/moth.png', color: 'night', outline: 'whisper' }
Duplex.speakers.has('Moth');   // true
Duplex.speakers.names();       // ['Wynn', 'Rook', 'Moth']
Duplex.speakers.remove('Moth');
Duplex.speakers.setPlayerPortrait('img/player.png'); // picture for `player` bubbles; null clears it
```

## Notes

- If your story already has its own widget called `speech` or `speaker`, your widget keeps
  working: story widgets always win over these built-in macros.
- Mods can use `<<speech>>` with saved speakers and the preset options, but custom colors
  (`fill`, `outline`, `text`) are removed in mods, and mods can't define new speakers.
