# Release Notes - Version 3.1.0

This release introduces the ability to add mobile-specific media in the Hero section. It also includes several Safari bug fixes, and improved handling of transparent headers.

## What's Changed

### Added

- [Hero section] Set custom mobile media and layout settings

### Changed

- [Product] Quantity rules are shown on product pages
- [Footer] Rename "Utilities" to "Policies and links"
- [Product grid] Removed price from zoomed out grid view
- [Filters] Filter count always shown in vertical filters

### Fixes and improvements

- [Gift card] Fixed gift card recipient form character count color inheritance
- [Quantity rules] Fixed bug with how numbers were being compared
- [Product cards] Fixed missing image preview on swatch mouseover
- [Variant picker] Improved variant picker motion
- [Product] Fixed variant selection when using More payment options without add-to-cart button
- [Quick add] Fixed Quick Add modal showing up when product info is missing
- [Hero] Fixed logic for blurred reflection slider and toggle
- [Collection link] Fixed text wrapping on mobile
- [Header drawer] Fixed expand first group settings
- [Blog] Fixed blog post template app blocks
- [Accessibility] Enhanced mobile account drawer accessibility
- [Accessibility] Improved cart launcher accessibility
- [Accessibility] Improved accessibility for popovers
- [Accessibility] Added explicit "Close" button to search dialog
- [Accessibility] Improved "Search" button accessibility
- [Accessibility] Improved localization component accessibility
- [Accessibility] Improved contrast for the predictive search "Clear" button
- [Accessibility] Added h1 tags to page templates for SEO and accessibility
- [Accessibility] Enhanced dialog accessibility with ARIA labeling
- [Performance] Improved performance when opening / closing dialogs

## Dev Deployment
- Added `scripts/push-vertical-accordion.sh` helper to push the "Vertical Accordion" section to a specified Shopify environment via the CLI.
- [Featured product carousel] Fix starting position on mobile Safari
- [Slideshows] Ensure slideshow control buttons are circular on Safari
- [Accessibility] Add background color to skip links for better visibility
- [Product page] Shop Pay Instalments messaging no longer inherits custom typography from price block
- [Product page] "Constrain image heights to viewport" accounts for transparent headers
- [Header] Announcement bar visibility fix when used with transparent headers
- [Collection links section] Links stack vertically on mobile
- [Marquee] Fixed disappearing text
- [Footer] Fixed email signup button icon color
- [Footer] Menu block respects group block's vertical layout on mobile
