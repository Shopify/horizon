# Marquee Section Patterns

## Block types

The marquee section (`sections/marquee.liquid`) and hero marquee block (`blocks/_marquee.liquid`) support:

- **Text** — optional **Image** setting on each text block; renders image inline before text (`.text-block-with-image`).
- **Image** — full theme image block (use width **Fit** for best marquee sizing).
- **Image** (`_marquee-image`) — lightweight image-only block with optional link; sized via section **Block image height**.
- **Icon** — supports uploaded image via **Image icon** setting.
- **Logo** — theme logo from settings.
- **Divider** — visual separator.

## Image sizing

Section setting **Block image height** (24–120px, default 48) sets `--marquee-block-image-height` on `marquee-component`. Used by:

- `_marquee-image` blocks
- Text blocks with an image
- Full `image` blocks (CSS override in marquee stylesheets)

Images use `object-fit: contain` and `width: auto` so logos/icons keep aspect ratio in the scrolling strip.

## Pitfalls

- Full **Image** blocks default to `width: fill`; marquee CSS overrides to `fit-content` — prefer **Fit** width in block settings if layout looks off.
- Text block images require both **Text** and **Image** filled for the combined layout; image-only items should use **Image** block type instead.
