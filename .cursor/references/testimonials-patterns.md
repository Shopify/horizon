# Testimonials Section Patterns

## CTA link (replaces read more)

Each testimonial block supports an optional external CTA instead of expandable quote text:

- **Quote** — short quote shown on the card (`quote_short`)
- **Button label** — CTA text (default: "Read full testimonial")
- **Button link** — URL; CTA renders only when this is set
- **Open link in new tab** — default `true` for external destinations

The CTA uses the same visual treatment as the former read-more control: `show-more__button button-unstyled button-unstyled--with-icon` plus arrow icon (`.testimonials-card__cta-link`).

Removed: `quote_full` richtext and `show-more-component` expand/collapse.
