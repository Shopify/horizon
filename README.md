# Horizon

[Getting started](#getting-started) |
[Staying up to date with Horizon changes](#staying-up-to-date-with-horizon-changes) |
[Developer tools](#developer-tools) |
[Contributing](#contributing) |
[Code of conduct](#code-of-conduct) |
[Theme Store submission](#theme-store-submission) |
[License](#license)

Horizon is the first of a new generation of first party Shopify themes. It incorporates the latest Liquid Storefronts features, including [theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/quick-start?framework=liquid).

- **Web-native in its purest form:** Themes run on the [evergreen web](https://www.w3.org/2001/tag/doc/evergreen-web/). We leverage the latest web browsers to their fullest, while maintaining support for the older ones through progressive enhancement—not polyfills.
- **Lean, fast, and reliable:** Functionality and design defaults to “no” until it meets this requirement. Code ships on quality. Themes must be built with purpose. They shouldn’t support each and every feature in Shopify.
- **Server-rendered:** HTML must be rendered by Shopify servers using Liquid. Business logic and platform primitives such as translations and money formatting don’t belong on the client. Async and on-demand rendering of parts of the page is OK, but we do it sparingly as a progressive enhancement.
- **Functional, not pixel-perfect:** The Web doesn’t require each page to be rendered pixel-perfect by each browser engine. Using semantic markup, progressive enhancement, and clever design, we ensure that themes remain functional regardless of the browser.

You can find a more detailed version of our theme code principles in the [contribution guide](https://github.com/Shopify/horizon/blob/main/.github/CONTRIBUTING.md#theme-code-principles).

## Getting started

We recommend using the Skeleton Theme as a starting point for theme development. [Learn more on Shopify.dev](https://shopify.dev/themes/getting-started/create).

> If you're building a theme for the Shopify Theme Store, then you can use Horizon as a starting point. However, the theme that you submit needs to be [substantively different from Horizon](https://shopify.dev/themes/store/requirements#uniqueness) so that it provides added value for merchants. Learn about the [theme developer tools](https://shopify.dev/docs/storefronts/themes/tools).

Please note that the main branch may include code for features not yet released. The "stable" version of Horizon is available in the theme store.

## Staying up to date with Horizon changes

Say you're building a new theme off Horizon but you still want to be able to pull in the latest changes, you can add a remote `upstream` pointing to this Horizon repository.

1. Navigate to your local theme folder.
2. Verify the list of remotes and validate that you have both an `origin` and `upstream`:

```sh
git remote -v
```

3. If you don't see an `upstream`, you can add one that points to Shopify's Horizon repository:

```sh
git remote add upstream https://github.com/Shopify/horizon.git
```

4. Pull in the latest Horizon changes into your repository:

```sh
git fetch upstream
git pull upstream main
```

## Developer tools

There are a number of really useful tools that the Shopify Themes team uses during development. Horizon is already set up to work with these tools.

### Shopify CLI

[Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli) helps you build Shopify themes faster and is used to automate and enhance your local development workflow. It comes bundled with a suite of commands for developing Shopify themes—everything from working with themes on a Shopify store (e.g. creating, publishing, deleting themes) or launching a development server for local theme development.

You can follow this [quick start guide for theme developers](https://shopify.dev/docs/themes/tools/cli) to get started.

### Theme Check

We recommend using [Theme Check](https://github.com/shopify/theme-check) as a way to validate and lint your Shopify themes.

We've added Theme Check to Horizon's [list of VS Code extensions](/.vscode/extensions.json) so if you're using Visual Studio Code as your code editor of choice, you'll be prompted to install the [Theme Check VS Code](https://marketplace.visualstudio.com/items?itemName=Shopify.theme-check-vscode) extension upon opening VS Code after you've forked and cloned Horizon.

You can also run it from a terminal with the following Shopify CLI command:

```bash
shopify theme check
```

You can follow the [theme check documentation](https://shopify.dev/docs/storefronts/themes/tools/theme-check) for more details.

### Continuous Integration

Horizon uses [GitHub Actions](https://github.com/features/actions) to maintain the quality of the theme. [This is a starting point](https://github.com/Shopify/horizon/blob/main/.github/workflows/ci.yml) and what we suggest to use in order to ensure you're building better themes. Feel free to build off of it!

#### Shopify/lighthouse-ci-action

We love fast websites! Which is why we created [Shopify/lighthouse-ci-action](https://github.com/Shopify/lighthouse-ci-action). This runs a series of [Google Lighthouse](https://developers.google.com/web/tools/lighthouse) audits for the home, product and collections pages on a store to ensure code that gets added doesn't degrade storefront performance over time.

#### Shopify/theme-check-action

Horizon runs [Theme Check](#Theme-Check) on every commit via [Shopify/theme-check-action](https://github.com/Shopify/theme-check-action).

## Contributing

We are not accepting contributions to Horizon at this time.

## Code of conduct

All developers who wish to contribute through code, please first read our [Code of Conduct](https://github.com/Shopify/horizon/blob/main/.github/CODE_OF_CONDUCT.md).

## Theme Store submission

The [Shopify Theme Store](https://themes.shopify.com/) is the place where Shopify merchants find the themes that they'll use to showcase and support their business. As a theme partner, you can create themes for the Shopify Theme Store and reach an international audience of an ever-growing number of entrepreneurs.

Ensure that you follow the list of [theme store requirements](https://shopify.dev/themes/store/requirements) if you're interested in becoming a [Shopify Theme Partner](https://themes.shopify.com/services/themes/guidelines) and building themes for the Shopify platform.

## License

Copyright (c) 2021-present Shopify Inc. See [LICENSE](/LICENSE.md) for further details.
