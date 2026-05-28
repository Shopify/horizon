# Header Mega Menu Patterns

- Use a dedicated snippet for complex submenu layouts to avoid branching and regressions in `snippets/mega-menu-list.liquid`.
- For a featured-collections mega menu variant, render two columns:
  - left: stacked submenu links (plus optional CTA below)
  - right: featured collection cards from the **parent link's page metafield**
- Route layout selection from `blocks/_header-menu.liquid` using `menu_style` so existing submenu modes (`text`, `collection_images`, `featured_products`) remain unchanged.

## Featured cards (page metafields)

When **Media type** is **Featured collections**, cards in `snippets/mega-menu-featured-collections.liquid` come from the top-level menu link's destination page — not header block settings.

| Source | Key |
|--------|-----|
| Page metafield | `custom.megamenu_featured_collections` (list of collection references) |
| Page metafield | `custom.megamenu_featured_pages` (list of page references) |
| Page metafield on each page item | `custom.megamenu_image` (single image, optional override) |

```liquid
assign parent_page = parent_link.object
assign featured_collections = parent_page.metafields.custom.megamenu_featured_collections.value
assign featured_pages = parent_page.metafields.custom.megamenu_featured_pages.value
# render up to 3 total cards (collections first, then pages)
```

**Setup:**

1. Create page metafield definitions:
   - namespace `custom`, key `megamenu_featured_collections`, type **List of collections**
   - namespace `custom`, key `megamenu_featured_pages`, type **List of pages**
2. (Optional) On pages referenced by `megamenu_featured_pages`, set `custom.megamenu_image` to control the card image.
3. On each landing page (e.g. The Land), add the collections/pages to show in that page's megamenu dropdown.
4. The main nav item must link to that page (`page_link` type).
5. Header menu block → **Media type** = **Featured collections**. CTA label/link still come from the menu block settings.

**Pitfall:** If the nav item is not a page link, or both metafields are empty, the dropdown shows submenu links only (no cards).

## Split header menu brackets (center logo)

- When `logo_position: center` and `menu_position: split`, render `snippets/header-menu-bracket.liquid` **before** left menu and **after** right menu.
- Gold frame tokens (`--cala-frame-color`, `--cala-frame-radius` in `assets/base.css`), same as `.header__logo-line` and hero scroll frame. Horizontal stroke aligned with center logo lines (`border-top` + `margin-top: calc(block / -2)`).
- Outer vertical strokes sit at `--page-margin` (header row `section--full-width-margin`); hero scroll frame uses `--cala-frame-gutter-inline` so lines connect on the homepage.
- Curve opens **upward**: left uses `border-left` + `border-top` + `border-start-start-radius`; right uses `border-right` + `border-top` + `border-start-end-radius`.
- **Visible only** on homepage (`data-page-type="index"` on `#header-component`) and when scrolled to top (`data-scroll-direction="none"` from `assets/header.js`).
- Desktop only (`min-width: 990px`).

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
- **`--submenu-offset`** on `.menu-list` controls the gap between the header bottom and the megamenu panel when open. Keep at **`0px`** for a flush fit; `var(--padding-md)` pushes the dropdown too far down.
- Hidden submenus use `content-visibility: auto` without a fixed `contain-intrinsic-size` (a fixed 500px intrinsic size caused first-open clipping).
- **Fix:** `ResizeObserver` on submenu, inner, and `.mega-menu-featured-collections`; remeasure on image `load`/`error`, `document.fonts.ready`, and delayed passes; measure `scrollHeight` / featured panel height, not stale `offsetHeight`.
- **Do not** disable `clip-path` for featured collections without replacing the reveal system — dropdowns will not show.

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
