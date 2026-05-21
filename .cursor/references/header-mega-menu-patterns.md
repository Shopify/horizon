# Header Mega Menu Patterns

- Use a dedicated snippet for complex submenu layouts to avoid branching and regressions in `snippets/mega-menu-list.liquid`.
- For a featured-collections mega menu variant, render two columns:
  - left: stacked submenu links (plus optional CTA below)
  - right: fixed featured collection cards chosen from block settings
- Route layout selection from `blocks/_header-menu.liquid` using `menu_style` so existing submenu modes (`text`, `collection_images`, `featured_products`) remain unchanged.

## Per-dropdown featured collections (split or single menu)

- Add child blocks under each header menu block (`header-menu-left`, `header-menu-right`, or `header-menu`) in the theme editor.
- Block type: **`_header-menu-mega-menu`** (“Mega menu dropdown”).
- Match a top-level menu item by **handle** (preferred) or **exact menu title**.
- Each block sets up to 3 featured collections, optional CTA, and optional image ratio override.
- Parent menu block **Media type** must be **Featured collections** for all dropdowns in that menu half.
- Parent “Default featured collection 1–3” settings are fallbacks when no child block matches or a picker is left empty.

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
- Hidden submenus use `content-visibility: auto` and `contain-intrinsic-size: 0px 500px` (`sections/header.liquid`). **Pitfall:** measuring `offsetHeight` once on first open can lock in ~500px before images/fonts layout; the panel bottom looks clipped until a second hover.
- **Fix:** `ResizeObserver` on the submenu + `.menu-list__submenu-inner`, remeasure on image `load`/`error` and `document.fonts.ready`. Measure visible height via `getBoundingClientRect().height`, not `scrollHeight` (inner has `max-height: 80vh`).

## Resource cards in the mega menu

- Collection cards use **default** `resource-card` markup (not `overlay`) so layout stays in the submenu flow and avoids clipping.
- `blocks/_header-menu.liquid` uses **CSS grid**: full-card hit target without an absolutely positioned link; **16px** image radius; collection grids use `minmax(0, 1fr)`.
- **Collection titles** sit **on the image** again: `__media` and `__content` share the same grid cell (`[data-resource-type='collection']`), with `__content` `align-self: end`, `var(--gradient-image-overlay)`, and white title/subtext—no `position: absolute` on the card shell.
