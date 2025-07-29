# GitHub CLI Troubleshooting

## Issue: GitHub CLI Output Being Piped Through Head/Cat

### Problem

When running GitHub CLI commands like `gh issue view`, the output may show errors like:

```
head: |: No such file or directory
head: cat: No such file or directory
```

### Root Cause

The PAGER environment variable is set to something like `head -n 10000 | cat`, which interferes with GitHub CLI's output handling.

### Solution

Unset the PAGER variable before running gh commands:

```bash
unset PAGER && gh issue view [issue-number]
```

### Alternative Solutions

1. Set a different pager temporarily:

   ```bash
   PAGER=less gh issue view [issue-number]
   ```

2. Disable pager for gh completely:

   ```bash
   GH_PAGER="" gh issue view [issue-number]
   ```

3. Use JSON output to bypass pager:
   ```bash
   gh issue view [issue-number] --json title,body
   ```

### Permanent Fix

To avoid this issue permanently, you can:

- Remove or modify the PAGER export in your shell configuration file (~/.zshrc or ~/.bashrc)
- Set GH_PAGER to an empty string in your shell configuration: `export GH_PAGER=""`
