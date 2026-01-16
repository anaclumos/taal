# TAAL v1 - Learnings

## [2026-01-17T01:06] Task 0: Project Setup

### Successful Patterns
- Bun init works smoothly with `-y` flag
- Commander.js v12 works perfectly with ESM and Bun
- Shebang `#!/usr/bin/env bun` required for bin entry
- All dependencies (commander, yaml, chalk, zod, @iarna/toml) installed without issues

### Project Structure
```
taal/
├── src/
│   ├── index.ts (CLI entry with commander)
│   ├── config/ (empty)
│   ├── providers/ (empty)
│   ├── skills/ (empty)
│   └── utils/ (empty)
├── tests/
│   ├── setup.test.ts (1 passing test)
│   ├── config/ (empty)
│   ├── providers/ (empty)
│   └── commands/ (empty)
├── package.json (name: taal, bin entry configured)
├── tsconfig.json (strict mode, ESNext)
└── .gitignore
```

### Dependencies Installed
- commander@12.1.0 - CLI framework
- yaml@2.8.2 - YAML parsing
- chalk@5.6.2 - Terminal colors
- zod@3.25.76 - Schema validation
- @iarna/toml@2.2.5 - TOML parsing (for Codex provider)
- @types/bun@1.3.6 - Bun type definitions

### Verification Commands
- `bun test` → 1 passing test ✅
- `bun run src/index.ts --help` → Shows help ✅
- `bun run src/index.ts --version` → Shows 1.0.0 ✅

### Git Commit
- Hash: beeec1a
- Message: "feat: initialize taal project with bun and typescript"

---

## [2026-01-17T01:10] Task 1: Config Schema & Parser

### Successful Patterns

1. **Zod Schema with Refinement**
   - Used `.refine()` to enforce mutual exclusivity between stdio and HTTP servers
   - Pattern: `(hasStdio && !hasHttp) || (hasHttp && !hasStdio)`
   - Custom error messages provide clear validation feedback

2. **Environment Variable Substitution**
   - Recursive pattern handles nested objects and arrays cleanly
   - Warning on undefined vars (instead of error) allows graceful degradation
   - Regex pattern `/\$\{([^}]+)\}/g` reliably matches `${VAR}` syntax

3. **YAML Parser Integration**
   - Three-step flow: Read → Parse → Substitute → Validate
   - Error handling at each step with descriptive messages
   - `safeParse()` prevents exceptions, allows custom error formatting

4. **JSON Schema Generation**
   - `zodToJsonSchema` with `$refStrategy: 'none'` creates standalone schema
   - Enables IDE autocomplete for YAML config files
   - Script in `src/scripts/generate-schema.ts` for easy regeneration

5. **Test-Driven Development**
   - Writing tests first caught edge cases early
   - 42 tests covering: valid/invalid configs, env substitution, YAML parsing
   - All tests pass after fixing assertion strings

### Technical Decisions

1. **Zod over JSON Schema**: Zod provides type inference + validation in one
2. **Warn vs Error for Undefined Env Vars**: Allows configs to work in different environments
3. **Inline JSON Schema**: Simpler than references, easier for users to understand
4. **Temp Directory for Tests**: `/tmp/taal-test-*` prevents pollution of project directory

### Gotchas Encountered

1. **Test Assertion Mismatch**: Initial tests expected "either stdio or http" but actual message was longer
   - Fix: Updated assertions to match actual error message substring
   - Lesson: Run tests early to catch exact error message format

2. **ESM Import Extensions**: Must use `.js` extension in imports (not `.ts`)
   - Example: `import { TaalConfigSchema } from './schema.js'`
   - Bun handles this correctly at runtime

### Dependencies Added
- `zod-to-json-schema@3.25.1` (dev dependency)

### Files Created
```
src/config/
├── schema.ts          # Zod schemas + type exports
├── env.ts             # Environment variable substitution
└── parser.ts          # YAML loading + validation

src/scripts/
└── generate-schema.ts # JSON Schema generator

tests/config/
├── schema.test.ts     # Schema validation tests (15 tests)
├── env.test.ts        # Env substitution tests (16 tests)
└── parser.test.ts     # YAML parsing tests (11 tests)

taal.schema.json       # Generated JSON Schema
```

### Metrics
- **Lines of Code**: ~350 (src) + ~450 (tests)
- **Test Coverage**: 42 tests, 58 assertions
- **Test Execution Time**: ~147ms
- **Type Errors**: 0

### Next Steps
- Task 2: Provider Abstraction Layer (depends on these types)
- Consider adding schema version migration in future
- May need to extend schema for provider-specific features

---

## [2026-01-17T01:15] Task 2: Provider Abstraction Layer

### Successful Patterns

1. **Atomic Write Implementation**
   - Temp file + rename strategy ensures no partial writes
   - Temp file in same directory as target (ensures same filesystem for atomic rename)
   - Cleanup on error prevents orphaned temp files
   - Pattern: write to `.{timestamp}.tmp` → rename to target

2. **Backup Strategy**
   - Timestamped backups in `~/.taal/backups/`
   - ISO timestamp format with sanitized characters (replace `:` and `.` with `-`)
   - Returns null if source doesn't exist (graceful handling)
   - Preserves original file content exactly

3. **Provider Interface Design**
   - Clean separation: metadata vs behavior
   - Support for both static paths and dynamic path functions
   - Optional skills support (not all providers have skills)
   - Async methods for I/O operations

4. **Provider Registry Pattern**
   - Singleton instance for global access
   - Map-based storage for O(1) lookups
   - Separate class export for testing
   - `getInstalled()` filters by actual installation status

5. **Config Format Utilities**
   - Separate readers for JSON, YAML, TOML
   - Return empty object if file doesn't exist (graceful defaults)
   - Unified `readConfig()` dispatcher based on format
   - Path resolver handles both string and function paths

### Technical Decisions

1. **Atomic Writes**: Prevents corruption during crashes/interruptions
2. **Backup Before Write**: Safety net for user data
3. **Registry Singleton**: Single source of truth for providers
4. **Format-Specific Readers**: Type-safe parsing per format
5. **Deferred YAML/TOML Writers**: JSON-only for now (will add when needed)

### Gotchas Encountered

1. **Bun.file() for Directories**: Initial test tried to read directory as file
   - Error: "Directories cannot be read like files"
   - Fix: Use `fs.readdirSync()` to check for temp files
   - Lesson: Bun.file() is for files only, not directories

2. **Temp File Naming**: Used timestamp to avoid collisions
   - Pattern: `.{Date.now()}.tmp`
   - Ensures uniqueness even with concurrent writes

### Files Created
```
src/utils/
├── atomic-write.ts    # Atomic file write utility
└── backup.ts          # Config backup utility

src/providers/
├── types.ts           # Provider interface + types
├── registry.ts        # Provider registry singleton
└── utils.ts           # Config read/write utilities

tests/providers/
└── abstraction.test.ts # 22 tests for all utilities
```

### Metrics
- **Lines of Code**: ~250 (src) + ~350 (tests)
- **Test Coverage**: 22 tests, 31 assertions
- **Test Execution Time**: ~64ms
- **Type Errors**: 0

### Next Steps
- Task 3a-3h: Implement specific providers (Claude, Cursor, etc.)
- Add YAML/TOML write support when needed
- Consider adding retry logic for atomic writes

---

## [2026-01-17T01:20] Task 4: Skills Handler

### Successful Patterns

1. **Skills Discovery**
   - Recursive directory scanning with graceful error handling
   - Skip non-directories and files in skills root
   - Validate each skill before including in results
   - Support multiple skill paths from config
   - Warn on invalid skills but continue processing

2. **YAML Frontmatter Validation**
   - Check for `---` delimiters at start and end
   - Parse YAML between delimiters
   - Validate required `name` field (string type)
   - Allow additional fields in frontmatter
   - Clear error messages for each validation failure

3. **Skills Copy Strategy**
   - Use `cpSync` with recursive option for entire skill directory
   - Preserve all files and subdirectories (scripts, references, etc.)
   - Overwrite by default (configurable via options)
   - Create target directory if missing
   - Continue on individual skill copy failures

4. **Skill Structure**
   - Export `Skill` interface with name, path, skillMdPath
   - Separate concerns: discovery, validation, copying
   - Validator returns structured result (valid, error, name)
   - Copy functions accept skill objects, not raw paths

### Technical Decisions

1. **Frontmatter Format**: YAML between `---` delimiters (Agent Skills spec)
2. **Required Field**: Only `name` is required (minimal validation)
3. **Copy Behavior**: Overwrite by default (sync semantics)
4. **Error Handling**: Warn and continue (don't fail entire operation)
5. **Directory Structure**: Preserve exact structure including subdirectories

### Gotchas Encountered

1. **Empty YAML Frontmatter**: Empty content between `---` parses as `null`, not object
   - Fix: Check for null/non-object and provide appropriate error
   - Lesson: YAML parser behavior differs from JSON for empty content

2. **Frontmatter Delimiter Detection**: Need to find `\n---\n` not just `---`
   - Pattern: `content.indexOf('\n---\n', 4)` to skip opening delimiter
   - Ensures proper closing delimiter detection

3. **Console Output in Tests**: Skills copy logs to console during tests
   - Expected behavior: Informational logging
   - Could be suppressed in tests if needed

### Files Created
```
src/skills/
├── discovery.ts       # Discover skills from paths
├── validator.ts       # Validate SKILL.md format
└── copy.ts            # Copy skills to provider

tests/skills/
├── discovery.test.ts  # 10 discovery tests
├── validator.test.ts  # 12 validation tests
└── copy.test.ts       # 9 copy tests
```

### Metrics
- **Lines of Code**: ~200 (src) + ~450 (tests)
- **Test Coverage**: 28 tests, 55 assertions
- **Test Execution Time**: ~64ms
- **Type Errors**: 0

### Next Steps
- Task 5a-5g: Implement CLI commands (init, collect, sync, etc.)
- Consider adding skill metadata caching
- May add skill version validation in future

---

## [2026-01-17T01:25] Task 3a: Claude Provider (Desktop + Code)

### Successful Patterns

1. **Provider Class Implementation**
   - Implement Provider interface from types.ts
   - Use class syntax for clean encapsulation
   - Metadata as class properties (name, format, mcpKey, etc.)
   - Async methods for I/O operations

2. **Path Resolution Strategy**
   - Use function for configPath: `(home: string) => string`
   - Allows dynamic path construction per user
   - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Claude Code: `~/.claude/settings.json`
   - Shared skills path: `~/.claude/skills/`

3. **Server Transformation Logic**
   - Filter out HTTP servers (Claude only supports stdio)
   - Warn on skipped servers (don't fail silently)
   - Only include fields that exist (use spread with conditionals)
   - Pattern: `...(server.args && { args: server.args })`

4. **Installation Detection**
   - Check if config directory exists (not file)
   - Use `dirname()` to get parent directory
   - More reliable than checking for config file

5. **Code Reuse Between Providers**
   - Claude Desktop and Claude Code share almost identical logic
   - Only difference: config path
   - Could extract base class in future, but duplication is minimal

### Technical Decisions

1. **Stdio Only**: Claude doesn't support HTTP servers, skip with warning
2. **Shared Skills Path**: Both Desktop and Code use `~/.claude/skills/`
3. **JSON Format**: Both use JSON with `mcpServers` key
4. **Optional Fields**: Only include args/env if present (cleaner output)
5. **Class-Based**: Use classes for providers (vs plain objects)

### Gotchas Encountered

None - implementation was straightforward following the Provider interface.

### Files Created
```
src/providers/
├── claude-desktop.ts  # Claude Desktop provider
└── claude-code.ts     # Claude Code provider

tests/providers/
└── claude.test.ts     # 16 tests for both providers
```

### Metrics
- **Lines of Code**: ~120 (src) + ~280 (tests)
- **Test Coverage**: 16 tests, 24 assertions
- **Test Execution Time**: ~164ms
- **Type Errors**: 0

### Next Steps
- Task 3b-3h: Implement remaining providers (Cursor, Continue, Zed, etc.)
- All provider implementations can be parallelized
- Consider extracting base provider class if duplication increases
