# Image with text — grouped images pattern

Use **two Group blocks** at the section level instead of multiple top-level Image blocks. The section stays a simple horizontal row (images | text); image layout is controlled inside the **Images** group.

## Structure

```
Section (row, vertical on mobile)
├── Group "Images"     ← nested image blocks here
│   ├── Image
│   ├── Image
│   └── (optional Image)
└── Group "Content"    ← heading, text, button
```

## Presets (Section → Add section)

| Preset | Images group direction | Use for |
|--------|------------------------|---------|
| **Image with text (stacked images)** | Column (vertical) | Two images stacked in the media column |
| **Image with text (three images)** | Column (auto 2+1 grid) | Three images: two side by side on top, third full width below |

When an **Images** group contains exactly three Image blocks (and nothing else), `snippets/group.liquid` applies a 2×2 grid automatically—no extra settings required.

Original **Image with text** preset remains: one image + content group.

## Merchant setup (existing sections)

For sections that still have `image`, `image`, `group` at the top level (e.g. Scent Scientists on Wellbeing):

1. Add a **Group** block named Images (or use preset above on a new section).
2. Drag existing **Image** blocks into that group.
3. Keep the text **Group** as the second top-level block.
4. Section layout: **Row**, **Vertical on mobile** enabled.
5. Images group: **Column** to stack, or **Row** for side-by-side (enable **Vertical on mobile** on the group if row).

## Group settings cheat sheet

| Goal | Images group | Content group |
|------|----------------|---------------|
| Desktop: two columns | Section → Row | — |
| Mobile: stack media then text | Section → Vertical on mobile | — |
| Two images stacked | Group → Column | — |
| Three images (2 top + 1 bottom) | Group → Column, add exactly 3 Image blocks | Auto grid in `group.liquid` |
| Images side by side (2 only) | Group → Row | — |
| Equal width columns | Both groups → Width: Fill | Both groups → Width: Fill |

## Theme CSS

`snippets/section.liquid` gives two top-level `.group-block` siblings `flex: 1` from 750px up so each half is equal. No special grid for loose image blocks at section level.

## Pitfall

Multiple **Image** blocks directly under the section (not inside a group) will lay out as separate flex columns. Always nest images in a group for multi-image layouts.
