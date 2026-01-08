# Repository Guidelines

## Project Structure & Module Organization
- `layout/` holds the main theme shell (`theme.liquid`, `password.liquid`).
- `templates/` defines page templates (`.json` or `.liquid`).
- `sections/` and `blocks/` contain modular Liquid components used by templates.
- `snippets/` provides reusable Liquid fragments.
- `assets/` contains CSS, JavaScript, and media assets (e.g., `base.css`, `*.js`, `*.svg`).
- `config/` includes theme settings (`settings_schema.json`, `settings_data.json`).
- `locales/` holds translation files (`*.json` + `*.schema.json`).

## Build, Test, and Development Commands
- `shopify theme dev`: start a local development server connected to a Shopify store.
- `shopify theme check`: run Theme Check linting against Liquid and theme files.

## Coding Style & Naming Conventions
- Indentation uses 2 spaces across Liquid, HTML, CSS, and JS.
- Prefer kebab-case for filenames (e.g., `product-card.liquid`, `product-card.js`).
- Follow existing Liquid whitespace control patterns (`{%- -%}`) to keep output lean.
- Keep JS modules in `assets/` and prefer small, focused components.

## Testing Guidelines
- No unit test suite is present; use `shopify theme check` as the primary automated validation.
- Validate UI changes in the Theme Editor or with `shopify theme dev` previews.

## Commit & Pull Request Guidelines
- Recent history uses short, direct subjects (e.g., `Horizon v3.2.1`) plus merge commits.
- Use present-tense summaries and keep version bumps in the `Horizon vX.Y.Z` format.
- This repository is not accepting external contributions; for internal PRs include:
  - A short description of the change and scope.
  - Screenshots or screen recordings for UI-impacting updates.

## Configuration & Localization Tips
- `config/settings_schema.json` defines the editable theme settings surface.
- Avoid committing store-specific `config/settings_data.json` unless required.
- Add/adjust translations in `locales/*.json` and keep schema files in sync.
