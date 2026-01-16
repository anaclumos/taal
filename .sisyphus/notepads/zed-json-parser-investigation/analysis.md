# TAAL Zed JSON Parser - Complete Analysis

## Investigation Summary

### Problem Statement
`taal collect` fails when reading Zed's settings.json with:
```
SyntaxError: JSON Parse error: Property name must be a string literal
```

### Root Cause
**Zed uses JSONC (JSON with Comments) format**, which includes trailing commas that are invalid in standard JSON.

---

## Evidence

### 1. Zed Settings File Analysis

**File**: `/Users/cho/.config/zed/settings.json`
**Size**: 1,004 bytes
**Format**: JSONC (JSON with Comments)

**Problematic Section** (lines 16-19):
```json
    "model_parameters": [],
    "always_allow_tool_actions": true,  ← TRAILING COMMA
  },
  "ssh_connections": [
```

**Why it fails**:
- Standard `JSON.parse()` rejects trailing commas
- Zed editor accepts them as JSONC
- TAAL uses `JSON.parse()` → parse error

### 2. Error Stack Trace

```
Warning: Failed to read config from zed: warn: Failed to read JSON config at /Users/cho/.config/zed/settings.json: SyntaxError: JSON Parse error: Property name must be a string literal
      at readJsonConfig (/Users/cho/Developer/taal/src/providers/utils.ts:21:11)
      at readConfig (/Users/cho/Developer/taal/src/providers/base.ts:25:20)
      at collect (/Users/cho/Developer/taal/src/commands/collect.ts:50:37)
```

**Call chain**:
1. `collect()` → `src/commands/collect.ts:50`
2. `provider.readConfig()` → `src/providers/base.ts:28`
3. `readConfig()` → `src/providers/utils.ts:60-63`
4. `readJsonConfig()` → `src/providers/utils.ts:12-23`
5. `JSON.parse()` ← **FAILS HERE**

### 3. TAAL's Current JSON Parsing

**File**: `src/providers/utils.ts` (lines 12-23)

```typescript
export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);  // ← Native JSON.parse()
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

**Limitation**: Only supports strict JSON, not JSONC or JSON5.

### 4. Zed Provider Configuration

**File**: `src/providers/zed.ts`

```typescript
export class ZedProvider extends BaseProvider {
  name = "zed";
  configPath = (home: string) => join(home, ".config", "zed", "settings.json");
  format = "json" as const;  // ← Declared as JSON
  mcpKey = "context_servers";
  // ...
}
```

**Issue**: Declared as `"json"` format, but Zed actually uses JSONC.

---

## Scope Analysis

### Affected Providers (7 total)

All JSON-format providers are vulnerable to JSONC syntax:

| Provider | Config Path | Format | Status |
|----------|------------|--------|--------|
| **Zed** | `~/.config/zed/settings.json` | JSON | ❌ FAILING |
| **Cursor** | `~/Library/Application Support/Cursor/User/settings.json` | JSON | ⚠️ VULNERABLE |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON | ⚠️ VULNERABLE |
| **Claude Code** | `~/.claude/settings.json` | JSON | ⚠️ VULNERABLE |
| **OpenCode** | `~/.config/opencode/opencode.json` | JSON | ⚠️ VULNERABLE |
| **Windsurf** | Provider-specific | JSON | ⚠️ VULNERABLE |
| **Antigravity** | Provider-specific | JSON | ⚠️ VULNERABLE |

**Other providers** (not affected):
- Continue.dev (YAML) ✅
- Codex (TOML) ✅

### Why Modern Editors Use JSONC

VS Code, Cursor, Zed, and other modern editors use JSONC for settings because:
1. **Trailing commas** - Easier to edit without syntax errors
2. **Comments** - Document settings inline
3. **Better UX** - Less friction for users

---

## Available Solutions

### Solution 1: Use `jsonc-parser` (RECOMMENDED)

**Status**: Library already available as transitive dependency

**In `bun.lock`**:
```
jsonc-parser@3.3.1
```

**Why it's available**: Installed via `ultracite` (dev dependency)

**Implementation**:
```typescript
import { parse as parseJsonc } from 'jsonc-parser';

export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return parseJsonc(content);  // ← Supports JSONC
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

**Advantages**:
- ✅ No new dependencies needed
- ✅ Backward compatible (JSONC is superset of JSON)
- ✅ Fixes all 7 JSON providers
- ✅ Handles comments and trailing commas
- ✅ Well-maintained library

**Effort**: ~1-2 hours

### Solution 2: Use `json5` Library

**Status**: Not currently installed

**Implementation**:
```typescript
import JSON5 from 'json5';

export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return JSON5.parse(content);  // ← Supports JSON5
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

**Advantages**:
- ✅ Supports JSON5 (superset of JSONC)
- ✅ Backward compatible

**Disadvantages**:
- ❌ Adds new dependency
- ❌ Slightly larger bundle

**Effort**: ~1-2 hours

### Solution 3: Regex Preprocessing

**Implementation**:
```typescript
// Strip trailing commas before JSON.parse()
const cleaned = content.replace(/,(\s*[}\]])/g, '$1');
return JSON.parse(cleaned);
```

**Disadvantages**:
- ❌ Fragile (edge cases)
- ❌ Doesn't handle comments
- ❌ May break on valid JSON with commas in strings

**Not recommended**

### Solution 4: Do Nothing

**Current behavior**:
- ❌ Zed provider silently fails
- ❌ Warning logged but collect succeeds
- ❌ Zed config not synced

**Impact**: Users with Zed won't get MCP servers synced.

---

## Recommendation

**Use Solution 1: `jsonc-parser`**

**Rationale**:
1. Library already available (no new dependencies)
2. Minimal code change (1 import, 1 function call)
3. Fixes all 7 JSON providers
4. Backward compatible
5. Well-tested library

**Implementation Plan**:
1. Update `src/providers/utils.ts` - import and use `jsonc-parser`
2. Add test cases for JSONC syntax
3. Update README to document JSONC support
4. Verify all JSON providers work

---

## Testing Strategy

### Test Cases to Add

1. **Trailing commas**
   ```json
   { "key": "value", }
   ```

2. **Comments**
   ```json
   {
     // This is a comment
     "key": "value"
   }
   ```

3. **Mixed**
   ```json
   {
     // Comment
     "key": "value",
   }
   ```

4. **Backward compatibility**
   ```json
   { "key": "value" }
   ```

### Verification Steps

After implementation:
```bash
# Run tests
bun test

# Run collect command
bun run src/index.ts collect

# Verify Zed is included
# Should show: "providersWithConfigs: 4" (or more)
```

---

## Files Involved

### To Modify
- `src/providers/utils.ts` - Update `readJsonConfig()`

### To Add/Update
- `tests/providers/utils.test.ts` - Add JSONC test cases
- `README.md` - Document JSONC support

### No Changes Needed
- `src/providers/zed.ts` - Already correct
- `src/providers/base.ts` - Already correct
- `src/commands/collect.ts` - Already correct

---

## Impact Assessment

### Positive
- ✅ Fixes Zed provider
- ✅ Fixes all other JSON providers (if they use JSONC)
- ✅ Better compatibility with modern editors
- ✅ No breaking changes

### Negative
- ❌ None identified

### Risk Level
**LOW** - Backward compatible change, well-tested library

---

## Conclusion

TAAL's JSON parser fails on Zed's settings.json because:
1. Zed uses JSONC format (with trailing commas)
2. TAAL uses standard `JSON.parse()` (rejects trailing commas)
3. The error is caught and logged as a warning
4. Zed provider is silently skipped

**Solution**: Replace `JSON.parse()` with `jsonc-parser` in `readJsonConfig()`.

This is a **low-effort, high-impact fix** that improves compatibility with all modern code editors.
