# Horizon Ropel

An **educational fork** of Shopify's [Horizon theme](https://github.com/Shopify/horizon) — a learning and portfolio project exploring the current generation of Shopify theme architecture: nested theme blocks, the Horizon design system, and modern Liquid patterns.

> **Disclaimer.** This repository exists for learning and portfolio purposes only.
> It is **not** for sale, distribution, or production use. The theme is based on
> Shopify's Horizon theme and remains subject to the terms of Shopify's
> [license](LICENSE.md) — all rights to the original code belong to Shopify Inc.
> If you need Horizon for your store, get it from the official
> [Shopify Theme Store](https://themes.shopify.com/themes/horizon).

## Why a fork

The sibling project [shopify-demo](https://github.com/DGPRoman/shopify-demo) builds a theme from scratch on the minimal Skeleton scaffold. This repository takes the opposite approach: start from Shopify's flagship theme and learn by reading, customizing and extending production-grade code, while tracking upstream releases.

## Development

```bash
shopify theme dev -e development
```

The first run opens a browser to authenticate with Shopify. The theme is uploaded as an unpublished development theme and never affects the live theme. Store configuration lives in [`shopify.theme.toml`](shopify.theme.toml).

Quality checks:

```bash
shopify theme check
```

## Syncing with upstream

The fork tracks the official theme via the `upstream` remote:

```bash
git fetch upstream
git merge upstream/main   # review release-notes.md for breaking changes
```

## License

Shopify's original license — see [LICENSE.md](LICENSE.md). The license file is intentionally kept intact.
