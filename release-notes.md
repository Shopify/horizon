# Release Notes - Version 4.5.0

Product pages can now list physical stores that have a product in stock, even when they don't offer pickup. This is on by default and can be turned off in the Buy buttons block. This update also includes screen reader accessibility improvements, page speed improvements, and fixes for product layouts and quick add.

## What's Changed

### Added
* Added the option to show physical stores that have a product in stock in the product page pickup availability, including stores that don't offer pickup. The option is on by default, so after updating, product pages can list these stores without any setting changes.

### Fixes and improvements
* Gave the Hero section link an accessible name for screen readers when it links to a product, collection, page, blog, article, policy, the home page, all products, or all collections.
* Fixed product recommendations showing one product per row when the block's width falls between two layout breakpoints, such as 449.5px.
* Fixed product details with a fit-content width and long unbroken text overflowing their column on tablet and desktop screens.
* Linked Image blocks now tell screen readers where the link goes, such as "Collection: Spring", instead of relying on the image's alt text.
* Improved page speed: Blog posts and Collection list card images after the third section of a page now load lazily, and mobile cards request images closer to their size.
* Fixed quick add and mobile product hotspots opening an empty or incomplete modal when the product template hides the product information section or its price, variant picker, or buy buttons.
