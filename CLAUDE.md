# Shopify Theme Development Rules

## Layout files are off-limits

Never edit layout files. This includes `theme.liquid`, `password.liquid`,
and any file in the `layout/` directory. If you need to add something to
the page, create a new section or snippet instead.

## No inline styles

Never add inline styles to Liquid templates. Each section should have its
own CSS file in `assets/` (e.g. `assets/section-custom-heading.css`).
Load it in the section file with a stylesheet tag:

```liquid
{{ 'section-custom-heading.css' | asset_url | stylesheet_tag }}
```

Follow the BEM naming convention used in the rest of this theme.

## Schema settings must be merchant-friendly

Section schemas are the merchant's interface — not yours. Every setting must have:

- A **human-readable label** (e.g. "Heading text", not "heading_text_content_main")
- A **realistic default** that previews well (never use lorem ipsum)
- An **info** field explaining what the setting does, whenever a non-technical user might need guidance

## Run theme check

After making any changes, run `shopify theme check` to catch deprecated
Liquid filters, missing translations, invalid schema, and other issues
that look fine visually but cause problems later.

## Be surgical with changes

Make one specific change at a time. Do not refactor surrounding code,
rename existing CSS classes, restructure Liquid files, or change existing
schema IDs unless explicitly asked. Changing schema IDs breaks saved
customizer settings. Renaming CSS classes breaks references across the theme.

## Use existing patterns

Before creating new sections or snippets, read a similar existing file in
the theme and match its structure, class naming, and conventions. Reference
files in `sections/` and `snippets/` for patterns.
