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
