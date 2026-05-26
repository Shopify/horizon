# Product Card Hover Patterns

## Second image on hover

- Global setting: **Theme settings → Product cards → Show second image on hover** (`show_second_image_on_hover`, default `true`).
- `snippets/card-gallery.liquid` binds `on:pointerenter="/previewImage"` and `on:pointerleave="/resetImage"` when the setting is on and the product has more than one media item.
- `assets/product-card.js` advances the card slideshow to the next slide on hover (desktop mouse only).

## Subtle zoom (product cards)

- Product cards use image-level zoom in `snippets/product-card.liquid` (scales `.product-media__image` on hover).
- Zoom duration: `0.65s` with `--ease-out-quad`.
- Uses `--hover-subtle-zoom-amount` (default `1.015` from `:root` in `assets/base.css`).
- Respects `prefers-reduced-motion` and only applies for fine pointers.
- Does not use the global **Card hover effect** setting, so collection/resource cards are unchanged when that is set to **None**.

## Image fit and radius

- All slides in `.product-card .card-gallery` use `object-fit: cover` and `border-radius: var(--product-corner-radius, 16px)` on both the slide and image (first and second image match).
- `card-gallery--hover-fade` (2+ media): stacks first two **non-hidden** slides in a grid locked to `--gallery-aspect-ratio`; CSS crossfade (`0.35s` in, `0.15s` out on mouse leave). No `visibility` toggles (avoids jolt).
- `card-gallery--hover-zoom-only` (single media): subtle zoom on the first image only.
- When only one **visible** slide exists in a multi-media product (variant images hidden), zoom applies to the first visible slide instead of fading.
- Zoom: `scale(1.015)` over `0.65s` on the hovered/active image. JS `previewImage` / `resetImage` only when a variant picker is present.

## Theme editor

To toggle second image: **Theme settings → Product cards → Show second image on hover**.

To change zoom intensity: adjust `--hover-subtle-zoom-amount` in `assets/base.css` or override in `product-card.liquid` stylesheet.

## Multicolumn image block (`blocks/image.liquid`)

When **Image on hover** is set (with a main image), hover fades to the second image and applies the same subtle zoom (`--hover-subtle-zoom-amount`, `0.65s`) on the hover image inside `.image-block__media--has-hover`.

### Image border (block settings)

- **Borders** section: style (none/solid), thickness, opacity, corner radius, **Padding from image** (`image_border_padding`).
- Border wraps `.image-block__frame` (`.border-style` + padding); both primary and hover images sit inside `.image-block__media` so the frame applies to both.
- Inner corner radius: `max(0, border-radius - padding)` via `--image-block-inner-radius`.
