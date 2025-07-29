# Pushing Changes and Creating Pull Requests

This guide covers the standard process for pushing your changes and creating pull requests in the Horizon theme.

## Steps

Once your implementation is complete and all tests are passing:

### 1. Stage and commit files

```bash
git add [files to commit]
git commit -m "Brief description of changes

- More detailed point about what changed
- Another key change
- Any other relevant details"
```

For test files specifically:

```bash
git add tests/suites/theme1/sections/[component]/[test-file].spec.js \
        tests/suites/theme1/sections/[component]/index.[view-name].json
git commit -m "Add [component] tests

- Brief description of what tests cover
- List key test scenarios"
```

### 2. Push to remote branch

```bash
git push origin [branch-name]
```

### 3. Create pull request

```bash
gh pr create --title "[User-facing description of change]" --body-file .github/pull_request_template.md
```

**Note**: The PR template at `.github/pull_request_template.md` requires these sections:

- **Why are these changes introduced**: User-facing explanation and issue reference
- **What approach did you take?**: Technical implementation details
- **Decision logs**: Important decisions made during implementation
- **Testing steps/scenarios**: Clear steps for reviewers to test changes

## Important Guidelines

### PR Title

- **Write titles in a user-facing way** rather than developer-oriented
- Focus on the behavior change or value to merchants
- Examples:
  - ✅ Good: "Hide social media icons that don't link to actual profiles"
  - ❌ Avoid: "Added anchor logic to social media links"
  - ✅ Good: "Fix product images overlapping on mobile devices"
  - ❌ Avoid: "Update CSS z-index for product gallery"

### PR Description

- Always link to the issue being closed with `Closes #[issue-number]`
- Explain the "why" from a user perspective first
- Include technical details in the approach section
- Document any important decisions made
- **Provide clear testing steps** with checkboxes for reviewers to follow
- List all files added/modified and their purpose

### Commit Messages

- First line should be a brief summary (50 chars or less)
- Add detailed bullet points for complex changes
- Reference issue numbers when relevant
- Group related changes in logical commits

### Testing Steps Example

Good testing steps are:

- Clear and specific
- Easy for reviewers to follow
- Cover both happy path and edge cases
- Include expected results

Example:

```
### Testing steps/scenarios
- [ ] Run `npm run dev` and navigate to any page with a footer
- [ ] Verify social media icons with profile URLs (e.g., instagram.com/shopify) are visible
- [ ] Add a social link with just the domain (e.g., instagram.com) in theme editor
- [ ] Verify the domain-only link is hidden on the storefront but visible in editor
- [ ] Run `npm run test tests/suites/theme1/sections/footer/social-links.spec.js`
- [ ] Verify all tests pass
```

## Common Scenarios

### Updating an existing PR

```bash
# Make additional changes
git add [modified files]
git commit -m "Address review feedback"
git push origin [branch-name]
```

### Updating PR title/description

```bash
gh pr edit [PR-number] --title "New title" --body "New description"
```

### Checking PR status

```bash
gh pr view [PR-number]
# Or open in browser
gh pr view [PR-number] --web
```
