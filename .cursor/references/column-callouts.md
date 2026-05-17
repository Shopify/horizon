# Column callouts section

## Background behaviour

- **Section** `background_image`: default full-bleed background (always visible when not hovering a column).
- **Block** `background_image` (label: Hover background image): fades in over the default on column `:hover` / `:focus-within` (pointer devices only via `@media (hover: hover)`).
- Stacked layers in `.column-callouts__backgrounds`: default `<img>` or placeholder (z-index 0), per-block hover divs with `background-image` (opacity 0 → 1).
- Per-block rules generated in `{% style %}` using `:has([data-callout-id="…"])`.
- Columns with a hover image get `tabindex="0"` for keyboard focus.
- Hover timing: `--column-callouts-hover-duration` (0.45s) shared by background crossfade and `.column-callouts__item-text` `translateY` lift.
- Extra space between `.column-callouts__item-heading` and text via `margin-block-start` on `.column-callouts__item-text`.

## Pitfalls

- Do not replace the section image on load—only reveal hover layers on interaction.
- Block `icon` is type `html` (paste SVG/HTML); rendered inside `.column-callouts__icon` with `aria-hidden="true"`. Block `background_image` is the hover background image picker.
