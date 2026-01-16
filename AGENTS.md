# TAAL Agent Instructions

This file provides instructions for AI agents working with TAAL configurations.

## About TAAL

TAAL (Tooling & Agent Abstraction Layer) syncs MCP server configs and Agent Skills across AI coding assistants.

- **Repository**: https://github.com/anaclumos/taal
- **Package**: `@anaclumos/taal`
- **Config Location**: `~/.taal/config.yaml`
- **Skills Location**: `~/.taal/skills/`

## How to Use TAAL

### Installation

```bash
npm install -g @anaclumos/taal
```

### Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `taal init` | Initialize TAAL configuration | `taal init` |
| `taal collect` | Import configs from installed providers | `taal collect` |
| `taal validate` | Validate configuration | `taal validate` |
| `taal diff` | Preview changes before sync | `taal diff` |
| `taal sync` | Sync configs to all providers | `taal sync` |
| `taal list` | List configured servers and skills | `taal list` |
| `taal providers` | Show all supported providers | `taal providers` |

### Typical Workflow

1. **First-time setup:**
   ```bash
   taal init          # Creates ~/.taal/config.yaml
   taal collect       # Imports existing MCP configs
   taal validate      # Checks configuration
   taal sync          # Syncs to all providers
   ```

2. **Adding a new MCP server:**
   ```bash
   # Edit ~/.taal/config.yaml to add server
   taal validate      # Verify configuration
   taal diff          # Preview changes
   taal sync          # Apply changes
   ```

3. **Adding a new skill:**
   ```bash
   # Create skill in ~/.taal/skills/my-skill/SKILL.md
   taal list          # Verify skill is discovered
   taal sync          # Sync to providers
   ```

### Configuration Structure

**File**: `~/.taal/config.yaml`

```yaml
version: "1"

mcp:
  # stdio server example
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    env:
      LOG_LEVEL: "info"
  
  # HTTP server example
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}"

skills:
  paths:
    - ~/.taal/skills
    - ~/projects/custom-skills

providers:
  enabled:
    - claude-desktop
    - claude-code
    - cursor
    - zed
```

### Supported Providers

- **Claude Desktop** - stdio only, skills: `~/.claude/skills/`
- **Claude Code** - stdio + HTTP, skills: `~/.claude/skills/`
- **Cursor** - stdio only
- **Continue.dev** - stdio + HTTP (SSE)
- **Zed** - stdio + HTTP
- **OpenCode** - stdio + HTTP, skills: `~/.config/opencode/skill/`
- **Codex** - stdio + HTTP, skills: `~/.codex/skills/`
- **Windsurf** - stdio + HTTP
- **Antigravity** - stdio only

### Environment Variables

Use `${VAR_NAME}` syntax in config:

```yaml
mcp:
  my-server:
    url: https://api.example.com
    headers:
      API_KEY: "${MY_API_KEY}"
```

TAAL will substitute variables at sync time and warn if undefined.

### Skills Structure

Create skills in `~/.taal/skills/`:

```
~/.taal/skills/
└── my-skill/
    ├── SKILL.md          # Required: YAML frontmatter + instructions
    ├── scripts/          # Optional: Helper scripts
    └── references/       # Optional: Reference materials
```

**SKILL.md format:**

```markdown
---
name: My Skill
description: What this skill does
version: 1.0.0
---

# My Skill

Instructions for the AI agent...
```

## Coding Standards

When working on TAAL codebase or related projects, fetch and follow the latest coding standards:

```
https://raw.githubusercontent.com/anaclumos/taal/master/AGENTS.md
```

Use WebFetch or similar tools to retrieve the latest guidelines before making code changes.

### Development Workflow

1. Fetch the latest AGENTS.md from the URL above
2. Review the coding standards and principles
3. Apply them to your work on TAAL configurations and related code
4. Ensure all changes comply with Ultracite code quality standards

## Common Tasks for Agents

### Task: Add a new MCP server

```bash
# 1. Edit config
vim ~/.taal/config.yaml

# 2. Add server configuration
# mcp:
#   new-server:
#     command: npx
#     args: ["-y", "package-name"]

# 3. Validate
taal validate

# 4. Preview changes
taal diff

# 5. Sync
taal sync
```

### Task: Create a new skill

```bash
# 1. Create skill directory
mkdir -p ~/.taal/skills/my-skill

# 2. Create SKILL.md
cat > ~/.taal/skills/my-skill/SKILL.md << 'EOF'
---
name: My Skill
description: Skill description
version: 1.0.0
---

# My Skill

Instructions for AI agents...
EOF

# 3. Verify discovery
taal list

# 4. Sync to providers
taal sync
```

### Task: Troubleshoot configuration

```bash
# Check validation errors
taal validate

# Check which providers are installed
taal providers

# Preview what would change
taal diff

# Check current configuration
cat ~/.taal/config.yaml

# Check backups if something went wrong
ls -la ~/.taal/backups/
```

## Important Notes

- **Backups**: TAAL automatically creates backups before every sync in `~/.taal/backups/`
- **Environment Variables**: Undefined variables trigger warnings but don't block sync
- **Provider Detection**: TAAL auto-detects installed providers by checking config directories
- **Skills Validation**: Invalid skills are skipped with warnings during sync
- **Mutual Exclusivity**: MCP servers must have either `command` (stdio) OR `url` (HTTP), not both
