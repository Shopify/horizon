# Release Notes - Version 4.2.0

This update improves support for right-to-left (RTL) languages. The HTML page's base text direction is now set to match the shopper's requested language, correcting text order and alignment. This update also includes various bug fixes, notably the cart drawer and cart page showing stale line items after using the browser Back button.

## What's Changed

### Added

* Adds a new Liquid drop and styling to support display of right-to-left languages. All templates now render [dir={{ request.locale.direction }}] to communicate the language's direction to the browser.
* Alignment and position settings that store left/right values now render as logical CSS (start/end), so they mirror correctly on right-to-left storefronts with no change on left-to-right storefronts.

### Fixes and improvements

* Align the account popover dialog so it opens from the account button instead of the bottom of the header.
* Fixed the cart drawer and cart page showing stale line items after a browser Back, whether the page comes back from the back/forward cache or is rebuilt from the HTTP cache.
* Render the Catalog link in menus as text instead of a Liquid error when no product image is available.
* Fixed the filters drawer leaving empty space beside the "See items" button when no filters were applied.
* Serve smaller product card images in two-column mobile collection and search grids.
* Load Quick Add's JavaScript only when Quick Add is enabled.
* Fixed the header language selector's dropdown arrow keeping the top row text color instead of following the transparent header text color.
* Fixed price filter values being wiped mid-edit when a shopper moves between the low and high price boxes.
* Fixed anchor-positioned popovers staying glued to the physical left edge of their trigger in right-to-left locales.
* Fixed prices, price ranges, unit prices, SKUs, discount codes and gift card codes rendering with their parts in the wrong order inside right-to-left text.
* Fixed horizontal scroll hint fades and scroll-into-view alignment in right-to-left languages, so the fade appears on the correct edge and tracks the scroll position.
* Fixed uploaded videos in popup link blocks not playing in Safari. The video now starts when the popup opens and stops when it closes.
* Fixed swatch rows widening rounded product cards before their layout initializes.
