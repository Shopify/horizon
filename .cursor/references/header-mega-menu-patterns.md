# Header Mega Menu Patterns

- Use a dedicated snippet for complex submenu layouts to avoid branching and regressions in `snippets/mega-menu-list.liquid`.
- For a featured-collections mega menu variant, render two columns:
  - left: stacked submenu links (plus optional CTA below)
  - right: fixed featured collection cards chosen from block settings
- Keep cards merchant-configurable using block-level collection pickers (`featured_collection_1` through `featured_collection_3`) and CTA settings.
- Route layout selection from `blocks/_header-menu.liquid` using `menu_style` so existing submenu modes (`text`, `collection_images`, `featured_products`) remain unchanged.

## Submenu height / first-open clipping

- Open height is driven by JS (`assets/header-menu.js`): `--submenu-height` and `--full-open-header-height` feed `clip-path` on `.menu-list__submenu`.
- Hidden submenus use `content-visibility: auto` and `contain-intrinsic-size: 0px 500px` (`sections/header.liquid`). **Pitfall:** measuring `offsetHeight` once on first open can lock in ~500px before images/fonts layout; the panel bottom looks clipped until a second hover.
- **Fix:** `ResizeObserver` on the submenu + `.menu-list__submenu-inner`, remeasure on image `load`/`error` and `document.fonts.ready`. Measure visible height via `getBoundingClientRect().height`, not `scrollHeight` (inner has `max-height: 80vh`).

## Resource cards in the mega menu

- Collection cards use **default** `resource-card` markup (not `overlay`) so layout stays in the submenu flow and avoids clipping.
- `blocks/_header-menu.liquid` uses **CSS grid**: full-card hit target without an absolutely positioned link; **16px** image radius; collection grids use `minmax(0, 1fr)`.
- **Collection titles** sit **on the image** again: `__media` and `__content` share the same grid cell (`[data-resource-type='collection']`), with `__content` `align-self: end`, `var(--gradient-image-overlay)`, and white title/subtext—no `position: absolute` on the card shell.
