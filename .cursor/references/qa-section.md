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
