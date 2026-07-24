# WS10 — PDP Editorial Storytelling (block builder on r-media)

Status: **shipped to branch `ws10-editorial-story`** (2026-07-24). Pilot content pending.

## What this is

An editor-driven collage builder for per-product PDP storytelling — the
magazine-style overlapping layouts from the brand mockups. One section +
three placeable blocks; each product's bespoke arrangement is built in the
theme editor and stored in that product's alternate template. No code per
product unless a design exceeds the controls (then: the custom block).

| Piece | File |
|---|---|
| Stage (dual grid, reveal driver) | `sections/r-editorial-story.liquid` + `assets/r-editorial-story.js` |
| Media item (wraps WS9 r-media) | `blocks/r-story-media.liquid` |
| Text item (fluid type roles) | `blocks/r-story-text.liquid` |
| Escape hatch (custom liquid) | `blocks/r-story-custom.liquid` |
| Placement-style emitter | `snippets/r-story-item-style.liquid` |
| Video hero sibling | `sections/r-video-hero.liquid` |
| FAQ sibling (upstream accordion) | `sections/r-faq.liquid` |
| Template copy-bases | `templates/product.r-story-scaffold.json`, `product.r-story-pilot.json` |

## The model

- **Dual grid.** Editor semantics: 12 columns ≥750px / 6 below, with
  **half-column precision** (range step 0.5 — Shopify range steps must divide
  by 0.1, so 0.25 is rejected by ValidSchema). The stage actually renders a
  quadrupled track grid (`repeat(48, 1fr)` / `repeat(24, 1fr)`);
  `snippets/r-story-item-style.liquid` converts column values to integer
  track lines (track = (col − 1) × 4 + 1), so whole-number arrangements keep
  exact geometry and no CSS calc() is needed. Every block carries two
  placement panels (Desktop layout / Mobile layout): column start/span, row
  start/span (0 = auto flow), z-layer, nudge X/Y (±100px, 2px steps), scale
  (desktop), align, hide-per-viewport. Overlap = overlapping row/col ranges +
  z-index.
- **Inline custom props.** Liquid cannot run inside `{% stylesheet %}`, so
  placement travels as `--r-si-*` vars on each item
  (`snippets/r-story-item-style.liquid`); the section stylesheet maps them
  once, Liquid-free. Nudge/scale ride `transform`; the reveal owns the
  individual `translate` property — they never conflict.
- **Fluidity.** Type roles (eyebrow/headline/body/pullquote/caption) map to
  `--r-story-type-*` clamp() tokens on the stage; gaps clamp too. The only
  discrete jump is the 750px grid re-placement.
- **Motion.** Media effects (fade-rise, blur-up, parallax w/ per-block depth,
  ken-burns) are r-media's (WS9) — the media block just builds the `effect`
  string. Text/custom reveals are driven by `<r-editorial-story>` under the
  same contract: hidden states require `data-r-armed` + motion-OK; end-state
  keys off `data-r-visible` alone; morph-safe via `updatedCallback`.
- **Content.** Everything is editor-editable (image_picker/richtext per
  block); images live on the Shopify CDN. Empty media renders a placeholder
  so arrangements are visible before content lands.

## Per-product recipe

1. Copy `templates/product.r-story-scaffold.json` →
   `templates/product.r-{handle}.json`.
2. Seed it once (templates are merchant-owned, excluded from `push -e staging`):
   `shopify theme push --theme <ID> --only "templates/product.r-{handle}.json"`
3. Admin → Product → **Theme template** → pick `r-{handle}`.
4. Build the arrangement in the theme editor: place blocks, set both grids,
   layers, effects; pick images/video; write copy.
5. Preview both breakpoints (`?view=r-{handle}` forces the template on any
   product URL before assignment — handy on `shopify theme dev`).

After seeding, the **editor owns the template state**; the repo copy is only
a bootstrap. Section/block/asset code keeps shipping normally on deploy.

## Verification notes (what was checked, 2026-07-24)

- theme-check: 0 errors (32 pre-existing warnings elsewhere; the
  ValidSchemaTranslations noise is a known false positive).
- Live on `theme dev` via `?view=r-story-pilot` (mobile 400px viewport):
  section order video_hero → main → story → faq → recommendations; stack
  order + `2/span 5` offset portrait; placeholder aspect crop exact (4/5);
  reveals armed and firing with delays; FAQ accordion; scheme-3 stage;
  sticky ATC coexists. No console errors.
- Desktop grid: placement vars + media-query mapping verified in rendered
  HTML/CSS (same code path as the proven mobile side); do a visual pass in a
  ≥750px window when building the pilot.

## Gotchas

- Block schema names cap at **25 chars** (hit once: "Story custom liquid").
- `theme dev` hot-sync can upload the section before its blocks on first
  creation → transient "undefined block type". Touch blocks, then section,
  then templates to re-sync in order.
- Keep `r-story-*` blocks preset-less: they're only meaningful inside the
  stage; presets would surface them in every section's @theme picker.
- Section presets/templates referencing the story must spell out block
  settings — presets only apply when adding via the editor.
- Don't rebuild media handling or accordions: r-media (WS9) and the upstream
  `accordion` block are the substrate.
- **Editor + `theme dev` concurrency.** Editing the development theme in the
  admin editor while `shopify theme dev` re-uploads files can poison the
  editor session: its `previewPath` picks up a serialized click event
  (`?_reactName=onClick&…`) and every preview reload then fails with "page is
  not compatible with the editor / redirecting to an unsupported URL". Fix:
  reopen the editor with a clean URL (unsaved edits recover via the "Restore
  last session" banner). Prevent: pause `theme dev` during editor sessions,
  or run `shopify theme dev --theme-editor-sync` — which also pulls editor
  arrangements back into the local JSON instead of clobbering them on the
  next local file touch.
