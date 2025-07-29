# Writing Tests for Liquid Themes - Reference Guide

This document contains the detailed process and best practices for writing tests for Liquid themes.

## Process Steps

### Step 1: Understand What Needs Testing

- Have a clear understanding of what component or feature needs testing
- This could come from:
  - A GitHub issue number
  - A specific user request
  - A component name or behavior description
- **If you don't know what needs testing, ask the user** - Don't make assumptions
- Once you have clarity, use `scripts/view-issue.sh <issue-number>` if a GitHub issue is involved

### Step 2: Identify Test Location

- Check `tests/suites/theme1` for existing test directories
- First decision: Templates vs Sections folder?
  - **Templates**: Tests for page-level functionality (cart, product, search pages)
    - Testing interactions across multiple components on a page
    - Testing page-specific behaviors and flows
    - Often involves navigation between pages
  - **Sections**: Tests for individual components/sections in isolation
    - Testing specific component behavior (accordion, header, product-card)
    - Focus on reusable component functionality
    - Component-specific features and interactions
- Second decision: Is this the same component or a different component?
  - Same component = add to existing test file
  - Different component = create new test file

### Step 3: Create Test Files and Plan Tests

- Create the test spec file in the appropriate test directory (e.g., `tests/suites/theme1/sections/{component}/`)
- Add comments outlining each test to be written (don't implement yet)
  - Use descriptive test names that explain what will be tested
  - Add TODO comments for test implementation
- Create test view JSON files in the same test directory
  - Naming pattern: `index.{descriptive-name}.json`
  - Each test scenario may need its own view configuration
  - Implement complete JSON configurations
- Test views referenced in spec files using `?view={name}` pattern
- Keep test spec and test view files together in the component's test directory

#### Example of Step 3 Test Planning:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Component Name', () => {
  // TODO: Implement test
  test('should perform expected behavior', async ({ page }) => {
    // Test that component behaves as expected
    // 1. Navigate to test view
    // 2. Interact with component
    // 3. Verify expected behavior
    // 4. Check edge cases
  });

  // TODO: Implement test
  test('should handle configuration settings correctly', async ({ page }) => {
    // Test that settings from schema work properly
    // 1. Navigate to test view with specific settings
    // 2. Verify component reflects those settings
    // 3. Test different setting combinations
  });
});
```

#### Determining if Multiple Views are Needed

Before creating multiple view files, investigate:

1. **Can the component attributes be configured via JSON settings?**

   - Check the block's schema for exposed settings
   - If attributes aren't in the schema, they can't be set via JSON

2. **Do the test scenarios conflict?**

   - Can multiple instances with different configurations exist on the same page?
   - Are the behaviors mutually exclusive?

3. **Is it testing default behavior?**
   - Example: Multiple `<details>` elements are naturally independent
   - Default behaviors might not need special configuration

**Key Finding**: If component attributes aren't exposed in the block schema, those test cases should be skipped or tested where the attributes naturally occur in the theme.

**Important Principle**: Never create new Liquid files for test cases. Always use JSON template configuration to set up test scenarios.

### Step 3a: Discover All Test Cases

Before creating test files, thoroughly investigate the component to find all testable features:

- **Read the component's JavaScript file** to identify all data attributes and behaviors
- **Check existing usage** in blocks/snippets to see different configurations
- **Review CSS** for visual states and responsive behaviors
- **Look for attributes not mentioned in the issue**

Common discoveries:

- Opposite behaviors (e.g., `data-disable-on-mobile` when issue only mentions desktop)
- Default state attributes (e.g., `open-by-default-on-mobile/desktop`)
- Media query handlers that change behavior on viewport resize
- Visual feedback states (cursor changes, animations)

### Step 3b: Consider Existing Test Files

Before creating new test files, check if tests can be added to existing specs:

- **Component usage in snippets**: If the component is used in snippets (filters, sorting), tests may already exist or can be added to related specs
- **Leverage existing test infrastructure**: Adding to existing specs means reusing their setup and test data
- **Test real-world usage**: Testing the component where it's actually used provides more realistic coverage

Example findings:

- Escape key functionality might already be tested in filter components
- Component behavior in cart contexts might be tested in cart-related specs
- Adding missing tests to existing specs is preferred over creating isolated component tests

### Step 3c: Filter Out Non-Testable Cases

**Important**: Ignore test cases that can't be created through schema settings

- If an attribute is only hardcoded in snippets/blocks and not exposed in schema, it may not be testable in isolation
- Focus on what's actually configurable through JSON settings
- Consider testing these behaviors where they naturally occur

### Step 3d: Consolidate Test Views

Aim to use as few test view files as possible by combining non-conflicting test cases:

- **Analyze attribute compatibility**: Which attributes can coexist?
- **Group by viewport**: Mobile-specific and desktop-specific tests often can't share views
- **Combine orthogonal features**: Features that test different aspects can often share a view
- **Use multiple instances**: A single view can have multiple component instances with different configs

Example groupings:

- Keyboard behavior can combine with default state tests
- Multiple instances test can include instances with different attributes
- Visual states can be tested within functional tests

### Step 4: Create Test Implementation

- Write the actual test implementations based on the planned comments
- Follow existing test patterns in the codebase
- Use appropriate Playwright locators and assertions
- Test one behavior per test for clarity
- Include both positive and negative test cases where applicable
- Verify tests pass before considering complete

#### Test Implementation Guidelines:

- Use descriptive variable names for locators
- Add comments explaining complex test logic
- Wait for elements appropriately (avoid arbitrary timeouts)
- Test user interactions as realistically as possible
- Verify both the action and its result
- **Never use console.log statements** - Use comments for documentation instead

#### Test Files

Create test spec files with:

- Clear test descriptions
- Proper imports (viewports, custom assertions)
- Debug tests to verify element rendering
- Actual test implementations

#### Test View JSON Files

Create JSON configuration files:

- Name them without "test-" prefix (e.g., `index.component-behaviors.json`)
- Include all required section settings
- Use existing test views as templates for settings structure

**Example Section Settings Structure:**

```json
"settings": {
  "content_direction": "column",
  "gap": 12,
  "horizontal_alignment": "flex-start",
  "vertical_alignment": "center",
  "horizontal_alignment_flex_direction_column": "flex-start",
  "vertical_alignment_flex_direction_column": "center",
  "section_width": "page-width",
  "color_scheme": "",
  "video_position": "cover",
  "background_image_position": "cover",
  "border": "none",
  "border_width": 1,
  "border_opacity": 100,
  "border_radius": 0,
  "padding-block-start": 20,
  "padding-block-end": 20,
  "padding-inline-start": 0,
  "padding-inline-end": 0
}
```

### Step 5: Test Setup - Copy Test Files

Once your test files are created:

1. Run `npm run test:setup` to copy test view files to the main theme
2. This command:
   - Copies JSON files from test directories to root templates/sections folders
   - Adds "test-" prefix to filenames (e.g., `index.component-behaviors.json` → `index.test-component-behaviors.json`)
   - Creates test-specific themes in `tests/themes/`
3. **Important**: You don't need to run `npm run build:schemas` for test views

### Step 6: Running Tests and Debugging

#### Running Tests

- Run specific test file: `npx playwright test [path-to-test-file] --reporter=list`
- Run all tests: `npm run test`
- Run with UI for debugging: `npm run test:ui`

#### Common Issues and Solutions

1. **"Element not found" errors**

   - Verify test view JSON is correctly structured
   - Check that the test URL matches the view name (e.g., `/?view=test-component-behaviors`)
   - Remember that block names in JSON become HTML elements

2. **Understanding element rendering**

   - Blocks with custom Liquid files render their own elements
   - Always verify actual HTML structure before writing selectors

3. **Debugging tips**

   - For temporary debugging during development, you can add debug tests:

   ```javascript
   test('debug: check what elements are on page', async ({ page }) => {
     await page.goto('/?view=test-view-name');
     const elements = await page.locator('element-selector').all();
     console.log(`Found ${elements.length} elements`);
   });
   ```

   **Note**: Remove debug tests and console.log statements before committing. Any important observations should be documented as comments instead.

   - Use `npm run test:ui` to see tests run interactively
   - Check browser console for JavaScript errors

4. **Test timeouts**
   - Default timeout is 30 seconds
   - Elements might not be loading due to:
     - JavaScript errors
     - Incorrect test view structure
     - Missing required settings in blocks

#### Fixing Test Failures

When tests fail with "element not found" errors:

1. **Check section settings** - Sections often require specific settings to render properly
2. **Use existing test views as templates** - Copy settings from working test views in the same directory
3. **Run debug tests first** - Always create a debug test to verify elements are on the page before writing actual tests

### Step 7: Commit and Create Pull Request

Once all tests are passing:

1. **Stage and commit test files**

   ```bash
   git add tests/suites/theme1/sections/[component]/[test-file].spec.js \
           tests/suites/theme1/sections/[component]/index.[view-name].json
   git commit -m "Add [component] tests

   - Brief description of what tests cover
   - List key test scenarios"
   ```

2. **Push to remote branch**

   ```bash
   git push origin [branch-name]
   ```

3. **Create pull request**

   ```bash
   gh pr create --title "Add tests for [Component Name]" --body "### Why are these changes introduced:
   Closes #[issue-number]

   [Brief description of what tests were added]

   ### What approach did you take?

   [Description of testing approach]

   ### Decision logs

   [Any key decisions made during implementation]

   ### Tests that were added

   [List all test files and what they test]"
   ```

### Step 8: Write down learnings

Once the task is complete, you should analyze the work done and write down any new learnings. This is especially important if the user corrected your work at some point.

For detailed instructions, refer to `.cursor/references/reinforcement.md`

## What Works Well

- **Component Identity for Test Organization**: When deciding where to place tests, focus on whether it's the same component or a different component, not on the complexity or type of features

  - Example: `accordion` vs `accordion-custom` are different components, so they get separate test files

- **Templates vs Sections Distinction**:

  - Templates folder = page-level tests (testing entire page flows, multiple components interacting)
  - Sections folder = component-level tests (testing individual components in isolation)
  - Example: Testing cart functionality across the cart page goes in `templates/cart/`, but testing just the accordion component behavior goes in `sections/accordion/`

- **JSON-Only Test Configuration**:

  - Never create new Liquid files for test cases
  - Always use JSON template configuration to set up test scenarios
  - Only test features that are exposed through block schemas

- **Test Where Components Are Used**:

  - If a component behavior is only available in specific contexts (like filters), test it there
  - Leverage existing test infrastructure rather than creating isolated tests
  - Real-world usage tests are more valuable than artificial component isolation

- **Minimize Test Views**:

  - Consolidate non-conflicting test cases into single views
  - Use multiple component instances in one view rather than multiple views
  - Only create separate views when test scenarios genuinely conflict

- **Separate Planning from Implementation**:

  - Step 3: Create files with test outlines and TODO comments
  - Step 4: Implement the actual test code
  - This approach helps clarify test intent before diving into implementation
  - Makes code review easier by showing test planning separately

- **Direct playwright commands** - Use `npx playwright test <filepath>` for running specific tests
- **Test isolation** - Each test runs independently with proper setup/teardown

## What Doesn't Work / Pitfalls to Avoid

- **Creating test views in the root templates folder** - They must be created in the test directories first
- **Adding `test-` prefix manually** - The build script adds this automatically
- **Using custom-liquid blocks for testing** - Tests should only use blocks exposed through schemas
- **Testing features not exposed in block schemas** - Can't test attributes that aren't configurable
- **Creating new Liquid files** - Only JSON test views should be created
- **Using `npm run build:schemas` for test views** - This command is only needed when making changes to files in the root `schemas/` folder
- **Isolated test files for every small feature** - Add tests to existing related test files when possible
  - Group by functional similarity instead
- **Assuming component structure** - Always verify the actual HTML structure and component names before writing tests (e.g., menu might not use expected element names)
- **Complex npm script syntax** - Prefer direct playwright commands over npm scripts with complex parameter passing
- **Skipping failing tests** - This is never acceptable. Tests must be fixed, not skipped. Every test exists for a reason.
- **Using console.log in test files** - Tests should not contain console.log statements. Use descriptive test names and comments instead of logging. Any necessary context should be in comments, not runtime logs.

## Test Implementation Notes

- **Discovery is crucial**: Thoroughly investigate all uses of a component before deciding test strategy
- **Schema drives testability**: What's exposed in block schemas determines what can be tested via JSON
- **Context matters**: Testing components in their real usage contexts provides better coverage than isolated tests
- **Fewer files is better**: Consolidate where possible while maintaining clarity
- **Plan before implementing**: Create test outlines with comments before writing code
- **Clear test progression**: Step 3 creates structure, Step 4 adds implementation

## Additional Notes

### Using Viewport Utilities

When writing tests that need to handle different viewport sizes (desktop, mobile, tablet), use the viewport utilities provided in `tests/utils/viewports.js` instead of hardcoding viewport dimensions.

**Import the viewport utilities:**

```javascript
import { desktopViewport, mobileViewport } from '@/utils/viewports';
```

**Use viewport utilities in tests:**

```javascript
// Set desktop viewport
await page.setViewportSize({ width: desktopViewport.width, height: desktopViewport.height });

// Set mobile viewport
await page.setViewportSize({ width: mobileViewport.width, height: mobileViewport.height });
```

**Available viewports:**

- `desktopViewport`: 1800x1000 pixels (above 750px breakpoint)
- `mobileViewport`: 480x700 pixels (below 750px breakpoint)
- `viewports` array: Contains all viewport configurations including tablet (768x1000)

**Why use viewport utilities:**

- Consistency across all tests
- Easy to update viewport sizes globally
- Self-documenting code (clearer than magic numbers)
- Follows established patterns in the codebase

**Note on breakpoint testing:** Even when testing viewport-specific behavior (like components that change at the 750px breakpoint), use the viewport utilities. They're positioned well above and below the breakpoint (480px < 750px < 1800px), making them suitable for all viewport transition testing. Custom viewport sizes should only be used when testing very specific edge cases that require exact pixel values.

### Using Playwright's Recommended Locators

Following [Playwright's locator best practices](https://playwright.dev/docs/locators), prioritize accessibility-based locators over CSS selectors:

**Preferred locators (in order of priority):**

1. **`getByRole()`** - Use for elements with ARIA roles (buttons, headings, links, etc.)

   ```javascript
   // Good - finds button by its accessible name
   const accordion = page.getByRole('button', { name: 'Accordion Title' });

   // Avoid - using CSS selector
   const accordion = page.locator('summary.details__header');
   ```

2. **`getByText()`** - Use for finding non-interactive elements by text content

   ```javascript
   // Good - finds element by text
   const message = page.getByText('Welcome message');

   // Avoid - using class selector
   const message = page.locator('.welcome-message');
   ```

3. **`getByLabel()`** - Use for form controls with associated labels
4. **`getByPlaceholder()`** - Use for inputs with placeholder text
5. **`getByTestId()`** - Use when other locators aren't suitable

**Key principles:**

- Avoid CSS class selectors (`.class-name`) as they're implementation details
- Avoid element selectors (`div`, `span`) without semantic meaning
- Use accessible names and roles that reflect how users perceive the page
- Add `data-testid` attributes when accessibility locators aren't sufficient
- **Ensure elements have accessible names** - If using `getByRole('link', { name: 'text' })`, the link must have an accessible name via aria-label, aria-labelledby, or visible text content

**Example improvements:**

```javascript
// Before - using CSS selectors
const accordions = page.locator('accordion-custom details');
const summary = accordions.nth(0).locator('summary');

// After - using role-based locators
const firstAccordion = page.getByRole('button', { name: 'Accordion Title 1' });
```

**Note:** When you need to navigate from one element to another (like from a button to its parent details element), consider adding `data-testid` attributes for cleaner test code instead of chaining `.locator('..')`.

**Avoid using `page.locator()` with CSS selectors** - Always prefer semantic locators like `getByRole()`, `getByText()`, etc. Only use `.locator()` on already-found elements when accessing child elements that don't have semantic alternatives.

### Page Object Model Pattern

The codebase uses the [Page Object Model (POM) pattern](https://playwright.dev/docs/pom) to reduce repetition and improve test maintainability. Page objects are stored in `tests/page-object-models/`.

1. **When to create a page object**

   - When you have multiple tests interacting with the same component
   - When you need to encapsulate complex locator logic
   - When you want to share common actions across tests

2. **Structure of a page object**

   ```javascript
   export class ComponentPage {
     constructor(page) {
       this.page = page;
       // Define locators as properties
       this.myLocator = this.page.locator('component-name');
     }

     // Navigation methods
     async goToTestPage() {
       await this.page.goto('/?view=test-view-name');
       await this.myLocator.waitFor({ state: 'visible' });
     }

     // Action methods
     async performAction() {
       // Encapsulate complex interactions
     }
   }
   ```

3. **Using page objects in tests**

   ```javascript
   const { test, expect } = require('@playwright/test');
   const { ComponentPage } = require('../../../../page-object-models/component');

   test('my test', async ({ page }) => {
     const componentPage = new ComponentPage(page);
     await componentPage.goToTestPage();
     await componentPage.performAction();
   });
   ```

### Data-Driven Test Patterns

When testing multiple similar elements (like social media links), organize test data as an array of objects:

```javascript
// Good - data-driven approach
const socialLinksData = [
  { platform: 'Instagram', href: 'https://www.instagram.com/shopify', domain: 'instagram.com' },
  { platform: 'Threads', href: 'https://www.threads.net/@shopify', domain: 'threads.net' },
  // ... more links
];

// Then iterate over the data
for (const { platform, href } of socialLinksData) {
  const link = page.getByRole('link', { name: platform });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', href);
}
```

**Benefits:**

- Clear relationship between test data and assertions
- Easy to add/remove test cases
- Maintains order for sequential testing
- Reduces repetition in test code

### Test File Organization

## Key Principles Summary

- **Never use custom-liquid blocks or sections for testing** - They bypass liquid processing needed for tests
- **Test views must be created in test directories**, not root templates folder
- **Schema drives testability** - Only test features exposed through block schemas
- **Consolidate test views** where possible to reduce complexity
- **Test planning (Step 3) should be separate from implementation** (Step 4)
- **Always run debug tests first** to verify elements are rendering correctly
- **Use existing test views as templates** for required section settings

## Summary

The process for writing tests involves:

1. Understanding requirements from GitHub issues
2. Exploring existing test patterns
3. Planning test cases (including discovering undocumented features)
4. Creating test views in the correct location (without `test-` prefix)
5. Writing test implementations
6. Running `npm run test:setup` to prepare files
7. Running tests with `npx playwright test <filepath>`
8. Fixing failing tests by checking actual implementation
9. Creating a PR with organized commits and proper documentation
10. Iterating based on results

Key learnings:

- Test what's exposed through block schemas
- Place tests where features naturally occur
- Verify component structure before writing assertions
- Use minimal test views
- Run tests early and often to catch issues
- Section settings are crucial for proper rendering

## Step 7: Update Documentation

Update this guide as you learn new patterns or encounter issues.

## Common Patterns and Pitfalls

### Playwright Locator Best Practices

1. **Prefer semantic locators over CSS selectors**

   - Use `getByRole()`, `getByText()`, `getByTestId()` instead of raw CSS
   - Add `data-testid` attributes to Liquid files when needed

2. **Handle duplicate text carefully**

   - If text appears multiple times, use more specific filters:

   ```javascript
   // BAD - might match multiple elements
   const summary = page.getByText('Menu Title', { exact: true });

   // GOOD - more specific
   const details = page.getByTestId('menu-details').filter({
     has: page.locator('summary').filter({ hasText: 'Menu Title' }),
   });
   const summary = details.locator('summary').first();
   ```

3. **Understand the DOM structure**

   - Check how elements are actually rendered, not just the Liquid templates
   - Summary elements with heading classes (e.g., `class="h3"`) are not actual headings
   - Use browser DevTools to inspect the rendered HTML if tests are failing

4. **Click the right element**
   - For accordions, click on the summary element, not the details
   - Some elements may have multiple clickable areas - be specific

### Test File Organization
