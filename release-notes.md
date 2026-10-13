# Release Notes - Version 4.3.0

Product disclosures are now shown only to buyers in the jurisdiction scoped by the disclosure. This update also includes several bug fixes to cart functionality, carousel usability, and information on pickup location availabilities.

## What's Changed

### Added

* Filter product disclosures by the buyer's jurisdiction. A disclosure scoped to a country or a country subdivision is now shown only to buyers in that jurisdiction, and is shown whenever the buyer's jurisdiction cannot be determined.

### Fixes and improvements

* Stop rendering product card slideshow arrows on cards that have only one navigable image, where clicking them did nothing.
* Improved desktop carousel clicks and drag cursor behavior.
* Fixed product cards and quick add requiring two taps in carousels on iPhone.
* Improved product disclosure icon sizing and alignment.
* Fixed the cart drawer overlapping the installments details dialog after cart contents changed.
* Fixed cart notes not saving after adding the first item to an initially empty cart drawer.
* Fixed cart quantity buttons becoming enabled at their limits after cart note updates.
* Renamed the header's customer account menu setting to "Customer account menu" so it is no longer mistaken for the header navigation menu.
* Fixed header dropdown menus not resizing when images load after the menu opens.
* Improved how quickly the page responds when opening the mobile menu and the cart drawer.
* Fixed hidden variant media showing again after selecting an unavailable option combination.
* Fixed the menu backdrop not dimming the page after scrolling.
* Fixed product pages showing pickup as not available when the first store listed was out of stock but another store had it in stock.
* Fixed cart quantity updates from quick order lists when a Buy X Get Y discount apply
* Fixed the cart count after navigating back to a previous page.
* Improved first paint time by no longer preloading theme fonts.
* Fixed the sticky header disappearing on mobile while search, the menu, or the cart is open.
