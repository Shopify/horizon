# Get Breaking Changes

This command helps identify confirmed breaking changes merged since the last breaking version in a repository.

**Modified Approach**: Instead of searching through commits, this process focuses on pull requests that have been explicitly labeled with "Breaking changes" to identify confirmed breaking changes.

## Command Steps:

### 1. Get All SEMVER Tags

```bash
# Using GitHub CLI to get all SEMVER tags
gh api repos/:owner/:repo/git/refs/tags --jq '.[].ref' | sed 's|refs/tags/||' | grep -E "^[0-9]+\.[0-9]+\.[0-9]+$" | sort -V

# Alternative using git
git show-ref --tags | grep -E "refs/tags/[0-9]+\.[0-9]+\.[0-9]+$"
```

### 2. Identify Last Breaking Version

- In SEMVER, breaking changes occur when major version increases
- Find the first version in the current major version series (e.g., 1.0.1 for 1.x.x series)
- This represents the last breaking change

### 3. Get Breaking Version Commit Date

```bash
# Get commit date for the breaking version tag
git show --format="%ci" --no-patch <TAG_NAME>
```

### 4. Find Pull Requests with Breaking Changes Label

```bash
# Search for merged PRs with "Breaking changes" label merged to main since the breaking version date
gh pr list --label "Breaking changes" --state merged --search "merged:>YYYY-MM-DD base:main" --json number,title,mergedAt,url

# Example: Find breaking changes PRs merged to main after 2025-05-22
gh pr list --label "Breaking changes" --state merged --search "merged:>2025-05-22 base:main" --json number,title,mergedAt,url
```

### 5. Get PR Details

Use `fetch_pull_request` tool to get full details of each breaking change PR:

```
fetch_pull_request(pullNumberOrCommitHash: "PR_NUMBER")
```

### 6. Classify Breaking Changes

Review each PR and classify by impact type:

- **API Changes**: Removal or modification of public APIs
- **Configuration Changes**: Removal of settings or configuration options
- **Behavior Changes**: Changes that could break existing functionality
- **Schema Changes**: Changes to data structures or interfaces
- **Removal of Features**: Deprecated or removed functionality

Save the analysis into the breaking-changes.md file. If the file already contains text, replace it.

### 7. Analyze Solution Patterns

Examine the template file changes in each breaking change PR to identify actionable patterns for solving the breaking changes:

- Look at `/templates` directory changes in the PR diffs
- Identify common patterns in how configurations were updated (settings removal, block type changes, etc.)
- Focus on specific find/replace patterns that can be applied systematically
- Add these patterns to the breaking-changes.md file as shown in the example output format

## Example Output Format:

```
## Breaking Changes Since Last Breaking Version (X.Y.Z)

### Confirmed Breaking Changes:
1. **PR #XXXX** - "Title" (Merged: DATE)
   - **Type**: API Changes/Configuration Changes/Behavior Changes/etc.
   - **Impact**: Description of what breaks and how it affects users

2. **PR #YYYY** - "Title" (Merged: DATE)
   - **Type**: Schema Changes
   - **Impact**: Description of breaking changes

### Potential Breaking Changes:
1. **PR #ZZZZ** - "Title" (Merged: DATE)
   - **Needs Review**: Description of potential impact that requires further analysis

## Summary:
X confirmed breaking changes found since version X.Y.Z (DATE)

**Key Areas of Impact:**
- Brief summary of main breaking change categories
- Notes on merchant/user impact

## Solving breaking changes

Based on the template file changes in the breaking change PRs, here are the key patterns to follow when updating themes:

### Breaking Change Name (PR #XXXX):
- Specific find/replace pattern or configuration change needed
- Another configuration change with before/after example
- Remove/add specific settings or block types

### Another Breaking Change (PR #YYYY):
- Different set of patterns for this breaking change
- Specific block type replacements needed
- Configuration updates required
```

## Usage Notes:

- Focus on changes that would require users to modify their code/configuration
- Internal refactoring may not be breaking unless it affects public APIs
- Consider both technical breaking changes and UX breaking changes
- Document the rationale for why each change is considered breaking
