# Row layout + `mobile-column` (e.g. multicolumn section)

Under 750px, `vertical_on_mobile` adds `mobile-column` so `layout-panel-flex--row` uses `flex-flow: column`.

**Multicolumn tablet breakpoint (1001px):** Section setting `stack_columns_until_1001` (default on in the multicolumn preset) adds `mobile-column--until-1001` on `.section-content-wrapper`. Requires `vertical_on_mobile`. Stack/layout fixes run at `max-width: 1001px` in `assets/base.css`; desktop row layout returns at `min-width: 1002px` (the global `min-width: 750px` `flex-direction` rule excludes this class until 1002px).

**Pitfall:** Row rules still give `.group-block--width-fill` `flex: 1`. In a column flex container the main axis is vertical, so each column gets equal flex growth, `height: 100%` on the panel clips the flow, and content can overflow over the next section.

**Fix:** In `assets/base.css` (max-width 749px for `.mobile-column`, max-width 1001px for `.mobile-column--until-1001`), for `.layout-panel-flex--row.mobile-column` / `.mobile-column--until-1001`: set `height: auto` on the panel; reset width-fill/custom direct children to `flex: 0 1 auto; width: 100%`; set nested `.group-block-content` to `height: auto; min-height: 0`.

## Multicolumn heading / description min height

- Section settings in `sections/section.liquid` (Multicolumn header): `heading_min_height` and `description_min_height` (0–400px, step 4).
- CSS variables on `.section-content-wrapper` in `snippets/section.liquid`; min-heights apply at `min-width: 750px` (default) or `min-width: 1002px` when `mobile-column--until-1001` is set:
  - `.text-block:nth-child(2)` → `--multicolumn-heading-min-height` (heading)
  - `.text-block:nth-child(3)` → `--multicolumn-description-min-height` (description)
- **Do not** use `:first-of-type` / `:last-of-type` on `.text-block` — headings are often `div`, descriptions use `rte-formatter`, so type-based pseudo-classes target the wrong blocks.
- Assumes each column’s `group-block-content` child order is: image, heading, description, button.

## Image block hover (multicolumn columns)

- `blocks/image.liquid` setting **Image on hover** (`image_on_hover`): cross-fades on hover (`--image-block-hover-duration: 0.6s` on `.image-block__media--has-hover`). **Pitfall:** do not set `--image-block-hover-image-opacity` on `.image-block__media--has-hover` and also on parent hover—the child definition shadows the parent. Use direct `opacity` on `.image-block__image--hover` / `--primary` instead.

## Image with text: multiple images in one column

- **Use case:** Row section (e.g. Image with text preset) with 2+ **image** blocks and a **group** block (text), images contiguous at the start or end of block order.
- **Auto layout** in `snippets/section.liquid`: CSS `:has()` on row sections where first two children are `.image-block` and last is `.group-block` (or group first, images last). Liquid adds `section-content-wrapper--stacked-images` when `block.id` contains `__image_` / `__group_` (sections with `"type": "@theme"` often report `block.type` as `@theme`, not `image`).
- **Desktop:** CSS grid `1fr 1fr` at `min-width: 750px`. `mobile-column` only stacks below 750px — do not use `:not(.mobile-column)` on desktop grid rules.
- **Mobile / stacked breakpoints:** Default `vertical_on_mobile` already stacks blocks in DOM order (images then text, or text then images).
- **Does not apply:** Mixed order (e.g. image → group → image), or fewer than two images.
- **Block order examples:** `image, image, group` or `group, image, image` (see `page.wellbeing.json` Scent Scientists section).
- **Three images** (`image, image, image, group` or `group, image, image, image`): 4-column grid at `min-width: 750px` — top row two images side by side, second row third image spans both image columns; text/group spans the other half (`section-content-wrapper--stacked-images-trio`). Class `section-content-wrapper--stacked-images-trio` when Liquid counts three image blocks.
