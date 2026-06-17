# Media With Content Patterns

## Mobile Section Padding Controls
- `sections/media-with-content.liquid` supports desktop and mobile top/bottom section padding separately.
- Desktop controls remain:
  - `padding-block-start`
  - `padding-block-end`
- Mobile controls:
  - `padding-block-start-mobile` (default `40`)
  - `padding-block-end-mobile` (default `40`)
  - `gap-mobile` (default `10`)

## Rendering Notes
- Keep the section on shared `spacing-style` for desktop behavior.
- Scope mobile override to `.media-with-content.spacing-style` so other sections are unaffected.
- Use section-level CSS variables set inline:
  - `--media-with-content-padding-block-start-mobile`
  - `--media-with-content-padding-block-end-mobile`
  - `--media-with-content-gap-mobile`
