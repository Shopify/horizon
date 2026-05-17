# Column callouts section

## Background behaviour

- **Section** `background_image`: default full-bleed background (always visible when not hovering a column).
- **Block** `background_image` (label: Hover background image): fades in over the default on column `:hover` / `:focus-within` (pointer devices only via `@media (hover: hover)`).
- Stacked layers in `.column-callouts__backgrounds`: default `<img>` or placeholder (z-index 0), per-block hover divs with `background-image` (opacity 0 → 1).
- Per-block rules generated in `{% style %}` using `:has([data-callout-id="…"])`.
- Columns with a hover image get `tabindex="0"` for keyboard focus.

## Pitfalls

- Do not replace the section image on load—only reveal hover layers on interaction.
- `icon` and `background_image` on blocks are separate settings.
