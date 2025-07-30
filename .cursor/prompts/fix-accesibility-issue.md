# Fix Accessibility Issue

Analyze and fix accessibility issues in web applications, following the standard GitHub issue workflow with accessibility-specific considerations.

## Usage

```
Fix accessibility issue in [COMPONENT_NAME] or Fix GitHub accessibility issue #[NUMBER]
```

## Accessibility Rules Reference

**IMPORTANT**: Use the `fetch_rules` tool to access specific accessibility rules for components you're working on:

- `accordion-accessibility`: Accordion component ARIA patterns
- `breadcrumb-accessibility`: Breadcrumb navigation patterns
- `carousel-accessibility`: Carousel/slider ARIA compliance
- `cart-drawer-accessibility`: Cart drawer accessibility patterns
- `color-swatch-accessibility`: Color swatch component patterns
- `combobox-accessibility`: Combobox/dropdown ARIA patterns
- `disclosure-accessibility`: Disclosure/collapsible content patterns
- `dropdown-navigation-accessibility`: Navigation dropdown patterns
- `modal-accessibility`: Modal/dialog ARIA Dialog Pattern
- `product-card-accessibility`: Product card accessibility patterns
- `product-filter-accessibility`: Product filtering interface patterns
- `sale-price-accessibility`: Sale price display patterns
- `slider-accessibility`: Slider/range input patterns
- `switch-accessibility`: Toggle switch patterns
- `tab-accessibility`: Tab interface patterns
- `tooltip-accessibility`: Tooltip accessibility patterns

Always fetch and follow the relevant rule(s) for the component you're fixing.

## Base Workflow

**Follow the complete workflow from `fix-github-issue` command**, including:

- Testing requirements (full test suite with `--reporter=line`)
- Commit standards (one-liner messages only)
- Test failure handling and selector updates
- Force push safety with `--force-with-lease`
- Write down learnings as a last step

## Accessibility-Specific Principles

### Critical Implementation Rules

- **Role must be on the element that contains the items** - not the wrapper
- **Screen readers need direct parent-child relationship** between role and items
- **Test with actual screen readers**, not just markup validation
- **Fetch specific component rules** before implementing fixes

### Testing Requirements

In addition to standard testing requirements:

- **Update page object models** when changing roles (e.g., `navigation` → `menubar`)
- **Test with screen readers** to verify actual behavior, not just markup
- **Verify individual items are recognized**, not just containers
- **Test focus states thoroughly** by navigating away and back to components

### Focus Management Best Practices

- **Consistent focus behavior** across all interaction methods (keyboard vs mouse)
- **Focus state bugs are subtle** - may look correct but behave wrong on subsequent interactions
- **Reset focus state properly** when closing dropdowns/menus with ESC vs selection
- **Centralize focus management logic** to avoid duplication and inconsistency

### Performance Considerations

- **Complex keyboard navigation can introduce lag** - balance functionality with performance
- **Test on slower devices** to ensure accessibility JavaScript doesn't impact UX
- **Consider simpler solutions first** before implementing custom keyboard handling

### Implementation Guidelines

- **Fetch and follow existing rules** for the component type you're working on
- **Search for existing ARIA patterns** in the codebase first
- **Make minimal changes** that improve accessibility
- **Focus on semantic correctness** over visual changes
- **Ensure backward compatibility**
- **Don't over-engineer** - native browser behavior often suffices
- **Use `aria-labelledby`** when referencing existing visible text instead of duplicating with `aria-label`

### Code Quality Standards

- **Avoid duplicate logic** between keyboard and mouse interaction handlers
- **Single responsibility principle** - separate ARIA state management from focus management
- **Centralize common patterns** like focus reset and state management
- **Refactor when you find redundancy** in accessibility implementations
