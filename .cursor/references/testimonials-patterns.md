# Testimonials Section Patterns

## Product testimonials variant (metafield-driven)

`sections/product-testimonials.liquid` is a copy of the testimonials section that pulls slides from the product metafield `custom.product_testimonials` (a **list of testimonial metaobjects**) instead of section blocks. Metaobject fields per slide: `quote` (rendered via `metafield_tag`), `link` (URL), `image` (file), `author`, `title` — access values with `.value`. Section settings are the same, plus section-level `cta_label` and `open_in_new_tab` (these were per-block in the original; the metaobject has no label field). The section renders nothing when the metafield is empty, is restricted to product templates via `enabled_on`, and defines its own custom element class but reuses the `testimonials-swiper` tag name (guarded with `customElements.get`) and the same CSS class names.

## Color scheme

The section uses the theme **Color scheme** setting (`color_scheme`, default **scheme-cfa9c273-456f-45a2-b18d-d73976dc71f5** — dark green `#31331e` background, white text, gold accent buttons). Background and text come from the selected scheme via `color-{{ section.settings.color_scheme }}` on `.section-background` and the section element — do not hardcode section background or foreground colors.

Scheme-aware styling in `sections/testimonials.liquid`:

- Text: `var(--color-foreground)`, `var(--color-foreground-muted)`
- Author divider: `rgb(var(--color-foreground-rgb) / var(--opacity-10-25))`
- Quote mark SVG: `fill="currentColor"` with muted foreground opacity on `.testimonials-card__quote-mark`
- Media frame accent: `var(--color-primary-button-background)`
- Nav buttons: already use `--color-primary-button-background` / `--color-primary-button-text`

Merchants can switch to a dark scheme (e.g. a custom scheme with `#31331d` background) in the theme editor without code changes.

## CTA link (replaces read more)

Each testimonial block supports an optional external CTA instead of expandable quote text:

- **Quote** — short quote shown on the card (`quote_short`)
- **Button label** — CTA text (default: "Read full testimonial")
- **Button link** — URL; CTA renders only when this is set
- **Open link in new tab** — default `true` for external destinations

The CTA uses the same visual treatment as the former read-more control: `show-more__button button-unstyled button-unstyled--with-icon` plus arrow icon (`.testimonials-card__cta-link`).

Removed: `quote_full` richtext and `show-more-component` expand/collapse.

## Section heading

Optional **Heading** section setting (default: "Kind Words. Poured Generously"). Renders once as an `h3` in `.testimonials-swiper__header` **before** `.testimonials-swiper__viewport` (not inside slides). Aligned with the quote column on desktop (same `1fr 1.2fr` grid as `.testimonials-card`). Hidden when blank.

## Mobile carousel

Slides must not expand past the viewport width. Use `min-width: 0` on `.testimonials-swiper__slide` and `.testimonials-card` so flex children can shrink below content intrinsic width. Viewport needs `width: 100%` and `overflow: hidden`. Do not place the section heading inside slides — it duplicates markup and can break slide widths.

## Image sizing

Testimonial images use a fixed **16 / 9** landscape frame (`.testimonials-card__media` with `aspect-ratio: 16 / 9`). Images fill the frame with `object-fit: cover` and `object-position: center`, so every slide shows the same dimensions regardless of source aspect ratio. Same ratio on mobile and desktop.

## Video in media frame

Each testimonial block can optionally use an uploaded Shopify `video` (`block.settings.video`) in the same media slot as the image.

- Render precedence: `video` first, then fallback to `image`.
- Video uses `video_tag` with controls enabled (`autoplay: false`, `loop: false`) and class `.testimonials-card__video`.
- `.testimonials-card__video` uses the same absolute-fill, border-radius, and object-fit styles as `.testimonials-card__image`, so it inherits the exact same shaped frame and inner border treatment from `.testimonials-card__media`.
