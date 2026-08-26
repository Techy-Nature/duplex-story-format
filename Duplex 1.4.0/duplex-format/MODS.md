# Data-only mods

Duplex 1.5.0 supports browser-installed JSON mods containing item definitions. It does not support JavaScript, CSS, passages, images, archives, downloads, or any executable mod content.

## Manifest schema 1

A manifest requires `schema` (currently `1`), a case-sensitive `id`, nonempty `name` and `version`, and an `items` array. Optional metadata includes `author`, `description`, `forStory`, and `requires.duplex` (for example `">=1.5.0"`). `forStory` must equal the story IFID or name.

Each item requires a local `id` and nonempty `name`. Defaults are `description: ""`, `type: "item"`, `quantity: 1`, `properties: {}`, and `tags: []`. Quantities must be from 1 through the inventory stack limit of 1000. See [`examples/more-birds.json`](examples/more-birds.json) for a complete manifest.

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
