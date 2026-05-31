# Testimonials Section Patterns

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
