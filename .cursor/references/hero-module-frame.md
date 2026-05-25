# Hero Module Frame Pattern

## Inset border frame (`enable_module_frame`)

- Use a section-level toggle to enable an inset framed hero card:
  - `enable_module_frame`
  - `module_frame_padding`
  - `module_frame_radius`
  - `module_frame_border_width`
- Apply inset spacing on the hero root container (`padding`) so the module sits inside the section.
- Apply border radius and border on `.hero__container` in a modifier class (`.hero--module-frame`) so media and overlays clip correctly.
- Keep styles variable-driven in the section `style` attribute for per-instance customization.

## Scroll prompt inner frame (`show_scroll_prompt`)

When **Show scroll prompt** is enabled, add class `hero--scroll-frame` (independent of `enable_module_frame`).

- **Shape:** U-shaped inner border on `.hero__scroll-frame` (dedicated span, not a pseudo — avoids clash with blur `::before`) — left, right, and bottom only (no top).
- **Corners:** `16px` radius on bottom-left and bottom-right (`--hero-scroll-frame-radius`).
- **Color:** `#f4c077`, same as scroll line.
- **Inset:** `calc(var(--cala-frame-gutter-inline) + scroll_frame_inset)` — gutter matches header `section--full-width-margin` / `--page-margin` so vertical strokes align with `.header__menu-bracket` (16px mobile, 40px desktop). Optional `scroll_frame_inset` is an extra adjustment only (default `0`).
- **Center line:** `.hero__scroll-prompt-line` sits above the bottom border at horizontal center (`z-index` above frame) so it meets the bottom stroke in a T junction.
- If both toggles are on, scroll frame wins; full `hero--module-frame` `::after` border is hidden.

## Reusable Footer Variation

- For a framed footer treatment, wrap content in a dedicated frame element (for example, `.footer-shell__frame`) rather than applying border directly to the section root.
- Add a section-level `image_picker` setting for a footer-specific logo (for example, `footer_logo`) so merchants can use a different asset than the global theme logo.
- Position the uploaded logo above the frame border using an absolutely positioned wrapper on a relative parent (`.footer-shell`), with `transform: translateY(...)` to overlap the top border.
- When reusing the email signup block inside framed footer layouts, prefer integrated-button input styles with transparent background and absolute button positioning to create an "inside-input" appearance.
