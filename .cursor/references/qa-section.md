# QA Section Pattern

## Goal
Build a dedicated `qa` section that combines a featured person intro with FAQ-style accordion content.

## Structure
- Top featured person area:
  - image
  - section title
  - intro line
  - description
  - person name
  - person title
- Accordion list below using section blocks:
  - question (`text`)
  - answer (`richtext`)
  - optional first-open control
- Optional CTA button below the accordion.

## Implementation Notes
- Implemented as a standalone section: `sections/qa.liquid`.
- Uses native `<details>/<summary>` via `accordion-custom` for accessible accordion behavior.
- **Only one row open at a time** (`single_open`, default on): parent `.accordion[data-single-open]`; logic in `assets/accordion-custom.js`. Sibling closes use `.accordion-custom--closing` for a ~0.38s height/opacity transition (`--accordion-close-duration` on `.accordion[data-single-open]`).
- Chevron indicator is drawn with CSS and rotates for open state.
- Borders and spacing are styled to mirror FAQ-like rows and the supplied layout.
- **Full width when collapsed:** Closed accordion rows hide content with `block-size: 0` / `overflow-y: clip`, so width can shrink to summary text only unless the accordion is forced full width. Use `width: 100%`, `align-self: stretch`, and `display: block` on `accordion-custom` (see `blocks/accordion.liquid` and `assets/base.css`).
- **Section width stability:** Open accordion answer text can inflate parent flex/grid min-content (`min-width: auto`). Fix with `min-width: 0` on `.section-content-wrapper`, `.custom-section-content`, and `.accordion`; `content-visibility: hidden` on closed `.details-content`; `align-items: stretch` on column flex wrappers that contain an accordion.
