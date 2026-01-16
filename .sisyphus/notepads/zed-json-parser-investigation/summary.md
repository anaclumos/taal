# Investigation Summary: TAAL Zed JSON Parser Failure

## Quick Facts

| Item | Value |
|------|-------|
| **Error** | `SyntaxError: JSON Parse error: Property name must be a string literal` |
| **Location** | Line 18 of `/Users/cho/.config/zed/settings.json` |
| **Root Cause** | Trailing comma in JSONC format |
| **Affected Providers** | 7 JSON-format providers (Zed, Cursor, Claude Desktop, Claude Code, OpenCode, Windsurf, Antigravity) |
| **Current Parser** | `JSON.parse()` (strict JSON only) |
| **Recommended Fix** | Use `jsonc-parser` library |
| **Effort** | 1-2 hours |
| **Risk** | LOW (backward compatible) |

---

## The Problem

### Exact Error Location

**File**: `/Users/cho/.config/zed/settings.json`
**Lines 16-19**:
```json
    "model_parameters": [],
    "always_allow_tool_actions": true,  ← TRAILING COMMA (line 18)
  },
  "ssh_connections": [
```

The trailing comma after `true,` is:
- ✅ Valid in JSONC (JSON with Comments)
- ✅ Valid in JSON5
- ❌ Invalid in standard JSON

### Why Zed Uses JSONC

Modern code editors (VS Code, Cursor, Zed) use JSONC for settings files because:
1. **Trailing commas** - Easier to edit without syntax errors
2. **Comments** - Document settings inline
3. **Better UX** - Less friction for users

### How TAAL Fails

**Call chain**:
```
taal collect
  ↓
collect() [src/commands/collect.ts:50]
  ↓
provider.readConfig() [src/providers/base.ts:28]
  ↓
readConfig() [src/providers/utils.ts:60-63]
  ↓
readJsonConfig() [src/providers/utils.ts:12-23]
  ↓
JSON.parse(content) ← FAILS HERE
  ↓
Error caught and logged as warning
  ↓
Zed provider skipped, collect continues
```

---

## Scope: All JSON Providers Vulnerable

| Provider | Config Path | Format | Status |
|----------|------------|--------|--------|
| Zed | `~/.config/zed/settings.json` | JSON | ❌ FAILING |
| Cursor | `~/Library/Application Support/Cursor/User/settings.json` | JSON | ⚠️ VULNERABLE |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON | ⚠️ VULNERABLE |
| Claude Code | `~/.claude/settings.json` | JSON | ⚠️ VULNERABLE |
| OpenCode | `~/.config/opencode/opencode.json` | JSON | ⚠️ VULNERABLE |
| Windsurf | Provider-specific | JSON | ⚠️ VULNERABLE |
| Antigravity | Provider-specific | JSON | ⚠️ VULNERABLE |

**Other providers** (not affected):
- Continue.dev (YAML) ✅
- Codex (TOML) ✅

---

## Current Implementation

### `src/providers/utils.ts` (lines 12-23)

```typescript
export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);  // ← Uses standard JSON.parse()
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

**Limitation**: Only supports strict JSON, not JSONC or JSON5.

---

## Solution: Use `jsonc-parser`

### Why This Library?

1. **Already available** - Present in `bun.lock` as transitive dependency of `ultracite`
2. **No new dependencies** - Just need to import and use
3. **Backward compatible** - JSONC is superset of JSON
4. **Well-maintained** - Used by VS Code and other major projects
5. **Fixes all 7 JSON providers** - Not just Zed

### Implementation

**Change in `src/providers/utils.ts`**:

```typescript
import { parse as parseJsonc } from 'jsonc-parser';

export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return parseJsonc(content);  // ← Now supports JSONC
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

### What This Fixes

- ✅ Trailing commas
- ✅ Comments (// and /* */)
- ✅ Unquoted keys (if present)
- ✅ All 7 JSON providers
- ✅ Backward compatible with strict JSON

---

## Verification

### Before Fix
```bash
$ bun run src/index.ts collect
Warning: Failed to read config from zed: warn: Failed to read JSON config at /Users/cho/.config/zed/settings.json: SyntaxError: JSON Parse error: Property name must be a string literal
✓ Found 4 servers from 3 providers
```

### After Fix
```bash
$ bun run src/index.ts collect
✓ Found X servers from 4+ providers  ← Zed now included
```

---

## Files to Modify

### Primary
- `src/providers/utils.ts` - Update `readJsonConfig()` function

### Secondary (Testing & Documentation)
- `tests/providers/utils.test.ts` - Add JSONC test cases
- `README.md` - Document JSONC support

### No Changes Needed
- `src/providers/zed.ts` - Already correct
- `src/providers/base.ts` - Already correct
- `src/commands/collect.ts` - Already correct

---

## Test Cases to Add

```typescript
describe('readJsonConfig', () => {
  it('should parse standard JSON', () => {
    // { "key": "value" }
  });

  it('should parse JSONC with trailing commas', () => {
    // { "key": "value", }
  });

  it('should parse JSONC with comments', () => {
    // { /* comment */ "key": "value" }
  });

  it('should parse JSONC with line comments', () => {
    // { "key": "value" // comment
    // }
  });

  it('should handle Zed settings.json format', () => {
    // Real Zed settings with trailing commas
  });
});
```

---

## Impact Assessment

### Positive
- ✅ Fixes Zed provider (confirmed failing)
- ✅ Fixes all other JSON providers (if they use JSONC)
- ✅ Better compatibility with modern editors
- ✅ No breaking changes
- ✅ No new dependencies

### Negative
- ❌ None identified

### Risk Level
**LOW** - Backward compatible change, well-tested library

---

## Conclusion

**TAAL's JSON parser fails on Zed's settings.json because:**
1. Zed uses JSONC format (with trailing commas)
2. TAAL uses standard `JSON.parse()` (rejects trailing commas)
3. The error is caught and logged as a warning
4. Zed provider is silently skipped

**Solution**: Replace `JSON.parse()` with `jsonc-parser` in `readJsonConfig()`.

This is a **low-effort, high-impact fix** that improves compatibility with all modern code editors.

---

## Next Steps

1. ✅ Investigation complete
2. ⏳ Implement fix in `src/providers/utils.ts`
3. ⏳ Add test cases
4. ⏳ Update documentation
5. ⏳ Verify all JSON providers work
6. ⏳ Commit and test
