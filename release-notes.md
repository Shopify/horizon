# Release Notes - Version 4.4.0

This update improves cart messaging by adding support for fees in tax and shipping information and ensures quantity changes show error messages instead of failing silently. It also fixes the announcement bar text clipping and resolves issues with product images in blog posts stretching incorrectly.

## What's Changed

### Added
* Added support for mentioning fees in the cart's taxes and shipping message. Fees are currently in early access. [Learn more & request access](https://help.shopify.com/en/manual/taxes/additional-fees).
* Added a mobile menu drawer divider color setting.

### Fixes and improvements
* Fixed the page not scrolling after the Android Back button closes a drawer or pop-up.
* Fixed the descenders on text in the announcement bar from being visibly clipped.
* Fixed images in blog posts stretching to the full content width instead of keeping their set or original size.
* Check out now waits for a pending quantity save, so a rejected quantity shows its message in place of a silent failure.
* Improved collection menu rendering by using each collection's image or its first product's image without searching later products.
* Fixed header menu items sitting higher than the header icons in the sticky header when the logo is hidden on the home page.
* Fixed submenu columns and featured product and collection cards in the header's More menu becoming too narrow to read when the cart drawer is open.
* Fixed the mobile navigation bar briefly appearing in the desktop header, and the page content shifting, while a page loads.
* Fixed long email signup headings overflowing the footer instead of wrapping.
* Fixed the sticky header covering the top of sticky product media on desktop.
* Fixed the email signup form going past the edge of a crowded row of blocks at tablet widths, which cut off the sign-up button.
* Fixed long unbroken text in product details squeezing the product media and making the page scroll sideways on wide screens.
* Fixed the product recommendations block showing one product per row instead of a multi-column grid on large screens.
* Fixed inputs in blocks inside a layered slideshow, such as the email sign-up field, not taking focus when clicked.
* Fixed the price disappearing in the featured product section after switching between variants with and without a compare-at price.
* Fixed product media carousel arrows not showing when the Icons setting showed Arrows on product templates from earlier theme versions.
* Fixed buttons not using the Accent font's weight and style when their Font setting is Accent.
* Fixed large text sometimes overflowing its container when the page's font loaded late.
* Fixed the search modal going blank while typing on storefronts in languages predictive search doesn't support, such as Arabic and Hebrew. The modal now keeps its default content, and pressing Enter opens the full search results page.
* Fixed product card images sometimes going blank after selecting color swatches when the product list uses the carousel layout.
* Fixed the quantity selector stacking above the add to cart button in quick add when the product page sets a custom width on the group that holds the buy buttons.
* Renamed the "Installments" setting in the price block and cart settings to "Show Shop Pay payment options", and added help text explaining that it displays Shop Pay Installments and HSA/FSA badges.
* Fixed carousels and other multi-item slideshows on right-to-left storefronts (Arabic, Hebrew) moving by the wrong number of items, skipping items after a swipe, and ignoring quick mouse flicks.
* Fixed product names touching or being cut off by rounded product card corners in the tiny collection view.
