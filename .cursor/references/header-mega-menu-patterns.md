# Header Mega Menu Patterns

- Use a dedicated snippet for complex submenu layouts to avoid branching and regressions in `snippets/mega-menu-list.liquid`.
- For a featured-collections mega menu variant, render two columns:
  - left: stacked submenu links (plus optional CTA below)
  - right: featured collection cards from the **parent link's page metafield**
- Route layout selection from `blocks/_header-menu.liquid` using `menu_style` so existing submenu modes (`text`, `collection_images`, `featured_products`) remain unchanged.

## Featured collection cards (page metafield)

When **Media type** is **Featured collections**, cards in `snippets/mega-menu-featured-collections.liquid` come from the top-level menu link's destination page — not header block settings.

| Source | Key |
|--------|-----|
| Page metafield | `custom.megamenu_featured_collections` (list of collection references) |

```liquid
assign parent_page = parent_link.object
assign featured = parent_page.metafields.custom.megamenu_featured_collections.value
for collection in featured
  render resource-card ...
endfor
```

**Setup:**

1. Create page metafield definition: namespace `custom`, key `megamenu_featured_collections`, type **List of collections**.
2. On each landing page (e.g. The Land), add the collections to show in that page's megamenu dropdown.
3. The main nav item must link to that page (`page_link` type).
4. Header menu block → **Media type** = **Featured collections**. CTA label/link still come from the menu block settings.

**Pitfall:** If the nav item is not a page link, or the metafield is empty, the dropdown shows submenu links only (no cards).

## Split menu: left vs right styling

- **Symptom:** Right dropdown looks different (wrong layout, off-screen, or `collection_images` instead of featured collections).
- **Causes:**
  1. `header-menu-right` had a different `menu_style` (e.g. `collection_images` vs `featured_collections`).
  2. Submenu width: left used `90vw` centered in a narrow group; right used `100%` of header row after a partial fix.
- **Fix (both sides identical):**
  - Set **both** split menu blocks to `menu_style: featured_collections` and the same `featured_collections_aspect_ratio`.
  - `position: static` on **both** `.header-menu--split-left` and `.header-menu--split-right`.
  - Submenus: `width: 100%; max-width: 100%; left: 0; right: 0; margin-inline: 0` (containing block = `.header__row`).
  - Right `.header__column--right` stays `position: static` so mega menus are not clipped to the right link cluster.
- Files: `sections/header.liquid`, `blocks/_header-menu.liquid`, `sections/header-group.json`.

## Submenu height / first-open clipping

- Open height is driven by JS (`assets/header-menu.js`): `--submenu-height` and `--full-open-header-height` feed `clip-path` on `.menu-list__submenu`.
- **Symptom:** First hover clips the megamenu bottom; second hover or delayed remeasure looks correct.
- **Causes:**
  1. `--submenu-height` / `--full-open-header-height` still `0` on first paint while `clip-path` animates.
  2. `content-visibility: auto` on closed submenus under-reports height if measured before `[data-active]`.
  3. Async remeasure can **shrink** height mid-open before images/layout finish.
- **Fix:**
  - On `activate`, set `[data-active]`, **sync** measure + apply height, then start `ResizeObserver`.
  - Only **grow** height during a single open (`appliedHeight`); use `{ force: true }` when closing or switching items.
  - `#header-component[data-submenu-open]` before animating `clip-path` (default `transition: clip-path 0s` until set).
  - `content-visibility: auto` only on submenus **without** `[data-active]`.
  - Featured collections: measure submenu + inner + panel + cards; temporarily `transform: none` on inner while measuring.
  - Megamenu card images: `image_loading: 'eager'` in `mega-menu-featured-collections.liquid`.
  - Remeasure at 0 / 50 / 150 / 300 / 600ms and on image load.

## Featured collections panel: no scroll, compact cards

- **Symptom:** Mega menu shows a vertical scrollbar; collection cards feel too large.
- **Cause:** `.menu-list__submenu-inner` uses `max-height: calc(80vh - var(--header-height))` and `overflow-y: auto` for all menu types.
- **Fix:** For featured collections only:
  - `.menu-list__submenu-inner:has(.mega-menu-featured-collections)` → `max-height: none; overflow: visible`
  - Tighter submenu padding (`--padding-lg` instead of `--padding-3xl`)
- Cards area uses **60%** of megamenu width (`grid-template-columns: 2fr 3fr`); links use **40%**.
- Cards: full-bleed collection featured image (`collection_thumbnails: 'single'`), title overlaid at bottom with gradient. Aspect ratio from menu block **Image ratio** (default `4 / 5`).
- Other menu styles (collection images, products) keep the scroll cap.

## Resource cards in the mega menu

- Collection cards use **default** `resource-card` markup (not `overlay`) so layout stays in the submenu flow and avoids clipping.
- `blocks/_header-menu.liquid` uses **CSS grid**: full-card hit target without an absolutely positioned link; **16px** image radius; collection grids use `minmax(0, 1fr)`.
- **Collection titles** sit **on the image** again: `__media` and `__content` share the same grid cell (`[data-resource-type='collection']`), with `__content` `align-self: end`, `var(--gradient-image-overlay)`, and white title/subtext—no `position: absolute` on the card shell.
- Use `collection_thumbnails: 'multiple'` when rendering cards; set `.mega-menu .resource-card { opacity: 1; animation: none; }` so fade-in does not leave cards at opacity 0.

## Megamenu link hover arrow

- **Default:** Links left-aligned; arrow icon collapsed (`max-width: 0`, `opacity: 0`) in a flex row so labels share one edge.
- **Hover:** Animate `gap` + arrow `max-width` (~`0.5s`, `cubic-bezier(0.22, 1, 0.36, 1)`); arrow opacity fades in with a short delay so text does not slide over the icon mid-transition.
- **Avoid:** `padding-inline-start` + absolutely positioned arrow — padding and opacity at the same speed causes overlap and a jolt. Do not transition `font-weight`.
