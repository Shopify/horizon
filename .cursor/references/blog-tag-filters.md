# Blog Tag Filters Pattern

Use this pattern in `sections/main-blog.liquid` to render tag-based filters above the blog posts grid.

## Markup

- Add a `<nav>` above `.blog-posts-container` with `aria-label="Filter blog posts by tag"`.
- Render an `All` link to `{{ blog.url }}`.
- Render each tag from `blog.all_tags` as links to `{{ blog.url }}/tagged/{{ tag | handle }}`.
- Add active state classes:
  - `All` is active when `current_tags == blank`
  - A tag is active when `current_tags contains tag`

## Styling

- Use a horizontal row with a subtle bottom border.
- Use uppercase, tightly spaced labels to match editorial navigation.
- Add an underline indicator (`::after`) for hover and active states.
- Keep mobile spacing/font-size slightly reduced for wrap behavior.

## Blog Card Layout Sequence

For editorial blog pages in `sections/main-blog.liquid`, use a deterministic card sequence:

- **Post 1:** full-width hero (`col-span: 6`) with text overlay vertically centered on the image (`top: 50%`, `translateY(-50%)`), padded `clamp(2.5rem, 5vw, 4rem)` block / `clamp(2.5rem, 6vw, 4rem)` inline-start. Inner frame on image via `.blog-post-card__image-container::before`: `inset: 16px`, `border-radius: 16px`, `1px solid rgb(244 192 119 / 0.4)` (`#F4C077` at 40% opacity). Gradient overlay stays on `::after`.
- **Posts 2-3:** standard two-column grid cards (`col-span: 3` each), image with `1px solid #d3d3d3` border (matches list row thumbnails).
- **Posts 4+:** one row each (`col-span: 6`) using a compact list row:
  - image first (264px wide, 3:2 aspect ratio)
  - title in middle column
  - excerpt in right column

Implementation note:
- Add a card variant class by index (`blog-post-item--hero`, `--grid`, `--list`) and style each variant in section-level CSS.

## Pagination

- Wrap the posts grid in `{% paginate blog.articles by 12 %} … {% endpaginate %}`.
- Render `{% render 'blog-pagination', paginate: paginate %}` below the grid.
- `snippets/blog-pagination.liquid` uses the same circular arrow controls as featured collection carousels (`--color-primary-button-background`, arrow `::after` SVG).
- Card layout index (`forloop.index == 1` hero, etc.) resets per page — first post on each page is the hero.
