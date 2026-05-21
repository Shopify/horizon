# Header Mega Menu Patterns

- Use a dedicated snippet for complex submenu layouts to avoid branching and regressions in `snippets/mega-menu-list.liquid`.
- For a featured-collections mega menu variant, render two columns:
  - left: stacked submenu links (plus optional CTA below)
  - right: fixed featured collection cards chosen from block settings
- Keep cards merchant-configurable using block-level collection pickers (`featured_collection_1` through `featured_collection_3`) and CTA settings.
- Route layout selection from `blocks/_header-menu.liquid` using `menu_style` so existing submenu modes (`text`, `collection_images`, `featured_products`) remain unchanged.

## Split menu (right column) mega menu position

- **Symptom:** Mega menus opened from `header-menu--split-right` extend off the right edge of the viewport.
- **Cause:** `position: relative` on `.header-menu--split-right` and/or `.header__column--right` makes `.menu-list__submenu` (`width: 90vw; margin-inline: auto`) center within the narrow right link group.
- **Fix:**
  - `header-menu--split-right` and split right `.header__column--right` use `position: static` so the submenu’s containing block is `.header__row` (which is `position: relative`).
  - Override submenu width for split right: `width: 100%; max-width: 100%; margin-inline: 0; left: 0; right: 0` (matches full-bleed behavior of left-side dropdowns).
  - Keep `position: relative` only on `header-menu--split-left`.
- Files: `sections/header.liquid`, `blocks/_header-menu.liquid`.

## Submenu height / first-open clipping

- Open height is driven by JS (`assets/header-menu.js`): `--submenu-height` and `--full-open-header-height` feed `clip-path` on `.menu-list__submenu`.
- Hidden submenus use `content-visibility: auto` and `contain-intrinsic-size: 0px 500px` (`sections/header.liquid`). **Pitfall:** measuring `offsetHeight` once on first open can lock in ~500px before images/fonts layout; the panel bottom looks clipped until a second hover.
- **Fix:** `ResizeObserver` on the submenu + `.menu-list__submenu-inner`, remeasure on image `load`/`error` and `document.fonts.ready`. Measure visible height via `getBoundingClientRect().height`, not `scrollHeight` (inner has `max-height: 80vh`).

## Resource cards in the mega menu

- Collection cards use **default** `resource-card` markup (not `overlay`) so layout stays in the submenu flow and avoids clipping.
- `blocks/_header-menu.liquid` uses **CSS grid**: full-card hit target without an absolutely positioned link; **16px** image radius; collection grids use `minmax(0, 1fr)`.
- **Collection titles** sit **on the image** again: `__media` and `__content` share the same grid cell (`[data-resource-type='collection']`), with `__content` `align-self: end`, `var(--gradient-image-overlay)`, and white title/subtext—no `position: absolute` on the card shell.
