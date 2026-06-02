# Section Intro Pattern

## Goal
Add an optional centered heading and description above section content without creating a new section type.

## Implementation
- Add section-level settings in `sections/section.liquid`:
  - `show_intro` (`checkbox`)
  - `intro_heading` (`text`)
  - `intro_description` (`richtext`)
- In `snippets/section.liquid`, render intro markup before the content container when enabled and non-empty.
- Keep intro styling scoped to `.custom-section__intro` and centered with a readable max width.

## Multicolumn bottom button (section-level)

Optional primary CTA below the column grid (centered), not a block:

- Settings under **Multicolumn** in `sections/section.liquid`:
  - `show_multicolumn_button` (`checkbox`)
  - `multicolumn_button_label` (`text`)
  - `multicolumn_button_link` (`url`)
  - `multicolumn_button_open_in_new_tab` (`checkbox`)
- Rendered in `snippets/section.liquid` as the last child of `.section-content-wrapper` (not a sibling). Class `section-content-wrapper--with-footer-cta` sets `height: auto` and `flex-wrap: wrap` so the full-width button row stays inside section padding and does not overlap the next section.
- Uses theme `.button` markup (label + arrow SVG) so primary hover fill from `base.css` applies.
- Show when `show_multicolumn_button` and label are set; empty link uses `role="link"` + `aria-disabled="true"` like `snippets/button.liquid`.

## Notes
- Liquid conditionals in theme files should avoid grouped boolean expressions with parentheses for better theme-check compatibility.
- Use nested `if` statements for combined checks (`show_intro` + non-blank heading/description).
