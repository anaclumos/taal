# TAAL - Tooling & Agent Abstraction Layer

TAAL provides a single source of truth for your MCP (Model Context Protocol) server configurations and Agent Skills, automatically syncing them across all your AI coding tools.

## Quick Start

```bash
# Install globally
npm install -g @anaclumos/taal

# Initialize TAAL
taal init

# Edit ~/.taal/config.yaml with your MCP servers

# Sync to all providers
taal sync
```

## Installation

### Via npm (recommended)

```bash
npm install -g @anaclumos/taal
```

### Via bunx

```bash
bunx @anaclumos/taal --help
```

### From source

```bash
git clone https://github.com/anaclumos/taal.git
cd taal
bun install
bun run src/index.ts --help
```

## Commands

### `taal init`

Initialize TAAL configuration in `~/.taal/`.

```bash
taal init
taal init --force  # Overwrite existing config
```

Creates:
- `~/.taal/config.yaml` - Your unified configuration
- `~/.taal/skills/` - Directory for Agent Skills
- `~/.taal/backups/` - Automatic backups before sync

### `taal collect`

Import existing MCP server configurations from installed providers.

```bash
taal collect
```

Scans all installed providers and merges their MCP configs into your TAAL config. Warns about conflicts when the same server name has different configurations across providers.

### `taal validate`

Validate your TAAL configuration.

```bash
taal validate
```

Checks:
- YAML syntax
- Schema validation
- Undefined environment variables
- Mutual exclusivity (stdio vs HTTP)

Exit codes:
- `0` - Valid configuration
- `1` - Invalid configuration

### `taal diff`

Preview what would change without writing.

```bash
taal diff              # Show changes for all providers
taal diff cursor       # Show changes for specific provider
```

Shows:
- `+` Servers to be added
- `-` Servers to be removed
- `~` Servers to be modified

Exit codes:
- `0` - No changes
- `1` - Changes detected

### `taal sync`

Sync MCP configs and skills to providers (CORE COMMAND).

```bash
taal sync              # Sync to all enabled providers
taal sync cursor       # Sync to specific provider
```

What it does:
1. Reads `~/.taal/config.yaml`
2. Transforms servers to provider-specific formats
3. Creates backups of existing configs
4. Writes new configs atomically
5. Copies skills to provider directories

### `taal list`

List configured MCP servers and skills.

```bash
taal list
```

Shows:
- All configured MCP servers (stdio/http)
- All discovered skills
- Enabled providers

### `taal providers`

List all supported providers.

```bash
taal providers
```

Shows for each provider:
- Installation status
- Enabled/disabled status
- Config file path
- Config format (json/yaml/toml)

## Configuration

### Config File: `~/.taal/config.yaml`

```yaml
version: "1"

mcp:
  # Stdio server example
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
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
    - ~/projects/my-custom-skills

providers:
  enabled:
    - claude-desktop
    - cursor
    - zed
```

### Environment Variables

Use `${VAR_NAME}` syntax to reference environment variables:

```yaml
mcp:
  my-server:
    command: npx
    env:
      API_KEY: "${MY_API_KEY}"
```

TAAL will:
- Substitute variables at sync time
- Warn if variables are undefined
- Keep original `${VAR}` syntax if undefined

### Provider-Specific Overrides

```yaml
mcp:
  my-server:
    command: npx
    args: ["-y", "server"]
    overrides:
      codex:
        enabled_tools: ["tool1", "tool2"]
        startup_timeout_sec: 60
```

## Supported Providers

TAAL supports 9 AI coding assistants:

| Provider | Config Format | Config Path | Skills Support |
|----------|---------------|-------------|----------------|
| **Claude Desktop** | JSON | `~/Library/Application Support/Claude/claude_desktop_config.json` | ✅ `~/.claude/skills/` |
| **Claude Code** | JSON | `~/.claude/settings.json` | ✅ `~/.claude/skills/` |
| **Cursor** | JSON | `~/Library/Application Support/Cursor/User/settings.json` | ❌ |
| **Continue.dev** | YAML | `~/.continue/config.yaml` | ❌ |
| **Zed** | JSON | `~/.config/zed/settings.json` | ❌ |
| **OpenCode** | JSON | `~/.config/opencode/opencode.json` | ✅ `.opencode/skills/` |
| **Codex** | TOML | `~/.codex/config.toml` | ✅ `~/.codex/skills/` |
| **Windsurf** | JSON | Provider-specific path | ❌ |
| **Antigravity** | JSON | Provider-specific path | ❌ |

### Provider-Specific Notes

**Claude Desktop**
- Only supports stdio servers (no HTTP)
- Skills directory: `~/.claude/skills/`

**Claude Code**
- Supports both stdio and HTTP servers (SSE deprecated)
- Uses `type: "http" | "stdio"` format in config
- Skills directory: `~/.claude/skills/`
- Can import servers from Claude Desktop via `claude mcp add-from-claude-desktop`

**Cursor**
- Only supports stdio servers
- macOS: `~/Library/Application Support/Cursor/User/settings.json`
- Linux: `~/.config/Cursor/User/settings.json`

**Continue.dev**
- Supports both stdio and HTTP (SSE)
- Transforms `${VAR}` to `${{ secrets.VAR }}`

**Zed**
- Uses `context_servers` key (not `mcpServers`)
- Supports both stdio and HTTP

**OpenCode**
- Command as array: `["npx", "-y", "package"]`
- Uses `environment` instead of `env`
- Explicit `type: "local" | "remote"`

**Codex**
- TOML format with `[mcp_servers.name]` sections
- Uses `http_headers` for HTTP servers
- Supports `enabled_tools` filtering

**Windsurf**
- Supports `streamable-http` transport for HTTP servers

**Antigravity**
- Only supports stdio servers

## Agent Skills

TAAL syncs [Agent Skills](https://agentskills.io) to providers that support them.

### Skill Structure

```
~/.taal/skills/
└── my-skill/
    ├── SKILL.md          # Required: YAML frontmatter + instructions
    ├── scripts/          # Optional: Helper scripts
    └── references/       # Optional: Reference materials
```

### SKILL.md Format

```markdown
---
name: My Skill
description: What this skill does
version: 1.0.0
---

# My Skill

Instructions for the AI agent...
```

### Skill Discovery

TAAL discovers skills from all paths in `skills.paths`:

```yaml
skills:
  paths:
    - ~/.taal/skills
    - ~/projects/custom-skills
    - /shared/team-skills
```

### Skill Validation

TAAL validates:
- `SKILL.md` exists
- YAML frontmatter is valid
- `name` field is present

Invalid skills are skipped with warnings.

## Workflow Examples

### First-time setup

```bash
# 1. Initialize TAAL
taal init

# 2. Import existing configs
taal collect

# 3. Validate merged config
taal validate

# 4. Preview changes
taal diff

# 5. Sync to all providers
taal sync
```

### Adding a new MCP server

```bash
# 1. Edit config
vim ~/.taal/config.yaml

# 2. Validate
taal validate

# 3. Preview changes
taal diff

# 4. Sync
taal sync
```

### Adding a new skill

```bash
# 1. Create skill directory
mkdir -p ~/.taal/skills/my-skill

# 2. Create SKILL.md
cat > ~/.taal/skills/my-skill/SKILL.md << 'EOF'
---
name: My Skill
---

Instructions...
EOF

# 3. Verify skill is discovered
taal list

# 4. Sync to providers
taal sync
```

### Syncing to specific provider

```bash
# Only sync to Cursor
taal sync cursor

# Preview changes for Zed
taal diff zed
```

## Backup & Safety

TAAL automatically creates backups before every write:

```
~/.taal/backups/
├── claude_desktop_config.json.2024-01-15T10-30-00-000Z.backup
├── settings.json.2024-01-15T10-30-00-001Z.backup
└── config.toml.2024-01-15T10-30-00-002Z.backup
```

Backups are timestamped and never overwritten.

## Troubleshooting

### Config validation fails

```bash
# Check detailed errors
taal validate

# Common issues:
# - Missing required fields
# - Both command and url specified (mutual exclusivity)
# - Invalid YAML syntax
```

### Sync fails for a provider

```bash
# Check if provider is installed
taal providers

# Check if provider is enabled
cat ~/.taal/config.yaml | grep -A 10 "providers:"

# Try syncing just that provider
taal sync cursor
```

### Skills not syncing

```bash
# Verify skills are discovered
taal list

# Check skill paths in config
cat ~/.taal/config.yaml | grep -A 5 "skills:"

# Verify SKILL.md format
cat ~/.taal/skills/my-skill/SKILL.md
```

### Environment variables not substituted

```bash
# Check if variable is set
echo $MY_VAR

# TAAL will warn about undefined variables
taal validate
```

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.2.19 or later

### Setup

```bash
git clone https://github.com/user/taal.git
cd taal
bun install
```

### Running tests

```bash
bun test                    # All tests
bun test tests/commands/    # Command tests only
bun test tests/integration/ # Integration tests only
```

### Running locally

```bash
bun run src/index.ts --help
bun run src/index.ts init
```

### Project structure

```
taal/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── commands/          # CLI commands
│   ├── config/            # Config parsing & validation
│   ├── providers/         # Provider implementations
│   ├── skills/            # Skills handling
│   └── utils/             # Shared utilities
├── tests/
│   ├── commands/          # Command tests
│   ├── config/            # Config tests
│   ├── providers/         # Provider tests
│   ├── skills/            # Skills tests
│   └── integration/       # End-to-end tests
└── taal.schema.json       # JSON Schema for IDE support
```

## Publishing

TAAL uses automated NPM publishing via GitHub Actions.

### Release Process

1. **Update version** in `package.json`:
   ```bash
   npm version patch  # 1.0.0 -> 1.0.1
   npm version minor  # 1.0.0 -> 1.1.0
   npm version major  # 1.0.0 -> 2.0.0
   ```

2. **Commit and push**:
   ```bash
   git add package.json
   git commit -m "chore: bump version to v1.0.1"
   git push origin main
   ```

3. **Create and push tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **GitHub Actions automatically**:
   - Runs tests
   - Runs linter
   - Publishes to NPM with provenance

### Prerequisites

Repository maintainers must configure:
- `NPM_TOKEN` secret in GitHub repository settings
- NPM account with 2FA enabled
- Package access permissions

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass: `bun test`
5. Ensure linter passes: `bun x ultracite check`
6. Submit a pull request

### Adding a new provider

1. Create `src/providers/my-provider.ts`
2. Implement the `Provider` interface
3. Register in `src/providers/my-provider.ts`: `registry.register(new MyProvider())`
4. Add tests in `tests/providers/my-provider.test.ts`
5. Update this README

## License

MIT

## Links

- [NPM Package](https://www.npmjs.com/package/@anaclumos/taal)
- [GitHub Repository](https://github.com/anaclumos/taal)
- [Issue Tracker](https://github.com/anaclumos/taal/issues)
- [MCP Specification](https://modelcontextprotocol.io)
- [Agent Skills Specification](https://agentskills.io)

## Acknowledgments

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Zod](https://zod.dev) - Schema validation
- [YAML](https://www.npmjs.com/package/yaml) - YAML parsing
- [Chalk](https://github.com/chalk/chalk) - Terminal colors
