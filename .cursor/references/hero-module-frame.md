# Hero Module Frame Pattern

## Module inset layout (`hero--module-inset`)

Class `hero--module-inset` applies when inset padding, corner radius, or the border toggle is used. Settings are always available in the editor:

- `module_frame_padding` — inset on the inner frame (`--hero-module-padding`)
- `module_frame_radius` — corner radius on `.hero__container`
- `module_frame_border_width` — border thickness (only when border is shown)

`enable_module_frame` adds `hero--module-frame` and shows the gold `::after` border on desktop. Inset padding and radius apply **with or without** the border.

- `hero--module-frame-page` — outer hero padding when `section_width` is `page-width`
- **Content padding:** `content_padding_*` on `.hero__content-wrapper` (desktop only)

## Scroll prompt inner frame (`show_scroll_prompt`)

When **Show scroll prompt** is enabled, add class `hero--scroll-frame` (independent of `enable_module_frame`).

- **Shape:** U-shaped inner border on `.hero__scroll-frame` (dedicated span, not a pseudo — avoids clash with blur `::before`) — left, right, and bottom only (no top).
- **Corners:** `16px` radius on bottom-left and bottom-right (`--hero-scroll-frame-radius`).
- **Color:** `#f4c077`, same as scroll line.
- **Inset:** `calc(var(--cala-frame-gutter-inline) + scroll_frame_inset)` — gutter matches header `section--full-width-margin` / `--page-margin` so vertical strokes align with `.header__menu-bracket` (16px mobile, 40px desktop). Optional `scroll_frame_inset` is an extra adjustment only (default `0`).
- **Center line:** `.hero__scroll-prompt-line` sits above the bottom border at horizontal center (`z-index` above frame) so it meets the bottom stroke in a T junction.
- **Mobile:** Frame hidden below `750px`; scroll prompt keeps default bottom spacing.

## Scroll prompt line animation

- **Draw:** `::before` on `.hero__scroll-prompt-line` scales in from top (`900ms`, `200ms` delay).
- **Pulse:** `::after` is a thicker bar (`3px` × `29px`) on an `88px` track; `0.3s` travel then `0.75s` pause at top with `opacity: 0` (`animation-delay` after draw). Label–line gap `1.25rem`.
- **Reduced motion:** Static line only; pulse hidden.
- If both toggles are on, scroll frame wins; full `hero--module-frame` `::after` border is hidden.

## Reusable Footer Variation

- For a framed footer treatment, wrap content in a dedicated frame element (for example, `.footer-shell__frame`) rather than applying border directly to the section root.
- Add a section-level `image_picker` setting for a footer-specific logo (for example, `footer_logo`) so merchants can use a different asset than the global theme logo.
- Position the uploaded logo above the frame border using an absolutely positioned wrapper on a relative parent (`.footer-shell`), with `transform: translateY(...)` to overlap the top border.
- When reusing the email signup block inside framed footer layouts, prefer integrated-button input styles with transparent background and absolute button positioning to create an "inside-input" appearance.
