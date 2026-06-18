# Article Layout Patterns

## Mobile Share Placement
- File: `sections/main-blog-post.liquid`
- To place social share above the featured image on mobile, render `blog-article-share` directly after the article header and before the featured image block.
- Keep desktop sticky share behavior unchanged by preserving existing desktop grid rules:
  - `.blog-post-layout--has-share .blog-post-layout__main { display: contents; }`
  - `.blog-post-layout--has-share .blog-article-share { grid-column: 3; grid-row: 1; }`
