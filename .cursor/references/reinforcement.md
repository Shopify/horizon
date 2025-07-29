# Documenting Learnings and Reinforcement

This guide covers how to document learnings, patterns, and insights gained during task completion to continuously improve our documentation and processes.

## Purpose

During any task, you may discover new patterns, encounter unexpected issues, or learn better ways of doing things. These learnings should be captured and documented to help with future similar tasks.

## Steps

### 1. Identify Learning Opportunities

While working on any task, watch for:

- **User corrections or feedback** - Often indicates gaps in understanding or documentation (especially important as these point to valuable learning opportunities)
- **Unexpected issues or edge cases** - Problems not covered in existing guides
- **Better approaches discovered** - More efficient or cleaner ways to accomplish tasks
- **Pitfalls encountered** - Things that went wrong and how to avoid them
- **Ambiguous documentation** - Places where existing guides could be clearer

### 2. Document Learnings During the Task

When you identify a learning opportunity:

- Navigate to the relevant documentation file
- Update the file with new learnings, patterns, or clarifications

When documenting learnings:

- **Avoid task-specific details** - Focus on general patterns that apply broadly
- **Use clear examples** - Show both good and bad approaches when helpful
- **Explain the "why"** - Don't just document what to do, but why it matters
- **Include context** - When does this learning apply vs when doesn't it

**Important**: Write down learnings as they happen, but don't commit them until the main task is complete.

### 3. Commit Learnings at Task Completion

After completing the main task, commit documentation updates separately:

```bash
# First, commit your main work
git add [implementation files]
git commit -m "Implement [feature/fix description]

- Key implementation details
- Other relevant changes"

# Then, if you have learnings to document, commit them separately
git add .cursor/prompts/[relevant-file].md .cursor/references/[relevant-file].md
git commit -m "Update documentation with new learnings

- Add pattern for [specific learning]
- Clarify [ambiguous instruction]
- Document [pitfall/edge case]"
```

## Important Guidelines

### What Makes a Good Learning

- **Actionable** - Someone else can follow the guidance
- **Well defined** - Clear about when and how to apply
- **General enough** - Applies to multiple similar situations
- **Evidence-based** - Based on actual experience, not speculation

### Types of Learnings to Document

#### Process Improvements

```markdown
# When working with complex components

1. Read existing tests first to understand expected behavior
2. Check for edge cases in issue descriptions
3. Test both happy path and error scenarios
```

#### Tool Usage Examples

```markdown
# Example: Playwright testing patterns

- Use data-testid attributes for reliable element selection
- Prefer user-facing selectors (role, label) over CSS selectors
- Always test responsive behavior when UI changes are involved
```

### It's OK to Have No Learnings

- **Straightforward tasks** - If everything went as expected with no surprises
- **Well-documented processes** - When existing guides covered everything perfectly
- **Simple implementations** - Basic changes with no new patterns discovered

**Note**: It's perfectly normal to complete tasks without new learnings. Don't force documentation updates when none are needed.

## Committing Documentation Updates

When you have learnings to document:

```bash
# Add all documentation updates at once
git add .cursor/
git commit -m "Update documentation with new learnings

- Brief description of key patterns/insights added"
```

## Examples of Good Learnings

### Process Clarification

```markdown
# Before making accessibility changes

1. Run existing accessibility tests to establish baseline
2. Use automated tools (lighthouse, axe) during development
3. Test with actual screen readers when possible
4. Document any new patterns for future accessibility work
```

### Tool Usage Insight

```markdown
# Git workflow for theme development

- Create feature branches from main, not from other feature branches
- Test thoroughly on development stores before merging
- Use descriptive commit messages that explain user-facing impact
```
