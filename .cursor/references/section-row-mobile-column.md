# Row layout + `mobile-column` (e.g. multicolumn section)

Under 750px, `vertical_on_mobile` adds `mobile-column` so `layout-panel-flex--row` uses `flex-flow: column`.

**Pitfall:** Row rules still give `.group-block--width-fill` `flex: 1`. In a column flex container the main axis is vertical, so each column gets equal flex growth, `height: 100%` on the panel clips the flow, and content can overflow over the next section.

**Fix:** In `assets/base.css` (max-width 749px), for `.layout-panel-flex--row.mobile-column`: set `height: auto` on the panel; reset width-fill/custom direct children to `flex: 0 1 auto; width: 100%`; set nested `.group-block-content` to `height: auto; min-height: 0`.

## Image block hover (multicolumn columns)

- `blocks/image.liquid` setting **Image on hover** (`image_on_hover`): cross-fades on hover (`--image-block-hover-duration: 0.6s` on `.image-block__media--has-hover`). **Pitfall:** do not set `--image-block-hover-image-opacity` on `.image-block__media--has-hover` and also on parent hover—the child definition shadows the parent. Use direct `opacity` on `.image-block__image--hover` / `--primary` instead.
