# Resolving Issues in the Horizon Theme

## Instructions

This guide outlines the process for resolving issues in the Horizon theme, from identifying the issue through implementation and testing.

## Auto-compact trigger

When user references a GitHub issue URL or says "fix issue #[number]", automatically:

1. Use `./scripts/view-issue.sh [issue-number]` to fetch and analyze issue details
2. Search for relevant code using `codebase_search` and `grep_search`
3. Implement the solution following existing patterns
4. Run specific tests first, iterate until they pass
5. Run full test suite to check for regressions
6. Verify solution works and determine if new tests are needed (see `.cursor/references/writing-tests.md`)
7. Create commits with one-liner messages and user-facing PR (see `.cursor/references/pushing-changes.md`)

## Steps to resolve issues

### Step 1: Identify the Issue

**Important**: Always ask the user which issue number they want to work on if they haven't specified one. Don't assume or pick an issue without confirmation.

Use `./scripts/view-issue.sh [issue-number]` to read the issue details. This script will show:

- Issue title
- Issue body with requirements/description
- Assignment information
- Comments and status

When reading an issue, identify:

- The main problem or feature request
- Specific requirements or acceptance criteria
- Any visual examples or screenshots provided
- Related context or constraints

### Step 2: Implement the Solution

**Understanding the requirements:**

- Analyze the issue thoroughly to understand what needs to be changed
- Identify all acceptance criteria and edge cases
- Consider both the primary functionality and any side effects

**Finding the relevant code:**

- Use `codebase_search` to find related implementations
- Use `grep_search` for exact pattern matching
- Locate key files that need modification
- Identify existing patterns and conventions to follow
- Find related functionality that might be affected

**Implementation approach:**

1. Plan the solution before coding
2. Consider different approaches and their trade-offs
3. Follow existing patterns in the codebase
4. Implement the most straightforward solution that meets requirements
5. Make minimal, targeted fixes

**Solution implementation:**

- Make changes incrementally
- Test as you go
- Follow the theme's coding standards
- Ensure changes are backwards compatible when applicable
- Add comments sparingly, only when the logic is not self-explanatory or is solving a very narrow edge case or browser compatibility concern

**Testing approach:**

- Use `npm run dev` to run the theme locally on development store
- Test the specific requirements from the issue
- Check edge cases and different scenarios
- Verify no regressions were introduced
- Test on different devices/browsers if relevant

### Step 3: Verify Solution and Add Test Coverage if Needed

After implementing a solution:

1. **Run tests iteratively**

   - **First, run tests specific to your changes**: `npm run test [path-to-specific-test] -- --reporter=list`
     - Example: `npm run test tests/suites/theme1/sections/footer/social-links.spec.js -- --reporter=list`
   - Iterate and fix until these specific tests pass
   - Update test selectors when changing ARIA roles or DOM structure
   - **Then, run the full test suite** to check for regressions: `npm run test -- --reporter=list`
   - Fix any unexpected test failures caused by your changes

2. **Verify the implementation works correctly**

   - Test the solution locally using `npm run dev`
   - Check both the specific issue requirements and edge cases
   - Ensure no regressions were introduced

3. **Determine if automated tests should be added**
   - Consider adding tests if:
     - The feature has conditional logic or complex behavior
     - The bug fix prevents a regression that could easily reoccur
     - There's no existing test coverage for the area
   - Check existing coverage by searching in `tests/` directory
   - Refer to `.cursor/references/writing-tests.md` for detailed instructions on writing tests

### Step 4: Push Changes and Create Pull Request

Once your implementation is complete and all tests are passing, you'll need to push your changes and create a pull request.

**Commit standards:**

- **Use one-liner commit messages** - no multi-line messages
- Make concise, descriptive commits
- **Amend commits** with `git commit --amend -m "message"` if needed
- **Force push safely** with `--force-with-lease` after amending

**Key points:**

- Stage and commit your changes with clear, descriptive messages
- Push to your remote branch
- Create a PR with a user-facing title that describes the behavior change
- PR titles should be understandable to end users, not just developers
- Link to the issue being closed and provide comprehensive description

For detailed instructions, refer to `.cursor/references/pushing-changes.md`

### Step 5: Write down learnings

Once the task is complete, you should analyze the work done and write down any new learnings. This is especially important if the user corrected your work at some point.

For detailed instructions, refer to `.cursor/references/reinforcement.md`

## What works well

- Using existing utilities and patterns in the codebase
- Leveraging Liquid's built-in capabilities for theme logic
- Following established CSS patterns and variables
- Maintaining consistency with the theme's architecture
- Running tests iteratively - specific tests first, then full suite for regressions

## What doesn't work well / Pitfalls to Avoid

- Making assumptions about requirements - always clarify if unsure
- Over-engineering solutions - keep it simple and maintainable
- Ignoring edge cases - consider all scenarios
- Not testing thoroughly before considering the issue resolved
- Skipping the full test suite - always run it after specific tests pass
- Multi-line commit messages - keep them concise
- Missing test dependencies - if you get errors about missing packages, run `npm install` to install all dependencies

## References

- **GitHub CLI Troubleshooting**: [gh-cli-troubleshooting.md](../references/gh-cli-troubleshooting.md) - Solutions for common GitHub CLI issues
- **Writing Tests**: [writing-tests.md](../references/writing-tests.md) - Guide for writing high-quality tests (coming soon)
- **Pushing Changes**: [pushing-changes.md](../references/pushing-changes.md) - Standard process for pushing changes and creating pull requests

## Summary

The key to successfully resolving issues is to:

1. Fully understand the requirements
2. Find and understand the existing code
3. Implement a clean, tested solution
4. Run specific tests, then full suite for regressions
5. Verify it works and add tests if needed
6. Create clear commits and user-facing PR
