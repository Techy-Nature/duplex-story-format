# Content tags and skipping (Duplex 1.7.0)

Duplex can warn readers about passages with sensitive content and let them skip those passages, either one at a time with a **Skip** button or automatically for whole categories they choose in **Settings**.

Skipping hides a passage's text. It does **not** stop the passage from running, so every `<<set>>`, inventory change, and other effect still happens. Your story's variables stay consistent whether or not the reader skipped.

---

## Step 1: Tag the passage

In Twine, open the passage and add one or more content tags. The built-in content tags are:

| Tag | Shown to readers as |
| --- | --- |
| `skip` | Skippable scene |
| `sex` | Sexual content |
| `violence` | Violence |
| `gore` | Gore |
| `abuse` | Abuse |
| `self-harm` | Self-harm |
| `drugs` | Drug use |
| `death` | Death |

Tag matching ignores capital letters, so `Violence` and `violence` are the same tag. Use `skip` for a scene that is optional for any reason (a long recap, a flashback, a side conversation).

When the reader reaches a tagged passage, a notice appears under the passage title:

> Content: **Violence, Gore** &nbsp;&nbsp; [Skip]

## Step 2: Choose where Skip goes

Skip needs a passage to jump to. Duplex picks it in this order:

1. The passage named by `<<skipto>>`, if the passage has one.
2. The first link in the passage that leads somewhere else.

If neither exists, the Skip button is shown but disabled.

```twine
:: The Ambush [violence gore]
<<skipto "Clearing">>
The shades tear at you. Steel flashes.

[[Fight back->Clearing]]
[[Flee->Riverbank]]
```

`<<skipto>>` prints nothing. It accepts a quoted name or an expression, such as `<<skipto $nextScene>>`.

## Step 3 (optional): Add a summary for readers who skip

When a passage is skipped automatically, the reader sees a short placeholder instead of the passage. Add `<<skipsummary>>` so they don't lose the plot:

```twine
:: The Ambush [violence]
<<skipsummary>>You drive off the shades, but you are wounded.<</skipsummary>>
<<set $health -= 2>>
The shades tear at you. Steel flashes.

[[Run onward->Clearing]]
```

The summary is invisible while the passage is shown normally. It may contain links and variables.

## Step 4: What the reader sees

**Settings → Content** lists every content tag that your story actually uses, each with a checkbox. Checked tags are skipped automatically. The choice is saved in the reader's browser, separately for each story, and takes effect straight away.

For an automatically skipped passage, the reader sees:

> Skipped a passage tagged **Violence**.
> *You drive off the shades, but you are wounded.*
> [Continue] [Show anyway]

* **Continue** goes to the skip target.
* **Show anyway** reveals the passage. Duplex remembers this for that visit, including after Back and in saves.

Readers can also press **Shift+S** to skip the current tagged passage. They can change that key in Settings like any other shortcut.

## Step 5 (optional): Configure it in Story JavaScript

Every setting lives on `Config.skip`. Change only what you need:

```js
// Add your own content tags and their reader-facing names.
Config.skip.tags.push('spiders', 'body-horror');
Config.skip.labels.spiders = 'Spiders';
Config.skip.labels['body-horror'] = 'Body horror';

// Skip these tags automatically until the reader changes the setting.
Config.skip.defaults = ['gore'];

// Hide the notice on passages that are NOT being skipped (the reader still gets Settings and Shift+S).
Config.skip.showNotice = false;

// Jump straight past auto-skipped passages instead of showing the Continue placeholder.
Config.skip.autoAdvance = true;

// List every tag in Config.skip.tags in Settings, even ones the story never uses.
Config.skip.showAllTags = true;
```

The full default object:

```js
Config.skip = {
  tags: ['skip', 'sex', 'violence', 'gore', 'abuse', 'self-harm', 'drugs', 'death'],
  labels: { skip: 'Skippable scene', sex: 'Sexual content', violence: 'Violence', gore: 'Gore',
            abuse: 'Abuse', 'self-harm': 'Self-harm', drugs: 'Drug use', death: 'Death' },
  defaults: [],
  showNotice: true,
  autoAdvance: false,
  showAllTags: false
};
```

## Step 6 (optional): Use it from code

`Duplex.skip` (also `window.Skip`) exposes the feature:

| Call | What it does |
| --- | --- |
| `Duplex.skip.skip()` | Skips the current passage if it has a content tag and a target. Returns `true` if it moved. |
| `Duplex.skip.target(name?)` | The skip target of the current passage, or of the shown passage named `name`. |
| `Duplex.skip.contentTags(name?)` | The content tags on a passage. |
| `Duplex.skip.shouldSkip(name)` | Whether the reader's settings skip that passage. |
| `Duplex.skip.isSkipped(tag)` / `.set(tag, true/false)` | Read or change the reader's choice for one tag. |
| `Duplex.skip.list()` | `[{ tag, label, skipped }]` for the tags shown in Settings. |
| `Duplex.skip.reset()` | Clears the reader's choices back to `Config.skip.defaults`. |

For example, a custom button in `StoryMenu`:

```twine
<<button "Skip this scene">><<run Duplex.skip.skip()>><</button>>
```

## Things to know

* Only the passage the reader navigates to is checked. Content tags on a passage pulled in with `<<include>>` are ignored, so tag the outer passage.
* Passages that run as UI (`StoryInit`, `StoryCaption`, `StoryMenu`, the bars, `StorySettings`) are never skipped.
* `<<skipto>>` and `<<skipsummary>>` are ignored inside mod passage extensions.
* With `autoAdvance`, Duplex follows at most 20 auto-skipped passages in a row, to avoid loops.

## Styling

The notice and placeholder use the dark theme variables. To restyle them, target these classes in Story Stylesheet:

```css
.duplex-content-notice { }             /* the notice bar */
.duplex-content-notice.is-skipped { }  /* the auto-skip placeholder */
.duplex-skip-summary { }               /* the summary inside the placeholder */
.duplex-passage.is-content-skipped { } /* a passage whose text is hidden */
```
