# Styles Section

Display collection images with styled tiles linking to your store's collections. Perfect for highlighting product categories like occasions, seasons, or themes.

## Overview

The Styles section showcases collections in an elegant horizontal layout with:
- A customizable heading on the left (desktop) or top (mobile)
- Collection images with titles below each image
- Two layout options: Grid (static) or Carousel (scrollable)

## Adding the Section

1. In the Theme Customizer, click **Add section**
2. Search for **Styles** or **Styles: Carousel**
3. Choose your preferred layout variant

## Settings

### Collections

| Setting | Description | Default |
|---------|-------------|---------|
| **Collections** | Select which collections to display | None (shows placeholders) |

### Layout

| Setting | Description | Options | Default |
|---------|-------------|---------|---------|
| **Layout type** | How tiles are arranged | Grid, Carousel | Grid |
| **Columns** | Number of collection tiles | 2-6 | 4 |
| **Gap** | Space between tiles | 0-32px | 8px |
| **Image ratio** | Aspect ratio for images | Portrait (3:4), Square, Landscape | Portrait |

### Section

| Setting | Description | Options | Default |
|---------|-------------|---------|---------|
| **Width** | Section width | Page width, Full width | Page width |
| **Color scheme** | Background and text colors | Theme color schemes | Default |
| **Top padding** | Space above section | 0-100px | 48px |
| **Bottom padding** | Space below section | 0-100px | 48px |

## Customizing the Heading

The heading is a text block that you can fully customize:

1. Click on the section in the left sidebar
2. Click on the **Text** block
3. Edit the text content (supports line breaks with `<br>`)
4. Adjust typography settings (preset, font, size)
5. Set alignment (left, center, right)

**Recommended heading presets:** h2, h3, or h4 depending on page hierarchy.

## Image Guidelines

| Aspect Ratio | Recommended Size | When to Use |
|--------------|------------------|-------------|
| Portrait (3:4) | 600 × 800px | Fashion, apparel, portraits |
| Square (1:1) | 600 × 600px | Lifestyle, products |
| Landscape (4:3) | 800 × 600px | Scenes, wide shots |

**Tips:**
- Use consistent image sizes across all collections
- Ensure the subject is centered for good cropping
- Keep file sizes under 500KB for faster loading

## Mobile Behavior

On mobile devices (under 750px):
- Layout changes to vertical (heading above tiles)
- Tiles scroll horizontally
- Only 3 tiles visible initially (in grid mode)
- Tile width reduces to 124px

## Carousel vs Grid

### Grid Layout
- All tiles visible at once
- Best for 3-4 collections
- Clean, static appearance

### Carousel Layout
- Navigation arrows appear below heading
- Tiles scroll smoothly
- Best for 5+ collections
- Arrows auto-disable at scroll limits

## Content Tips

1. **Choose meaningful collections**: Select collections that represent your brand's key categories
2. **Keep titles short**: Titles display in uppercase (e.g., "WEDDING GUEST", "BRIDESMAID")
3. **Use high-quality images**: Collection images are the visual focus
4. **Test on mobile**: Ensure images and titles look good at smaller sizes

## Troubleshooting

### Images not showing
- Ensure each collection has an image set in the collection settings
- Check that the image file format is supported (JPG, PNG, WebP)

### Tiles not appearing
- Verify collections are published and not empty
- Check that the collection list setting has collections selected

### Carousel arrows not working
- Ensure JavaScript is enabled in the browser
- Check the browser console for errors
- Try refreshing the page

### Layout looks different than expected
- Clear your browser cache
- Check if custom CSS is overriding styles
- Verify the color scheme hasn't changed container widths
