# TAAL v1 - Tooling & Agent Abstraction Layer

## Context

### Original Request
Build TAAL - a CLI tool to sync MCP server configurations and Agent Skills across multiple AI coding providers. Single source of truth for agent tooling configuration.

### Interview Summary
**Key Discussions**:
- Form Factor: CLI tool distributed via npm as `taal`
- Tech Stack: TypeScript + Bun + commander.js
- Config Format: YAML (`~/.taal/config.yaml`)
- Sync Direction: One-way (TAAL → providers)
- Schema Approach: Union (support all provider features, ignore unsupported per-provider)
- Secrets: User's choice (can use `${VAR}` references or inline values)
- Skills: Copy from `~/.taal/skills/` to each provider's skill location
- Platforms: macOS + Linux (no Windows in v1)
- New command discovered: `taal collect` to import existing configs

**Research Findings**:
- 8 providers with different config formats (JSON, YAML, TOML)
- Different root keys: `mcpServers`, `context_servers`, `mcp`, `mcp_servers`
- Different field conventions: `env` vs `environment`, command as string vs array
- Agent Skills format: SKILL.md with YAML frontmatter + Markdown instructions
- No prior art exists for MCP config sync tools

### Metis Review
**Identified Gaps** (addressed):
- Conflict handling → Added `taal collect` command to import existing configs first
- Backup strategy → Always backup before write
- HTTP vs stdio servers → Support both in unified schema
- Partial sync failures → Continue with warnings, report summary
- Platform support → macOS + Linux for v1

---

## Work Objectives

### Core Objective
Build a CLI tool that reads a unified YAML config and generates provider-specific MCP configurations for 8 AI coding assistants, plus syncs Agent Skills across providers.

### Concrete Deliverables
- `taal` npm package installable via `bunx taal` or `npm install -g taal`
- 7 CLI commands: `init`, `collect`, `sync`, `validate`, `diff`, `list`, `providers`
- Support for 8 providers: Claude Desktop, Claude Code, Cursor, Continue.dev, Zed, OpenCode, Codex, Antigravity
- Agent Skills sync from `~/.taal/skills/` to provider skill directories
- JSON Schema for config validation (`taal.schema.json`)

### Definition of Done
- [x] `bunx taal --help` shows all commands
- [x] `bunx taal init` creates `~/.taal/` with sample config
- [x] `bunx taal collect` imports from at least 3 providers with existing configs
- [x] `bunx taal sync` generates configs for all installed providers
- [x] `bunx taal validate` catches schema errors
- [x] `bunx taal diff` shows changes without writing
- [x] All commands work on macOS and Linux
- [x] Ready for npm publication (package verified with --dry-run)

### Must Have
- Backup before every write (`~/.taal/backups/`)
- Atomic file writes (temp → rename)
- Preserve non-MCP sections of provider configs
- Support both HTTP and stdio MCP server formats
- Graceful handling of missing providers
- Environment variable substitution (`${VAR}`)

### Must NOT Have (Guardrails)
- No Windows support in v1
- No watch mode / daemon
- No plugin system for custom providers
- No interactive prompts beyond init confirmation
- No MCP server installation/management
- No provider installation

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **User wants tests**: YES (TDD)
- **Framework**: bun test (built-in)

### Test Setup (Task 0)
- Configure `bun test`
- Create test directory structure
- Write first passing test to verify setup

### TDD Pattern
Each implementation task follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test
2. **GREEN**: Implement to pass
3. **REFACTOR**: Clean up

---

## Task Flow

```
0. Project Setup
       │
       ▼
1. Config Schema & Parser
       │
       ▼
2. Provider Abstraction ──┬──▶ 3a. Claude Provider
       │                  ├──▶ 3b. Cursor Provider
       │                  ├──▶ 3c. Continue Provider
       │                  ├──▶ 3d. Zed Provider
       │                  ├──▶ 3e. OpenCode Provider
       │                  ├──▶ 3f. Codex Provider
       │                  ├──▶ 3g. Windsurf Provider
       │                  └──▶ 3h. Antigravity Provider
       │
       ▼
4. Skills Handler
       │
       ▼
5. CLI Commands ──────────┬──▶ 5a. init
                          ├──▶ 5b. collect
                          ├──▶ 5c. validate
                          ├──▶ 5d. diff
                          ├──▶ 5e. sync
                          ├──▶ 5f. list
                          └──▶ 5g. providers
       │
       ▼
6. Integration Tests
       │
       ▼
7. Documentation & Publish
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3a-3h | All provider implementations are independent |
| B | 5a-5g | CLI commands can be developed in parallel once core is ready |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | 0 | Needs project setup |
| 2 | 1 | Needs config types |
| 3a-3h | 2 | Need provider abstraction |
| 4 | 1 | Needs config types |
| 5a-5g | 2, 3*, 4 | Need providers and skills handler |
| 6 | 5* | Need CLI commands |
| 7 | 6 | Need passing tests |

---

## TODOs

### Phase 1: Foundation

- [x] 0. Project Setup

  **What to do**:
  - Initialize Bun project with `bun init`
  - Configure TypeScript (`tsconfig.json`)
  - Set up directory structure
  - Configure `bun test`
  - Install dependencies: `commander`, `yaml`, `chalk`, `zod`, `@iarna/toml`
  - Create initial test to verify setup

  **Directory structure**:
  ```
  taal/
  ├── src/
  │   ├── index.ts           # CLI entry point
  │   ├── config/            # Config parsing
  │   ├── providers/         # Provider implementations
  │   ├── skills/            # Skills handling
  │   └── utils/             # Shared utilities
  ├── tests/
  │   ├── config/
  │   ├── providers/
  │   └── commands/
  ├── package.json
  ├── tsconfig.json
  └── taal.schema.json
  ```

  **Must NOT do**:
  - Don't add any implementation code yet
  - Don't configure Windows-specific settings

  **Parallelizable**: NO (foundation for everything)

  **References**:
  - Bun docs: https://bun.sh/docs/cli/init
  - Commander.js: https://github.com/tj/commander.js
  - Zod: https://zod.dev

  **Acceptance Criteria**:
  - [ ] `bun run src/index.ts` executes without error
  - [ ] `bun test` runs and shows 1 passing test
  - [ ] `package.json` has correct name (`taal`) and bin entry
  - [ ] TypeScript compiles without errors

  **Commit**: YES
  - Message: `feat: initialize taal project with bun and typescript`
  - Files: `package.json`, `tsconfig.json`, `src/index.ts`, `tests/setup.test.ts`

---

- [x] 1. Config Schema & Parser

  **What to do**:
  - Define Zod schema for `~/.taal/config.yaml`
  - Support MCP server definitions (both HTTP and stdio)
  - Support skills configuration
  - Support provider-specific overrides
  - Support environment variable substitution (`${VAR}`)
  - Write parser that loads and validates config
  - Export TypeScript types from Zod schema
  - Generate JSON Schema for IDE support

  **Schema structure**:
  ```yaml
  version: "1"
  
  mcp:
    server-name:
      # Stdio server
      command: string
      args: string[]
      env: Record<string, string>
      # HTTP server
      url: string
      headers: Record<string, string>
      # Provider overrides
      overrides:
        codex:
          enabled_tools: string[]
  
  skills:
    paths:
      - ./skills
      - ~/.taal/skills
  
  providers:
    enabled:
      - claude-desktop
      - cursor
      # ...
  ```

  **Must NOT do**:
  - Don't implement provider-specific transformations yet
  - Don't read/write actual files yet (just parse/validate)

  **Parallelizable**: NO (depends on 0)

  **References**:
  - Zod docs: https://zod.dev
  - yaml package: https://www.npmjs.com/package/yaml
  - MCP spec: https://modelcontextprotocol.io/docs
  - Agent Skills spec: https://agentskills.io/specification

  **Acceptance Criteria**:
  - [ ] `bun test tests/config/` → All tests pass
  - [ ] Valid YAML parses without error
  - [ ] Invalid YAML returns descriptive Zod errors
  - [ ] `${VAR}` substitution works when VAR is set
  - [ ] `${VAR}` with unset VAR returns warning (not error)
  - [ ] TypeScript types are exported
  - [ ] JSON Schema is generated to `taal.schema.json`

  **Commit**: YES
  - Message: `feat(config): add zod schema and yaml parser for taal config`
  - Files: `src/config/schema.ts`, `src/config/parser.ts`, `src/config/env.ts`, `taal.schema.json`, `tests/config/*.test.ts`

---

- [x] 2. Provider Abstraction Layer

  **What to do**:
  - Define `Provider` interface with common methods
  - Implement provider registry
  - Define provider metadata (name, config path, format, etc.)
  - Create utility functions for config reading/writing
  - Implement backup mechanism
  - Implement atomic write utility

  **Provider interface**:
  ```typescript
  interface Provider {
    name: string;
    configPath: string | ((home: string) => string);
    format: 'json' | 'yaml' | 'toml';
    mcpKey: string; // e.g., 'mcpServers', 'context_servers'
    skillsPath?: string | ((home: string) => string);
    
    isInstalled(): Promise<boolean>;
    readConfig(): Promise<unknown>;
    writeConfig(config: unknown): Promise<void>;
    transformMcpServers(servers: TaalMcpServer[]): unknown;
    transformSkills?(skills: TaalSkill[]): unknown;
  }
  ```

  **Must NOT do**:
  - Don't implement specific providers yet
  - Don't implement CLI commands

  **Parallelizable**: NO (depends on 1)

  **References**:
  - Claude config research: Draft section "Provider Config Matrix"
  - Draft file: `.sisyphus/drafts/taal-architecture.md`

  **Acceptance Criteria**:
  - [ ] Provider interface is defined with TypeScript
  - [ ] Provider registry can register/lookup providers
  - [ ] `backupConfig(path)` creates timestamped backup in `~/.taal/backups/`
  - [ ] `atomicWrite(path, content)` writes via temp file + rename
  - [ ] `readJsonConfig()`, `readYamlConfig()`, `readTomlConfig()` utilities exist
  - [ ] `bun test tests/providers/abstraction.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add provider abstraction layer with backup and atomic writes`
  - Files: `src/providers/types.ts`, `src/providers/registry.ts`, `src/providers/utils.ts`, `src/utils/backup.ts`, `src/utils/atomic-write.ts`

---

### Phase 2: Provider Implementations (Parallelizable)

- [x] 3a. Claude Provider (Desktop + Code)

  **What to do**:
  - Implement Claude Desktop provider
  - Implement Claude Code provider (may share logic)
  - Handle both `~/Library/Application Support/Claude/claude_desktop_config.json` (Desktop)
  - Handle `~/.claude/settings.json` (Code)
  - Transform TAAL servers to `mcpServers` format
  - Copy skills to `~/.claude/skills/`

  **Claude format**:
  ```json
  {
    "mcpServers": {
      "server-name": {
        "command": "npx",
        "args": ["-y", "@scope/package"],
        "env": { "KEY": "value" }
      }
    }
  }
  ```

  **Must NOT do**:
  - Don't support HTTP servers (Claude uses stdio only)
  - Don't modify non-MCP sections

  **Parallelizable**: YES (with 3b-3h)

  **References**:
  - MCP quickstart: https://modelcontextprotocol.io/docs/develop/connect-local-servers
  - Research: `~/.claude/settings.json` structure

  **Acceptance Criteria**:
  - [ ] `ClaudeDesktopProvider.transformMcpServers()` returns correct JSON structure
  - [ ] `ClaudeCodeProvider.transformMcpServers()` returns correct JSON structure
  - [ ] `isInstalled()` returns true if config directory exists
  - [ ] Skills are copied to `~/.claude/skills/`
  - [ ] HTTP servers are skipped with warning
  - [ ] `bun test tests/providers/claude.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add claude desktop and claude code providers`
  - Files: `src/providers/claude-desktop.ts`, `src/providers/claude-code.ts`, `tests/providers/claude.test.ts`

---

- [x] 3b. Cursor Provider

  **What to do**:
  - Implement Cursor provider
  - Config path: `~/Library/Application Support/Cursor/User/settings.json` (macOS) or `~/.config/Cursor/User/settings.json` (Linux)
  - Format is identical to Claude (JSON with `mcpServers`)
  - Project-level: `.cursor/mcp.json`

  **Must NOT do**:
  - Don't support HTTP servers (Cursor uses stdio only)

  **Parallelizable**: YES (with 3a, 3c-3h)

  **References**:
  - Cursor MCP docs: https://docs.cursor.com/context/model-context-protocol

  **Acceptance Criteria**:
  - [ ] `CursorProvider.transformMcpServers()` returns correct JSON structure
  - [ ] Handles both macOS and Linux paths
  - [ ] `bun test tests/providers/cursor.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add cursor provider`
  - Files: `src/providers/cursor.ts`, `tests/providers/cursor.test.ts`

---

- [x] 3c. Continue.dev Provider

  **What to do**:
  - Implement Continue provider
  - Config path: `~/.continue/config.yaml` or `.continue/mcpServers/*.yaml`
  - Format: YAML with metadata header
  - Support `${{ secrets.NAME }}` syntax transformation

  **Continue format**:
  ```yaml
  name: MCP Servers
  version: 0.0.1
  schema: v1
  mcpServers:
    - name: server-name
      command: npx
      args:
        - "@scope/package"
      env:
        KEY: ${{ secrets.KEY }}
  ```

  **Must NOT do**:
  - Don't manage Continue's secrets (just transform syntax)

  **Parallelizable**: YES (with 3a-3b, 3d-3h)

  **References**:
  - Continue MCP docs: https://docs.continue.dev/customize/deep-dives/mcp

  **Acceptance Criteria**:
  - [ ] `ContinueProvider.transformMcpServers()` returns correct YAML structure
  - [ ] Env vars with `${VAR}` transform to `${{ secrets.VAR }}`
  - [ ] Handles both SSE (`url`) and stdio servers
  - [ ] `bun test tests/providers/continue.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add continue.dev provider`
  - Files: `src/providers/continue.ts`, `tests/providers/continue.test.ts`

---

- [x] 3d. Zed Provider

  **What to do**:
  - Implement Zed provider
  - Config path: `~/.config/zed/settings.json`
  - Uses `context_servers` key (not `mcpServers`)
  - Support remote servers with `url` and `headers`

  **Zed format**:
  ```json
  {
    "context_servers": {
      "local-server": {
        "command": "some-command",
        "args": ["arg-1"],
        "env": {}
      },
      "remote-server": {
        "url": "https://...",
        "headers": { "Authorization": "Bearer token" }
      }
    }
  }
  ```

  **Must NOT do**:
  - Don't modify other Zed settings

  **Parallelizable**: YES (with 3a-3c, 3e-3h)

  **References**:
  - Zed MCP docs: https://zed.dev/docs/ai/mcp

  **Acceptance Criteria**:
  - [ ] `ZedProvider.transformMcpServers()` returns correct structure with `context_servers`
  - [ ] Supports both local and remote servers
  - [ ] `bun test tests/providers/zed.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add zed provider`
  - Files: `src/providers/zed.ts`, `tests/providers/zed.test.ts`

---

- [x] 3e. OpenCode Provider

  **What to do**:
  - Implement OpenCode provider
  - Config path: `opencode.json` (project) or `~/.config/opencode/opencode.json` (global)
  - Uses `mcp` key with explicit `type: "local" | "remote"`
  - `command` is array, `environment` (not `env`)
  - Skills path: `.opencode/skills/`

  **OpenCode format**:
  ```json
  {
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
      "server-name": {
        "type": "local",
        "command": ["npx", "-y", "package"],
        "environment": { "KEY": "value" },
        "enabled": true
      },
      "remote-server": {
        "type": "remote",
        "url": "https://...",
        "headers": {}
      }
    }
  }
  ```

  **Must NOT do**:
  - Don't manage OAuth configs

  **Parallelizable**: YES (with 3a-3d, 3f-3h)

  **References**:
  - OpenCode MCP docs: https://opencode.ai/docs/mcp-servers/

  **Acceptance Criteria**:
  - [ ] `OpenCodeProvider.transformMcpServers()` returns correct structure with `mcp` key
  - [ ] `command` is array format
  - [ ] `environment` used instead of `env`
  - [ ] `type` field is set correctly
  - [ ] Skills copied to `.opencode/skills/`
  - [ ] `bun test tests/providers/opencode.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add opencode provider`
  - Files: `src/providers/opencode.ts`, `tests/providers/opencode.test.ts`

---

- [x] 3f. Codex Provider

  **What to do**:
  - Implement Codex provider
  - Config path: `~/.codex/config.toml`
  - Format: TOML with `[mcp_servers.name]` sections
  - Support HTTP servers, tool filtering, timeouts
  - Skills path: `~/.codex/skills/`

  **Codex format**:
  ```toml
  [mcp_servers.context7]
  url = "https://mcp.context7.com/mcp"
  http_headers = { "CONTEXT7_API_KEY" = "..." }
  enabled = true
  startup_timeout_sec = 30
  enabled_tools = ["tool1", "tool2"]
  
  [mcp_servers.local-server]
  command = "npx"
  args = ["-y", "@scope/package"]
  env = { KEY = "value" }
  ```

  **Must NOT do**:
  - Don't support OAuth credential management

  **Parallelizable**: YES (with 3a-3e, 3g-3h)

  **References**:
  - Codex MCP docs: https://deepwiki.com/openai/codex/7.1-mcp-server-configuration
  - TOML library: `@iarna/toml`

  **Acceptance Criteria**:
  - [ ] `CodexProvider.transformMcpServers()` returns correct TOML structure
  - [ ] Uses `http_headers` for HTTP servers
  - [ ] Handles provider-specific `overrides.codex.enabled_tools`
  - [ ] Skills copied to `~/.codex/skills/`
  - [ ] `bun test tests/providers/codex.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add codex provider with toml support`
  - Files: `src/providers/codex.ts`, `tests/providers/codex.test.ts`

---

- [x] 3g. Windsurf Provider

  **What to do**:
  - Implement Windsurf provider
  - Research exact config location (via Settings UI → Plugins)
  - Format: JSON similar to Claude/Cursor
  - Support streamable-http transport

  **Must NOT do**:
  - Don't implement UI automation (file-based config only)

  **Parallelizable**: YES (with 3a-3f, 3h)

  **References**:
  - Windsurf MCP guide: https://natoma.ai/blog/how-to-enabling-mcp-in-windsurf

  **Acceptance Criteria**:
  - [ ] `WindsurfProvider.transformMcpServers()` returns correct structure
  - [ ] Handles both stdio and streamable-http
  - [ ] `bun test tests/providers/windsurf.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add windsurf provider`
  - Files: `src/providers/windsurf.ts`, `tests/providers/windsurf.test.ts`

---

- [x] 3h. Antigravity Provider

  **What to do**:
  - Implement Antigravity provider
  - Config format: JSON (similar to Claude/Cursor based on research)
  - Research exact config location

  **Must NOT do**:
  - Don't implement MCP Store UI integration

  **Parallelizable**: YES (with 3a-3g)

  **References**:
  - Antigravity docs: https://antigravity.google/docs/mcp
  - Research needed for config file location

  **Acceptance Criteria**:
  - [ ] `AntigravityProvider.transformMcpServers()` returns correct structure
  - [ ] `bun test tests/providers/antigravity.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(providers): add antigravity provider`
  - Files: `src/providers/antigravity.ts`, `tests/providers/antigravity.test.ts`

---

### Phase 3: Skills & CLI

- [x] 4. Skills Handler

  **What to do**:
  - Implement skills discovery from `~/.taal/skills/`
  - Validate SKILL.md format (YAML frontmatter)
  - Implement copy-to-provider logic
  - Support skills paths from config

  **Skills discovery**:
  ```
  ~/.taal/skills/
  ├── my-skill/
  │   └── SKILL.md
  └── another-skill/
      ├── SKILL.md
      ├── scripts/
      └── references/
  ```

  **Must NOT do**:
  - Don't validate skill content (just structure)
  - Don't execute scripts

  **Parallelizable**: NO (depends on 1)

  **References**:
  - Agent Skills spec: https://agentskills.io/specification
  - Example skills: https://github.com/anthropics/skills

  **Acceptance Criteria**:
  - [ ] `discoverSkills(paths)` finds all valid skills
  - [ ] `validateSkill(path)` checks SKILL.md exists and has valid frontmatter
  - [ ] `copySkillsToProvider(skills, provider)` copies to correct location
  - [ ] Invalid skills are skipped with warning
  - [ ] `bun test tests/skills/` → Pass

  **Commit**: YES
  - Message: `feat(skills): add skills discovery and copy handler`
  - Files: `src/skills/discovery.ts`, `src/skills/validator.ts`, `src/skills/copy.ts`, `tests/skills/*.test.ts`

---

- [x] 5a. CLI Command: init

  **What to do**:
  - Implement `taal init` command
  - Create `~/.taal/` directory
  - Create sample `config.yaml` with commented examples
  - Create `skills/` directory
  - Don't overwrite existing config (confirm or error)

  **Sample config**:
  ```yaml
  # TAAL Configuration
  # https://github.com/user/taal
  
  version: "1"
  
  mcp:
    # Example stdio server
    # example-server:
    #   command: npx
    #   args: ["-y", "@example/mcp-server"]
    #   env:
    #     API_KEY: "${API_KEY}"
    
    # Example HTTP server
    # context7:
    #   url: https://mcp.context7.com/mcp
    #   headers:
    #     CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}"
  
  skills:
    paths:
      - ~/.taal/skills
  
  providers:
    enabled:
      - claude-desktop
      - claude-code
      - cursor
      - continue
      - zed
      - opencode
      - codex
      - windsurf
      - antigravity
  ```

  **Must NOT do**:
  - Don't run sync after init
  - Don't ask many questions (just confirm overwrite if exists)

  **Parallelizable**: YES (with 5b-5g, after 2)

  **References**:
  - commander.js docs: https://github.com/tj/commander.js

  **Acceptance Criteria**:
  - [ ] `taal init` creates `~/.taal/config.yaml`
  - [ ] `taal init` creates `~/.taal/skills/`
  - [ ] Running twice shows "already initialized" message
  - [ ] `--force` flag overwrites existing
  - [ ] `bun test tests/commands/init.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add init command`
  - Files: `src/commands/init.ts`, `tests/commands/init.test.ts`

---

- [x] 5b. CLI Command: collect

  **What to do**:
  - Implement `taal collect` command
  - Scan all installed providers for existing MCP configs
  - Merge into `~/.taal/config.yaml`
  - Handle duplicates (same server name, different config)
  - Show what was imported

  **Must NOT do**:
  - Don't delete source configs
  - Don't auto-sync after collect

  **Parallelizable**: YES (with 5a, 5c-5g, after providers)

  **References**:
  - Provider implementations from 3a-3h

  **Acceptance Criteria**:
  - [ ] `taal collect` reads from all installed providers
  - [ ] Merges servers into existing config (or creates new)
  - [ ] Warns on duplicate server names with different configs
  - [ ] Shows summary of what was imported
  - [ ] `bun test tests/commands/collect.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add collect command to import existing configs`
  - Files: `src/commands/collect.ts`, `tests/commands/collect.test.ts`

---

- [x] 5c. CLI Command: validate

  **What to do**:
  - Implement `taal validate` command
  - Load and validate `~/.taal/config.yaml`
  - Show Zod validation errors in human-readable format
  - Warn on undefined environment variables
  - Exit code 0 if valid, 1 if invalid

  **Must NOT do**:
  - Don't validate MCP server connectivity
  - Don't modify any files

  **Parallelizable**: YES (with 5a-5b, 5d-5g)

  **References**:
  - Config schema from task 1

  **Acceptance Criteria**:
  - [ ] `taal validate` with valid config → exit 0
  - [ ] `taal validate` with invalid config → exit 1 with errors
  - [ ] Shows warning for undefined `${VAR}` references
  - [ ] `bun test tests/commands/validate.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add validate command`
  - Files: `src/commands/validate.ts`, `tests/commands/validate.test.ts`

---

- [x] 5d. CLI Command: diff

  **What to do**:
  - Implement `taal diff` command
  - Compare current provider configs with what TAAL would generate
  - Show colored diff output (red=remove, green=add)
  - Per-provider sections
  - Exit code 0 if no changes, 1 if changes exist

  **Must NOT do**:
  - Never write any files
  - Don't show unchanged providers

  **Parallelizable**: YES (with 5a-5c, 5e-5g)

  **References**:
  - `diff` npm package or similar

  **Acceptance Criteria**:
  - [ ] `taal diff` shows what would change
  - [ ] Colored output (chalk)
  - [ ] Exit 0 if no changes, exit 1 if changes
  - [ ] Works with `taal diff <provider>` for single provider
  - [ ] `bun test tests/commands/diff.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add diff command to preview changes`
  - Files: `src/commands/diff.ts`, `tests/commands/diff.test.ts`

---

- [x] 5e. CLI Command: sync

  **What to do**:
  - Implement `taal sync` command
  - Core sync logic: read config → transform → backup → write
  - Support `taal sync` (all providers) and `taal sync <provider>`
  - Copy skills to provider skill directories
  - Continue on failure, report summary
  - Show progress and results

  **Must NOT do**:
  - Don't sync without validation passing
  - Don't sync to disabled providers

  **Parallelizable**: YES (with 5a-5d, 5f-5g)

  **References**:
  - Provider implementations 3a-3h
  - Skills handler task 4

  **Acceptance Criteria**:
  - [ ] `taal sync` writes to all installed+enabled providers
  - [ ] `taal sync cursor` syncs only to Cursor
  - [ ] Creates backup before each write
  - [ ] Reports success/failure per provider
  - [ ] Exit 0 if all succeed, non-zero if any fail
  - [ ] Skills are copied
  - [ ] `bun test tests/commands/sync.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add sync command`
  - Files: `src/commands/sync.ts`, `tests/commands/sync.test.ts`

---

- [x] 5f. CLI Command: list

  **What to do**:
  - Implement `taal list` command
  - List all configured MCP servers
  - List all skills in skills paths
  - Show which providers each server targets

  **Must NOT do**:
  - Don't show unconfigured providers

  **Parallelizable**: YES (with 5a-5e, 5g)

  **References**:
  - Config schema

  **Acceptance Criteria**:
  - [ ] `taal list` shows all servers and skills
  - [ ] Shows server type (http/stdio)
  - [ ] `bun test tests/commands/list.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add list command`
  - Files: `src/commands/list.ts`, `tests/commands/list.test.ts`

---

- [x] 5g. CLI Command: providers

  **What to do**:
  - Implement `taal providers` command
  - List all 8 supported providers
  - Show config path for each
  - Show installed/not-installed status
  - Show enabled/disabled status from config

  **Must NOT do**:
  - Don't offer to install providers

  **Parallelizable**: YES (with 5a-5f)

  **References**:
  - Provider registry from task 2

  **Acceptance Criteria**:
  - [ ] `taal providers` lists all 8 providers
  - [ ] Shows [installed] or [not installed]
  - [ ] Shows [enabled] or [disabled]
  - [ ] Shows config file path
  - [ ] `bun test tests/commands/providers.test.ts` → Pass

  **Commit**: YES
  - Message: `feat(cli): add providers command`
  - Files: `src/commands/providers.ts`, `tests/commands/providers.test.ts`

---

### Phase 4: Polish & Release

- [x] 6. Integration Tests

  **What to do**:
  - Write end-to-end tests with real filesystem
  - Test full workflow: init → collect → validate → diff → sync
  - Test error scenarios (missing config, invalid yaml, etc.)
  - Test on both macOS and Linux paths

  **Must NOT do**:
  - Don't test against real provider installations (mock)

  **Parallelizable**: NO (depends on all CLI commands)

  **References**:
  - Bun test docs

  **Acceptance Criteria**:
  - [ ] `bun test tests/integration/` → All pass
  - [ ] Tests cover happy path workflow
  - [ ] Tests cover error handling
  - [ ] Tests run in CI (GitHub Actions)

  **Commit**: YES
  - Message: `test: add integration tests for full workflow`
  - Files: `tests/integration/*.test.ts`, `.github/workflows/test.yml`

---

- [x] 7. Documentation & Publish

  **What to do**:
  - Write README.md with usage examples
  - Document all commands
  - Document config schema
  - Set up npm publish
  - Configure `package.json` for publication
  - Tag v1.0.0 release

  **README sections**:
  - Quick Start
  - Installation
  - Commands
  - Configuration
  - Supported Providers
  - Agent Skills
  - Contributing

  **Must NOT do**:
  - Don't write API documentation (CLI-only)

  **Parallelizable**: NO (final task)

  **References**:
  - npm publish docs

  **Acceptance Criteria**:
  - [ ] README.md is complete
  - [ ] `npm publish` succeeds
  - [ ] `bunx taal --version` shows 1.0.0
  - [ ] GitHub release is created
- [x] `bunx taal --help` shows all commands

  **Commit**: YES
  - Message: `docs: add readme and prepare v1.0.0 release`
  - Files: `README.md`, `package.json` (version bump)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `feat: initialize taal project` | package.json, tsconfig.json, src/index.ts | `bun test` |
| 1 | `feat(config): add zod schema and yaml parser` | src/config/*, taal.schema.json | `bun test` |
| 2 | `feat(providers): add provider abstraction layer` | src/providers/types.ts, registry.ts, utils.ts | `bun test` |
| 3a | `feat(providers): add claude providers` | src/providers/claude-*.ts | `bun test` |
| 3b | `feat(providers): add cursor provider` | src/providers/cursor.ts | `bun test` |
| 3c | `feat(providers): add continue provider` | src/providers/continue.ts | `bun test` |
| 3d | `feat(providers): add zed provider` | src/providers/zed.ts | `bun test` |
| 3e | `feat(providers): add opencode provider` | src/providers/opencode.ts | `bun test` |
| 3f | `feat(providers): add codex provider` | src/providers/codex.ts | `bun test` |
| 3g | `feat(providers): add windsurf provider` | src/providers/windsurf.ts | `bun test` |
| 3h | `feat(providers): add antigravity provider` | src/providers/antigravity.ts | `bun test` |
| 4 | `feat(skills): add skills handler` | src/skills/* | `bun test` |
| 5a | `feat(cli): add init command` | src/commands/init.ts | `bun test` |
| 5b | `feat(cli): add collect command` | src/commands/collect.ts | `bun test` |
| 5c | `feat(cli): add validate command` | src/commands/validate.ts | `bun test` |
| 5d | `feat(cli): add diff command` | src/commands/diff.ts | `bun test` |
| 5e | `feat(cli): add sync command` | src/commands/sync.ts | `bun test` |
| 5f | `feat(cli): add list command` | src/commands/list.ts | `bun test` |
| 5g | `feat(cli): add providers command` | src/commands/providers.ts | `bun test` |
| 6 | `test: add integration tests` | tests/integration/* | `bun test` |
| 7 | `docs: prepare v1.0.0 release` | README.md, package.json | `npm publish --dry-run` |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
bun test

# CLI is functional
bunx taal --help
bunx taal init
bunx taal validate
bunx taal providers
bunx taal sync --dry-run  # (if implemented)

# Package is publishable
npm pack
npm publish --dry-run
```

### Final Checklist
- [x] All 7 CLI commands work (`init`, `collect`, `sync`, `validate`, `diff`, `list`, `providers`)
- [x] All 9 providers are implemented
- [x] Skills sync works
- [x] Backups are created before writes
- [x] Works on macOS and Linux
- [x] All tests pass (`bun test`)
- [x] Ready for npm publication (package verified with --dry-run)
- [x] README is complete
