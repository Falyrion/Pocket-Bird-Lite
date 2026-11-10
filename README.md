# Pocket Bird Lite

A stripped-down library version of [Pocket Bird](https://github.com/IdreesInc/Pocket-Bird) by Idrees Hassan: a pixel-art pet bird that flies around the page, lands on elements and can be pet.

This fork is meant as a bare minimum plugin to be used in web projects, specifically Vue. It only keeps:

- The bird flying around and landing on elements
- The petting animation (move the cursor back and forth over the bird)
- Choosing the bird species and hat via hardcoded values

Everything else from the original (menu, field guide, feathers, wardrobe, sticky notes, sound, saving, browser extension / userscript / Obsidian builds) has been removed.

## Configuration

Edit [src/config.ts](src/config.ts), then rebuild with `npm run build`:

```ts
export const SPECIES: SpeciesId = "bluebird";   // see src/species.ts
export const HAT: HatId = "none";              // see src/hats.ts
export const LANDING_SELECTORS: readonly string[] = ["img", "video"];
export const TEXT_LANDING_SELECTORS: readonly string[] = ["h1", "h2", "h3", "p"];
export const LANDING_TOP_MARGIN = 80;
export const LANDING_MIN_WIDTH = 100;
export const SCALE = 2;
```

Every value can also be overridden per instance: `createPocketBird({ species: "blueJay", hat: "top-hat" })`. Species and hat ids are typed, so a typo is a compile error.

### Where the bird lands

When idle, the bird picks a random element that matches either selector list and is fully visible in the window (at least `LANDING_TOP_MARGIN` below the top, at least `LANDING_MIN_WIDTH` wide, not hidden or nearly transparent).

- `LANDING_SELECTORS`: the bird stands on the element's top edge, anywhere across its width. Use this for images, videos, cards and other boxes.
- `TEXT_LANDING_SELECTORS`: the bird stands on the first line of text, only across the width of the words. Use this for headings and paragraphs, which are usually much wider than their text. The minimum width applies to that first line, so very short text is skipped.

If an element matches both lists, it is treated as text. When the element is removed or hidden (e.g. on a route change), the bird flies somewhere else.

On tufted species (Tufted Titmouse, Red Cardinal, Blue Jay, Steller's Jay) a hat replaces the tuft.

## Usage in Vue

The package is written in TypeScript and ships compiled JavaScript plus type declarations from `dist/`. `dist/` is not committed; it is built by `npm run build`, which also runs automatically on `npm install` in this repo and when installing from a git URL.

Install it into the Vue project, from a local folder or a git URL. A local folder install is a symlink, so build here first and rebuild after changes:

```bash
npm run build
```

```bash
npm install ../Pocket-Bird-Lite
```

Then add a renderless component and mount it once, e.g. in `App.vue`:

```vue
<!-- PocketBird.vue -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { createPocketBird, type PocketBird } from "pocket-bird-lite";

let bird: PocketBird | undefined;
onMounted(() => {
	bird = createPocketBird();
});
onBeforeUnmount(() => {
	bird?.destroy();
});
</script>

<template></template>
```

The bird attaches its own container to `<body>` (inside a shadow root, so its styles don't leak), so it doesn't matter where the component sits in the tree. Importing the package has no side effects; with Nuxt, render the component client-only.

### Options and runtime changes

`createPocketBird(options)` accepts every value from `config.ts`; anything left out uses the value from `config.ts` (as of the last build):

```ts
createPocketBird({
	species: "blueJay",
	hat: "top-hat",
	scale: 2,
	landingSelectors: ["img", "video", ".card"],
	textLandingSelectors: ["h1", "h2", "p"],
	landingTopMargin: 120,
	landingMinWidth: 60,
});
```

The returned bird has:

- `update(options)`: change any subset of the options on the running bird. Species, hat and scale change immediately without the bird moving; landing options apply the next time it picks somewhere to land. Unknown species or hat ids are ignored with a console warning.
- `getOptions()`: the settings currently in effect, including the defaults from `config.ts`.
- `destroy()`: remove the bird. Calling `update()` afterwards does nothing.

With reactive values in Vue:

```ts
import { ref, watch } from "vue";
import type { HatId } from "pocket-bird-lite";

const hat = ref<HatId>("none");
watch(hat, (value) => bird?.update({ hat: value }));
```

## Development

```bash
npm install
```

```bash
npm run build     # compile src/ to dist/
```

```bash
npm run demo      # demo page; the pickers call update() on the running bird (runs from src/, no build needed)
```

```bash
npm run check     # type-check src/ and scripts/
```

```bash
npm run sprites   # regenerate src/sprites.generated.ts after editing sprites/*.png or src/species.ts
```

The sprite script runs as TypeScript directly in Node (22.18+).

Sprite sources are in `aseprite/`, exported PNGs in `sprites/`.

## Layout

```
src/
  index.ts              createPocketBird(options) → { destroy }
  config.ts             hardcoded defaults
  behavior.ts           idle / hop / fly state machine, landing, petting
  bird.ts               canvas, frames, animations
  hats.ts               hat ids and hat layers
  species.ts            species ids → palette index + tags
  sprites.ts            decodes the generated sprite data
  sprites.generated.ts  generated by scripts/generate-sprites.ts
  styles.ts             CSS for the shadow root
  util.ts
  animation/            Anim, Frame, Layer
scripts/generate-sprites.ts
sprites/                birb.png, hats.png, species.png
demo/index.html
dist/                   build output (not committed)
```

## License

[Mozilla Public License 2.0](LICENSE), same as the original project.
