# Horizon

[B2B Assessment](#b2b-moq-technical-assessment) |
[Getting started](#getting-started) |
[Staying up to date with Horizon changes](#staying-up-to-date-with-horizon-changes) |
[Developer tools](#developer-tools) |
[Contributing](#contributing) |
[License](#license)

Horizon is the flagship of a new generation of first party Shopify themes. It incorporates the latest Liquid Storefronts features, including [theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/quick-start?framework=liquid).

- **Web-native in its purest form:** Themes run on the [evergreen web](https://www.w3.org/2001/tag/doc/evergreen-web/). We leverage the latest web browsers to their fullest, while maintaining support for the older ones through progressive enhancement—not polyfills.
- **Lean, fast, and reliable:** Functionality and design defaults to “no” until it meets this requirement. Code ships on quality. Themes must be built with purpose. They shouldn’t support each and every feature in Shopify.
- **Server-rendered:** HTML must be rendered by Shopify servers using Liquid. Business logic and platform primitives such as translations and money formatting don’t belong on the client. Async and on-demand rendering of parts of the page is OK, but we do it sparingly as a progressive enhancement.
- **Functional, not pixel-perfect:** The Web doesn’t require each page to be rendered pixel-perfect by each browser engine. Using semantic markup, progressive enhancement, and clever design, we ensure that themes remain functional regardless of the browser.

---

## 🛠 B2B MOQ Technical Assessment

This fork includes the implementation for the **B2B Minimum Order Quantity (MOQ)** technical exercise. 

**Business Rules Implemented:**
* B2B customers must purchase at least 6 items (using a default fallback of 6 if the `shop.metafields.custom.b2b_moq` is empty).
* B2C customers have no minimum requirement.

### How to Test This Feature
1. Connect to your development store: `shopify theme dev`
2. Create a test customer account on the storefront.
3. In the Shopify Admin, assign the tag `b2b` to this customer profile.
4. Log in as this customer on the storefront and navigate to the cart:
   * **If cart has < 6 items:** A red error banner is displayed, and the Checkout button is physically disabled.
   * **If cart has >= 6 items:** The banner disappears, and the Checkout button functions normally.
5. Log out or browse as a standard B2C customer to verify no restrictions apply.

*Note: Please see the Pull Request description for my Loom video walkthrough and a brief architectural explanation regarding theme-level validation vs. Shopify Plus checkout extensibility.*

---

## Getting started

We recommend using the Skeleton Theme as a starting point for a theme development project. [Learn more on Shopify.dev](https://shopify.dev/themes/getting-started/create).

To create a new theme project based on Horizon:

```sh
git clone [https://github.com/Shopify/horizon.git](https://github.com/Shopify/horizon.git)