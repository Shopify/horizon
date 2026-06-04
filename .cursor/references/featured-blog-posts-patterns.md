# Featured Blog Posts Patterns

## Filter by article tag

- `sections/featured-blog-posts.liquid` setting **Filter by tag** (`filter_by_tag`): scans up to 50 articles from the selected blog, keeps only those where `article.tags contains filter_by_tag`, then applies `post_limit`.
- Tag text must match the tag in Shopify admin **exactly** (case-sensitive).
- Leave blank to show the latest posts (first `post_limit` articles, same as before).
- When tag is set and **View all button link** is empty, View all points to `{{ blog.url }}/tagged/{{ tag | handle }}`.

## Width Settings

- `sections/featured-blog-posts.liquid` supports section width via `section.settings.section_width`.
- Include `small` as an option alongside `page-width` and `full-width`.

## Small Width Sizing

- For consistent theme behavior, apply:
  - `width: min(100%, calc(1280px + (var(--page-margin) * 2)));`
  - `max-width: 100%;`
  - `margin-inline: auto;`
  - `padding-inline: var(--page-margin);`

This matches the established small-width behavior used by other list-style sections.

## Header row (title, description, View all)

- `.featured-blog-posts-section__header` is a flex row with `align-items: flex-end` so the **View all** button sits on the same horizontal baseline area as the bottom of the text block (title + additional line).
- Do not set `align-self: flex-start` on `.featured-blog-posts-section__view-all` — it overrides parent alignment.
- Mobile (`≤749px`): column layout with `align-items: flex-start`.

## Carousel arrow hover

- Featured blog carousel arrows use primary button colors (`--color-primary-button-background` / `--color-primary-button-text`) with a custom `::after` arrow SVG (see section `{% stylesheet %}`).
- Hover/focus fill matches primary CTAs via shared rules in `assets/base.css` (`.featured-blog-posts-section--carousel .resource-list__carousel slideshow-arrows .slideshow-control`): bottom-up `::before` scale fill, hover text color, and white arrow SVG on hover for the `::after` pseudo.
- Do not add one-off opacity-only hovers here — keep in sync with `.resource-list__carousel` arrow rules in `base.css`.
