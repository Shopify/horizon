# Product Recommendations Patterns

## Heading and Intro Alignment

- To center recommendation headlines and supporting text, target the wrapper:
  - `.section-resource-list__content` in section implementations
  - `.block-resource-list .section-resource-list__content` in block implementations
- Keep heading and paragraph elements centered with:
  - `:is(h1, h2, h3, h4, h5, h6, p) { text-align: center; }`

## Scope Guidance

- Apply alignment rules in both:
  - `sections/product-recommendations.liquid`
  - `blocks/product-recommendations.liquid`
- This ensures consistent output when recommendations are rendered as either a standalone section or an embedded product-details block.

## Carousel Arrow Vertical Alignment

- Featured collection (`sections/product-list.liquid`) and product recommendations use `snippets/resource-list-carousel.liquid` with `.resource-list__carousel--no-peek`.
- Arrows must sit at the vertical center of the **product image**, not the full card (title/price/button below the image).
- In `assets/base.css`:
  - Set `anchor-name: --resource-list-card-gallery` on `.card-gallery > :is(a, slideshow-component)` inside `.resource-list__slide` (image wrapper only, not the full gallery that includes badges/quick-add).
  - Use `anchor-scope` on `slideshow-component.resource-list__carousel`.
  - With `@supports (top: anchor(top))`, size `slideshow-arrows` to `top: anchor(--resource-list-card-gallery top)` and `height: anchor-size(height)` so `.slideshow-control { top: 50% }` centers on the image.
- `--gallery-aspect-ratio-value` on `snippets/card-gallery.liquid` is for future calc fallbacks; anchor positioning is the primary approach.

## Carousel arrow hover

- Featured collection / product-list carousels style arrows as primary buttons in `assets/base.css` (`.resource-list__carousel slideshow-arrows .slideshow-control--shape-none`).
- Hover uses the same bottom-up color fill as primary CTAs (`::before` + `--color-primary-button-hover-background` / `--color-primary-button-hover-text`). SVG arrows inherit hover color via `currentColor`.
- Shared with featured blog arrows — extend the `:is(...)` block in `base.css` rather than duplicating per section.
