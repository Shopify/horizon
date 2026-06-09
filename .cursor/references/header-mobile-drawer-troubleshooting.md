# Header Mobile Drawer Troubleshooting

## Symptom
- Mobile hamburger drawer (`.header__drawer`) is missing from rendered HTML.
- Search/cart actions appear on the left instead of right in mobile layout.

## Cause Pattern
- Reusing the same static block id in `content_for 'block'` calls for multiple header menu variants can cause one variant render path to be missing.

## Drawer header logo

- For `data_header_drawer_type: 'mobile-drawer'`, render `.menu-drawer__header` at the top of `.menu-drawer` with the mobile logo (`settings.logo_mobile`, fallback `settings.logo`) linked to home on the left and `.menu-drawer__close-button--header` on the right.
- Size the drawer logo with `settings.logo_height_mobile` and the image aspect ratio via `--menu-drawer-logo-width` / `--menu-drawer-logo-height` CSS variables.

## Drawer utility actions (search + account)

- On mobile, render search and account in `snippets/header-drawer.liquid` inside `.menu-drawer__utility-actions` at the bottom of `.menu-drawer__utility-links`.
- Pass `section: section` from `blocks/_header-menu.liquid` when rendering `header-drawer`.
- Hide header bar search on mobile with `.search-action:not(.search-action--in-drawer) { display: none }` in `snippets/search.liquid`.
- Hide header bar account on mobile with `header-actions:not(.header-actions--drawer) .account-button { display: none }` in `snippets/header-actions.liquid`.
- Cart stays in the header bar; only search and account move into the drawer footer.
- Normalize drawer utility icon sizing with `--menu-drawer-icon-size: var(--icon-size-md)` on `.menu-drawer` and apply it to all `.menu-drawer__utility-actions` icons (search, account, and close button in the drawer header). Match touch targets with `var(--minimum-touch-target)` on each action wrapper.

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

## Mobile logo not rendering

### Symptom
- Theme setting `logo_mobile` is set but the mobile logo never appears (often only noticed on the homepage).

### Cause
- Nesting the mobile logo inside `header-logo__image-container--original` breaks when the transparent inverse header is enabled (`enable_transparent_header_home` + `home_color_scheme: inverse`). That state sets `--header-logo-display: none` on the original container, which hides the nested mobile logo too.

### Fix
- Render `logo_mobile` in a **sibling** container: `header-logo__image-container--mobile`.
- On `max-width: 749px`, show the mobile container and force-hide both `--original` and `--inverse` with `display: none !important` so inverse header CSS variables cannot override it.

## Notes
- Theme-check warning for `@starting-style` is pre-existing and unrelated to drawer markup rendering.
