# Section Swiper Patterns

## Ingredient-style carousel with next-image preview

- For section-based carousels where each slide is a block, render blocks directly in the section with a `data-slide` wrapper. Stack slides in a single grid cell on `data-track` for crossfade transitions (no horizontal translate).
- To show a faded preview of the next slide image, compute the next block in Liquid:
  - `next_index = forloop.index0 + 1`
  - wrap to `0` when `next_index >= section.blocks.size`
  - render `next_block.settings.image` in a third visual column with low opacity.
- Keep the preview image `aria-hidden="true"` so assistive tech does not announce duplicate media.
- For theme editor behavior, listen to `shopify:block:select` and jump to the selected slide index.
- **Ingredients section (`sections/ingredients.liquid`)**: DOM order is viewport, then prev, then next (focus-friendly). **Desktop (750px+):** grid `auto 1fr auto` places arrows left and right of the viewport. **Mobile (≤749px):** same DOM, grid overrides put the viewport full width on row 1 and both arrows on row 2 below. **Slide:** DOM is text → main image → next preview (`aria-hidden`). Desktop `.ingredients__content` is three columns (text | image | preview). **≤989px:** one column; `grid-row` places image above text; preview hidden.
- **Ingredients transition:** crossfade only (`opacity`, 850ms via `--ingredients-fade-duration`). Slides use `is-active` / `is-leaving` / `is-entering` + `--run` after double `rAF`. No slide or zoom on images.
- **Ingredients CTA:** optional primary button via section settings `button_label` + `button_link`. Renders in `.ingredients__cta-wrap` below `</ingredients-swiper>` (after carousel arrows on mobile), centered with `text-align: center`. Hidden when either setting is blank.
