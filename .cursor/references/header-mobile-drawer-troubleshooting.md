# Header Mobile Drawer Troubleshooting

## Symptom
- Mobile hamburger drawer (`.header__drawer`) is missing from rendered HTML.
- Search/cart actions appear on the left instead of right in mobile layout.

## Cause Pattern
- Reusing the same static block id in `content_for 'block'` calls for multiple header menu variants can cause one variant render path to be missing.

## Fix Pattern
- In `sections/header.liquid`, use distinct ids for each captured `_header-menu` variant:
  - Desktop menu: `header-menu`
  - Mobile drawer: `header-menu-mobile`
  - Navigation bar: `header-menu-navigation`
- Explicitly map mobile grid areas (in both the `@media (max-width: 749px)` block and the `[data-menu-style='drawer']` duplicate):
  - `.header__drawer` -> `leftA`
  - `.search-action` -> `leftB` (beside hamburger)
  - `header-actions` -> `rightB` with `justify-self: end`
- When split menu + center logo groups search/actions in `.header__utilities-group`, that wrapper is **not** a grid child target. On mobile set `.header__utilities-group { display: contents; }` so `search-action` and `header-actions` participate in the 5-column grid. Without this, the whole group auto-places into `leftB` and cart/account sit left of center.
- On desktop split layout, `.header__column--right` stays `position: static` for mega menus, so `.header__utilities-group` anchors to `.header__row`. Use `inset-inline-end: var(--page-margin)` (not `right: 0`) so icons line up with the padded nav row; keep `top: 35%` + `translateY` so icons sit above the menu without moving the nav baseline.

## Desktop Overflow Removal
- If desktop navigation should never collapse into a "More" item:
  - Replace `overflow-list` usage in `blocks/_header-menu.liquid` with a plain `<ul class="menu-list__list">`.
  - Remove the `slot="more"` menu item markup.
  - Update `assets/header-menu.js` so `requiredRefs` does not require `overflowMenu`.
  - Remove any `findMenuItem()` handling specific to `[slot="more"]`.

## Notes
- Theme-check warning for `@starting-style` is pre-existing and unrelated to drawer markup rendering.
