# Data-only mods

Duplex supports browser-installed JSON mods containing item definitions, additions to existing passages, and new places (passages) of their own. It does not support JavaScript, CSS, images, archives, downloads, or any executable mod content.

## Manifest schema 1

A manifest requires `schema` (currently `1`), a case-sensitive `id`, nonempty `name` and `version`, and an `items` array. Optional metadata includes `author`, `description`, `forStory`, and `requires.duplex` (for example `">=1.5.0"`). `forStory` must equal the story IFID or name.

Each item requires a local `id` and nonempty `name`. Defaults are `description: ""`, `type: "item"`, `quantity: 1`, `properties: {}`, and `tags: []`. Quantities must be integers from 1 through the inventory stack limit of 1000. See [`examples/more-birds.json`](examples/more-birds.json) for a complete manifest.

IDs allow ASCII letters, numbers, dots, underscores, and hyphens. An item's runtime identity is `mod-id:item-id`; therefore two mods may both define `healing-potion` without a collision. Duplicate IDs within a mod and duplicate installed mod IDs are rejected rather than overwritten.

## Import and use

Players can choose **Mods** in Duplex's left bar or authors can call `Duplex.mods.open()`. The manager imports `.json`/`application/json` files, lists installed metadata and item counts, and enables, disables, or removes mods. Imports are validated atomically and stored per story IFID in IndexedDB. Imported mods are enabled by default and do not award items.

Story JavaScript can also import JSON text or a plain object, then retrieve a protected definition:

```js
await Duplex.mods.import(jsonText);
const definition = Duplex.mods.getItem("neston.more-birds", "nighthawk-feather");
```

Create an independent instance and add it through the existing inventory API:

```js
const item = Duplex.mods.createItem(
  "neston.more-birds",
  "nighthawk-feather",
  { quantity: 1 }
);

Duplex.inventory.addItem(playerBagId, item);
```

`getItem()` and `createItem()` return clones, so changing them cannot alter the installed definition. Disabled mods remain installed but do not serve definitions. Removing a mod removes only its registry and IndexedDB record: existing inventory instances retain their namespaced `id`, `modId`, `definitionId`, name, and properties.

## Security and saves

Schema 1 is JSON data only. Duplex rejects non-JSON values, cycles, non-finite numbers, and dangerous object keys (`__proto__`, `prototype`, and `constructor`) at every depth. The UI displays metadata as text. Manifests cannot name or run functions and are never used to fetch URLs. JavaScript mods are not supported.

Saves include only enabled mod IDs and versions, not definitions. Loading an older save without this metadata remains supported. A missing or different installed version produces a warning but does not reject the save, install a mod, or delete orphaned inventory items.

## Restricted passage extensions

A schema 1 manifest may include `passageExtensions` (mods which omit it, including item-only mods, remain compatible). Each entry has a mod-local identifier, the exact name of a passage already present in the base story, a placement of exactly `before` or `after`, and Duplex markup:

```json
{
  "schema": 1,
  "id": "example.quest-pack",
  "name": "Example Quest Pack",
  "version": "1.0.0",
  "items": [],
  "passageExtensions": [{
    "id": "haunted-house-hook",
    "target": "Town Square",
    "placement": "after",
    "content": "<<if $hauntedHouseStarted>>[[Investigate the old house->Old House]]<</if>>"
  }]
}
```

The target must exist in the base story when the mod is imported; mods cannot introduce a target for another mod. Duplex rejects duplicate or invalid extension IDs, missing targets, and targets tagged `widget`, `grammar`, `script`, or `stylesheet`. It also protects initialization, configuration, UI, and internal passages: `StoryInit`, `StoryTitle`, `StoryCaption`, `StoryMenu`, `StoryLeftBar`, `StoryRightBar`, `StoryInterface`, `StoryDisplayTitle`, `StoryAuthor`, `StorySubtitle`, `StoryShare`, `StorySettings`, `PassageHeader`, and `PassageFooter`.

Enabled extensions are represented internally as non-navigable `DuplexMod:<mod-id>:<extension-id>` passages tagged `mod restricted`. Their content is not copied into the target or save history. History stores only the compiled base-passage output; extension output is reconstructed from the currently enabled manifests when history is rebuilt, loaded, or revisited. Duplex renders all `before` extensions, the unchanged base output, then all `after` extensions. Ordering is installed-mod import order followed by manifest order, and the stored import order is restored between sessions. Disabling or removing a mod removes its virtual passages and its contribution to rebuilt history; enabling it reconstructs them without re-importing.

Restricted mode propagates through every nested `<<include>>`. Quest-oriented `<<if>>`/`<<elseif>>`/`<<else>>`, `<<switch>>`/`<<case>>`/`<<default>>`, `<<print>>`, links, buttons, input controls, includes, and simple `<<set>>` assignments remain available. Their expressions use a limited interpreter—not JavaScript—and support string, number, Boolean, null, and undefined literals; story and temporary variable property reads; parentheses; safe arithmetic, comparisons, and Boolean operators; `tags()`, `hasTag()`, and `.includes()`. Calls to browser globals or arbitrary functions, computed property access, object construction, and assignment expressions are not part of the grammar.

Duplex also sanitizes all restricted output, including raw markup and Markdown output, through an element and attribute allowlist. Event-handler attributes, executable/embedded elements, `javascript:`/`vbscript:` URLs, and non-image or non-base64 `data:` URLs are removed. Duplex blocks `<<script>>`, `<<run>>`, `<<unset>>`, widget definitions and calls, audio-registration/control macros, unsupported expressions, and assignments other than controlled story/temporary variable paths. A blocked macro renders a localized error and is logged with its virtual passage name; unrelated passage rendering continues.

Extensions may use `<<skipsummary>>…<</skipsummary>>`: when a reader skips the passage, the mod's summary is shown after the passage's own. A mod cannot change where a story passage skips to, so `<<skipto>>` and links inside an extension are never used as the passage's skip target. Skip markers are kept as inert `<template>` elements; any other `<template>`, and any attribute other than the marker's own, is still removed. Each extension's output is wrapped in `<div class="duplex-mod-extension" data-mod-extension="DuplexMod:<mod-id>:<extension-id>">` (styled `display:contents`, so layout is unchanged). See [CONTENT-SKIP.md](CONTENT-SKIP.md).

## Mod places (new passages)

A mod can add its own places with a `passages` array, and link to them from its extensions. This is how a quest mod adds new locations without touching the story's own passages. See [`examples/quest-mod.json`](examples/quest-mod.json) for a complete manifest.

### Step 1: Add the places

Each entry needs a `name` and `text`, and may have `tags`:

```json
"passages": [
  { "name": "Old House", "tags": ["skip"], "text": "<<skipto \"Garden\">>The door creaks open. [[Go upstairs->Attic]] [[Leave->Town Square]]" },
  { "name": "Attic", "text": "Dust and old letters. [[Back down->Old House]]" },
  { "name": "Garden", "text": "Overgrown roses. [[Return to town->Town Square]]" }
]
```

* Names must be unique within the mod and may not contain `[`, `]`, `|`, `->` or `<-`.
* Tags may not include `widget`, `grammar`, `script`, `stylesheet`, `mod` or `restricted`. Content tags such as `skip` or `violence` work as usual, so readers can skip mod places too.
* Mod places are restricted exactly like extensions: no `<<script>>`, `<<run>>`, widgets, or JavaScript, and the same HTML sanitizer.

### Step 2: Link to them

Link from an extension on one of the story's passages:

```json
"passageExtensions": [{
  "id": "house-door", "target": "Town Square", "placement": "after",
  "content": "[[Investigate the old house->Old House]]"
}]
```

### How names are resolved

* Inside a mod's own text (its extensions and its places), a link, `<<skipto>>`, `<<include>>`, or control target that names one of **that mod's** places goes there. Any other name means the story's passage, so `[[Leave->Town Square]]` returns to the story.
* The story's own text never sees mod places. A story `[[Old House]]` link does not reach a mod's "Old House", and two mods can both have a place called "Attic".
* Readers see the place's own name as the passage title. Internally it is stored as `DuplexModPassage:<mod-id>:<name>`; `Duplex.mods.passageName("example.quest-pack", "Old House")` returns that name for `Duplex.go()`, `tags()` and `hasTag()`.

### Skipping inside mods

* In a **mod place**, `<<skipto>>` and the first link work exactly as in a story passage, and may point at the mod's places or the story's.
* In an **extension on a story passage**, a mod cannot change where that passage skips to: its `<<skipto>>` and links are not used. Its `<<skipsummary>>` is shown after the passage's own, since the mod's text is skipped along with the passage.

### Saves and disabling

Saves store the place's internal name. If a save is in a mod place and that mod is missing or disabled, loading explains which mod it needs instead of failing silently. If a mod is disabled while a reader is in one of its places, that passage shows which mod it came from.
