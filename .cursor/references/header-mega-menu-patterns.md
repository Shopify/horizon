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

- **Symptom:** Right dropdown links look different from left (no arrow-on-hover, no gold dividers).
- **Cause:** Left often uses `menu_style: featured_collections` (`.mega-menu-featured-collections__link`); right may use `text`, `collection_images`, or `featured_products` (`.mega-menu__column .mega-menu__link` without shared styles).
- **Fix:** Unified nav link styles in `blocks/_header-menu.liquid` for **both**:
  - `.mega-menu-featured-collections__link`
  - `.mega-menu__column .mega-menu__link:not(:has(.mega-menu__link-image))`
- Markup: arrow icon (`icon-megamenu-link-arrow.svg`) in `snippets/mega-menu-list.liquid` for non–collection-image links; same icon class in `snippets/mega-menu-featured-collections.liquid`.
- Hover: gap expands, `font-weight: 700`, arrow fades/slides in (`.mega-menu__link-icon`).
- Dividers: `border-top` on stacked link items — `.mega-menu-featured-collections__links-item + …`, `.mega-menu__list > .mega-menu__column + .mega-menu__column`, and nested child lists inside a column.
- **Layout:** `.mega-menu__list` uses `flex-direction: column` so column blocks stack vertically (same visual rhythm as featured links). Horizontal subgrid left links in a row without dividers.
- Set both split menu blocks to `featured_collections` in `sections/header-group.json` for identical left/right panels.

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

## Scroll-up sticky header reveal

- Sticky-on-scroll-up is controlled in `assets/header.js` (`sticky="scroll-up"`): `data-sticky-state` is `inactive` | `active` | `idle`. `#offscreen` (via IntersectionObserver) gates when scroll direction logic runs.
- **Reveal animation only:** `.header-section` is `position: sticky` only when `[data-sticky-state='active']` (original behaviour — do not stick while scrolling down). On `active`, `#header-component` plays `header-scroll-reveal` (slide from `translateY(-100%)` to `0` over 0.35s, `--ease-out-quad`).
- **Scroll down:** When state returns to `idle`, sticky is removed immediately — no hide transform/transition on the wrapper (avoids jank when the header naturally leaves the viewport).
- **Do not** keep the header section sticky via `data-offscreen` with a persistent `translateY(-100%)` — that fights normal scroll-down and causes glitches.
