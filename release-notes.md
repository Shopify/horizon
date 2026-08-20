# Release Notes - Version 4.1.4

This release ships multiple bug fixes and performance improvements.

## What's Changed

### Fixes and improvements
* Fixed desktop header submenus that could close before the pointer reached their links.
* Minimized style tag loading for product cards to improve rendering performance.
* Reduced layout work during initial page render by measuring header height only on pages that need it.
* Preloaded price styles for empty product grids to prevent flash of unstyled content.
* Fixed the Quick add button showing a disabled "Add" instead of "Choose" when a sold-out variant is selected, and kept the cart icon visible on out-of-stock buttons.
* Removed unused animation and transition CSS rules from the base stylesheet.
* Removed unused CSS custom properties from the theme's inline styles, reducing the CSS parsed on every page load.
* Fixed the cart summary not staying in view when scrolling the cart page with "Extend to screen edge" enabled.
* Improved mega menu keyboard and screen reader accessibility with a dedicated submenu toggle on desktop.
