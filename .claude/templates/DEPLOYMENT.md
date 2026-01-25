# Deploying the Shopify Section Scaffold System

Instructions for deploying the task template system to new Shopify theme projects.

## Quick Deploy

Copy these files to your project's `.claude/` directory:

```bash
# From the testtasks project root
cp -r .claude/templates /path/to/your-shopify-project/.claude/
cp -r .claude/skills/scaffold /path/to/your-shopify-project/.claude/skills/
```

## Directory Structure

Your Shopify project should have this structure after deployment:

```
your-shopify-project/
├── .claude/
│   ├── templates/
│   │   ├── template-schema.json        # JSON Schema (optional, for validation)
│   │   └── shopify-section-new.json    # Task template
│   └── skills/
│       └── scaffold/
│           └── SKILL.md                # Skill instructions
├── sections/                           # Shopify sections
├── blocks/                             # Shopify blocks
├── snippets/                           # Shopify snippets
├── assets/                             # CSS/JS files
└── ...
```

## Required Files

### Minimum (Essential)

| File | Purpose |
|------|---------|
| `.claude/templates/shopify-section-new.json` | Task template with agents and workflows |
| `.claude/skills/scaffold/SKILL.md` | Skill instructions for Claude |

### Optional (Recommended)

| File | Purpose |
|------|---------|
| `.claude/templates/template-schema.json` | JSON Schema for template validation |
| `CLAUDE.md` | Project-specific instructions |

## Usage

### Method 1: Invoke the Skill

```
/scaffold
```

Claude will:
1. Load the template
2. Ask requirements questions
3. Create tasks with dependencies
4. Execute with specialized agents

### Method 2: Direct Template Reference

Ask Claude directly:

```
Create a new hero-banner section using the shopify-section-new template.
Figma design: https://figma.com/file/xxx
```

### Method 3: Manual Task Creation

Reference the template structure:

```
Read .claude/templates/shopify-section-new.json and create tasks for a
featured-collection section. Skip Figma-related tasks (no design provided).
```

## Configuration

### Customize Variables

Edit `shopify-section-new.json` to change default values:

```json
"variables": {
  "local_url": {
    "default": "http://localhost:9292"  // Change to your dev server
  },
  "theme_path": {
    "default": "."  // Change if theme is in subdirectory
  }
}
```

### Add Project-Specific Agents

Add new agents to the `agents` object:

```json
"agents": {
  "your-custom-agent": {
    "model": "sonnet",
    "purpose": "What this agent does",
    "prompt": "Detailed instructions..."
  }
}
```

### Modify Task Flow

Edit the `tasks` array to:
- Add new tasks
- Remove unnecessary tasks
- Change dependencies
- Adjust success criteria

## Environment Variables

### Persistent Tasks Across Sessions

Add to your project's `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_TASK_LIST_ID": "your-project-name"
  }
}
```

Tasks will persist at `~/.claude/tasks/your-project-name/`

## Integration with Existing Workflows

### With ClickUp

The task structure maps to ClickUp:
- Each task = ClickUp Task
- Dependencies = ClickUp dependencies
- Success criteria = Acceptance criteria
- Metadata.phase = ClickUp custom field

Export tasks to CSV for ClickUp import:
```
Export current tasks to ClickUp CSV format
```

### With Git Flow

Combine with git-workflow skill:
```
/scaffold shopify-section-new --section-name hero-banner
```
Then after completion:
```
/feature finish
```

### With Figma

Requires Figma MCP server configured. The template uses:
- `mcp__figmaRemoteMcp__get_screenshot`
- `mcp__figmaRemoteMcp__get_metadata`
- `mcp__figmaRemoteMcp__get_variable_defs`

## Customization Guide

### Creating New Templates

1. Copy `shopify-section-new.json` as starting point
2. Modify for your workflow (e.g., `shopify-section-modify.json`)
3. Update the `name` and `description` fields
4. Adjust agents, tasks, and dependencies
5. Test with a real section build

### Template Variants

Consider creating:
- `shopify-section-modify.json` - For updating existing sections
- `shopify-section-clone.json` - For duplicating sections
- `shopify-page-template.json` - For page templates
- `shopify-app-block.json` - For app blocks

### Adding Company Standards

Embed your company's coding standards into agent prompts:

```json
"liquid-dev": {
  "prompt": "... [existing rules] ...\n\n## Company Standards\n- Always use company-heading snippet for headings\n- Follow BrandX color token naming\n- ..."
}
```

## Troubleshooting

### Skill Not Found

Ensure the skill directory exists:
```bash
ls -la .claude/skills/scaffold/SKILL.md
```

### Template Not Loading

Check JSON syntax:
```bash
cat .claude/templates/shopify-section-new.json | jq .
```

### Tasks Not Persisting

Set the environment variable:
```bash
CLAUDE_CODE_TASK_LIST_ID="my-project" claude
```

### Agents Not Using MCP Tools

Verify MCP servers are configured in Claude Code settings.
Check that tool names match: `mcp__figmaRemoteMcp__*`, `mcp__playwright__*`

## Version History

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial release with 12 agents, 12 tasks |

## Support

- Template schema: `.claude/templates/template-schema.json`
- TWP Best Practices: Reference document for all rules
- Example usage: Run `/scaffold` and follow prompts
