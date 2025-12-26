# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Horizon is Shopify's flagship first-party theme (v3.2.1) built with modern web standards, progressive enhancement, and accessibility-first design. It uses the latest Liquid Storefronts features including theme blocks.

**Core Principles:**
- Web-native: Evergreen web standards, progressive enhancement—no polyfills
- Server-rendered: HTML via Liquid, client-side JS only as enhancement
- Zero external dependencies: Pure browser APIs only
- Functional over pixel-perfect: Semantic markup that works across browsers

## Development Commands

```bash
# Lint and validate theme
shopify theme check

# Build schemas (only if schemas/ folder exists)
npm run build:schemas

# Local development with Shopify CLI
shopify theme dev
```

Theme Check runs automatically on every commit via GitHub Actions.

> **Note:** The `npm run build:schemas` command only applies if the repo has a `schemas/` folder and `package.json`. Check if these exist before using.

## Architecture

### Directory Structure

| Directory | Purpose |
|-----------|---------|
| `sections/` | Top-level page components (41 files) |
| `blocks/` | Reusable theme blocks that nest within sections (94 files) |
| `snippets/` | Shared template fragments (95 files) |
| `templates/` | JSON template files |
| `assets/` | JavaScript (76 files), CSS, static assets |
| `schemas/` | TypeScript schema source files (build to .liquid) |
| `locales/` | Translation files (54+ languages) |
| `config/` | Theme settings schema and defaults |

### Component Hierarchy

1. **Sections** - Top-level, configured via theme editor
2. **Blocks** - Reusable building blocks, can be nested
3. **Snippets** - Shared template fragments via `{% render %}`

### JavaScript Framework

Components extend the custom `Component` base class (`assets/component.js`):

```javascript
import { Component } from '@theme/component';

class ProductCard extends Component {
  connectedCallback() {
    super.connectedCallback();
  }

  async handleAddToCart(event) {
    // Use async/await, never .then() chaining
  }
}

customElements.define('product-card', ProductCard);
```

HTML uses `ref` attributes and `on:click` for event binding:
```liquid
<product-card>
  <button ref="addButton" on:click="/handleAddToCart">Add to cart</button>
</product-card>
```

## Critical Rules

### Schema Editing

**If a `schemas/` folder exists, NEVER edit `{% schema %}` blocks directly in `.liquid` files.**

When using the schema build system:
1. Edit the `.js` file in `schemas/blocks/` or `schemas/sections/`
2. Run `npm run build:schemas`

If no `schemas/` folder exists, edit `{% schema %}` blocks directly in the `.liquid` files.

### Single `content_for 'blocks'` Per File

Only ONE `{% content_for 'blocks' %}` per Liquid file. Capture if needed multiple times:

```liquid
{% capture blocks_content %}
  {% content_for 'blocks' %}
{% endcapture %}

{% if condition %}
  {{ blocks_content }}
{% else %}
  {{ blocks_content }}
{% endif %}
```

### Snippet Documentation

All snippets require `{% doc %}` blocks:

```liquid
{% doc %}
  Volume Pricing Info
  @param {object} variant - The variant object
  @param {string} [unique_id] - Optional unique identifier
{% enddoc %}
```

## Code Standards

### Liquid

- Use `{% liquid %}` for multiline code blocks
- Prefer inlining Liquid over declaring variables at top
- Use `{% # comment %}` for inline comments
- Object dot notation: `product.title` not `product['title']`

### JavaScript

- Zero external dependencies—native browser APIs only
- `const` over `let`, `for...of` over `.forEach()`
- Early returns over nested conditionals
- JSDoc type annotations for component refs

### CSS

- Never use IDs as selectors
- Maximum specificity `0-4-0` (prefer `0-1-0`)
- BEM naming: `.block__element--modifier`
- Namespace CSS variables: `--component-padding` not `--padding`
- Use logical properties (`padding-inline`, `margin-block`) for RTL support
- Minimize `:has()` usage (performance impact on dynamic updates)
- Global variables in `snippets/theme-styles-variables.liquid`
- Component styles via `{% stylesheet %}...{% endstylesheet %}`

### Accessibility

20+ accessibility rule files in `.cursor/rules/`. Key requirements:
- WCAG AA compliance (4.5:1 contrast for normal text)
- Visible focus indicators with `:focus-visible`
- Respect `prefers-reduced-motion`
- Skip links, proper landmarks, heading hierarchy

## Key Files

| File | Purpose |
|------|---------|
| `assets/component.js` | Base Web Component framework |
| `assets/base.css` | Global stylesheet |
| `snippets/theme-styles-variables.liquid` | Global CSS variables |
| `config/settings_schema.json` | Theme customization options |
| `.cursor/rules/` | 43 development standard files |

## Translation Keys

- Max 3 levels deep with snake_case: `general.meta.title`
- Schema names use `t:names.keyname` format
- Add missing keys to `locales/en.default.schema.json` under `names` section
