# TAAL Zed JSON Parser Investigation - Final Report

**Date**: January 17, 2026
**Status**: ✅ INVESTIGATION COMPLETE
**Severity**: MEDIUM (affects 7 providers, but gracefully degraded)

---

## Executive Summary

TAAL's `taal collect` command fails to parse Zed's settings.json file due to a **format mismatch**:

- **Zed uses**: JSONC (JSON with Comments) format
- **TAAL expects**: Strict JSON format
- **Result**: Parse error on trailing commas, Zed provider silently skipped

**Root Cause**: Line 18 of `/Users/cho/.config/zed/settings.json` contains a trailing comma:
```json
"always_allow_tool_actions": true,  ← Invalid in strict JSON
```

**Impact**: 7 JSON-format providers are vulnerable to JSONC syntax.

**Solution**: Replace `JSON.parse()` with `jsonc-parser` library (already available as dependency).

---

## Investigation Findings

### 1. Error Identification ✅

**Error Message**:
```
SyntaxError: JSON Parse error: Property name must be a string literal
```

**Location**: `src/providers/utils.ts:21` in `readJsonConfig()` function

**Stack Trace**:
```
at readJsonConfig (/Users/cho/Developer/taal/src/providers/utils.ts:21:11)
at readConfig (/Users/cho/Developer/taal/src/providers/base.ts:25:20)
at collect (/Users/cho/Developer/taal/src/commands/collect.ts:50:37)
```

### 2. Root Cause Analysis ✅

**File**: `/Users/cho/.config/zed/settings.json`
**Problem**: Trailing comma on line 18

```json
16:    "model_parameters": [],
17:    "always_allow_tool_actions": true,  ← TRAILING COMMA
18:  },
19:  "ssh_connections": [
```

**Why it fails**:
- Standard `JSON.parse()` rejects trailing commas
- Zed editor accepts them as JSONC
- TAAL uses `JSON.parse()` → parse error

### 3. Format Analysis ✅

**Zed's Format**: JSONC (JSON with Comments)

Supports:
- ✅ Trailing commas
- ✅ Comments (// and /* */)
- ✅ Unquoted keys (not used in this file)

**TAAL's Current Parser**: `JSON.parse()` (strict JSON only)

Supports:
- ✅ Standard JSON
- ❌ Trailing commas
- ❌ Comments
- ❌ Unquoted keys

### 4. Scope Assessment ✅

**Affected Providers** (7 total):

| Provider | Config Path | Format | Status |
|----------|------------|--------|--------|
| Zed | `~/.config/zed/settings.json` | JSON | ❌ FAILING |
| Cursor | `~/Library/Application Support/Cursor/User/settings.json` | JSON | ⚠️ VULNERABLE |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON | ⚠️ VULNERABLE |
| Claude Code | `~/.claude/settings.json` | JSON | ⚠️ VULNERABLE |
| OpenCode | `~/.config/opencode/opencode.json` | JSON | ⚠️ VULNERABLE |
| Windsurf | Provider-specific | JSON | ⚠️ VULNERABLE |
| Antigravity | Provider-specific | JSON | ⚠️ VULNERABLE |

**Not Affected**:
- Continue.dev (YAML) ✅
- Codex (TOML) ✅

### 5. Current Implementation Analysis ✅

**File**: `src/providers/utils.ts` (lines 12-23)

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

### 6. Dependency Analysis ✅

**Available Libraries**:
- ✅ `jsonc-parser@3.3.1` - Available in `bun.lock` (transitive dependency of `ultracite`)
- ❌ `json5` - Not installed

**Recommendation**: Use `jsonc-parser` (already available, no new dependencies)

---

## Detailed Findings

### Why Modern Editors Use JSONC

VS Code, Cursor, Zed, and other modern editors use JSONC for settings because:

1. **Trailing commas** - Easier to edit without syntax errors
   ```json
   {
     "key1": "value1",
     "key2": "value2",  ← Can add/remove without fixing comma
   }
   ```

2. **Comments** - Document settings inline
   ```json
   {
     // This is a comment
     "key": "value"  // Inline comment
   }
   ```

3. **Better UX** - Less friction for users
   - No need to worry about trailing commas
   - Can document complex settings
   - More forgiving format

### Error Handling in TAAL

The error is caught and handled gracefully:

```typescript
// In src/commands/collect.ts:80-86
try {
  const config = await provider.readConfig(home);
  // ...
} catch (error) {
  console.warn(
    `Warning: Failed to read config from ${provider.name}:`,
    error
  );
}
```

**Result**: 
- ✅ Zed provider error is logged as warning
- ✅ `collect` command continues
- ✅ Other providers are processed
- ❌ Zed config is not synced

### Current Behavior

```bash
$ bun run src/index.ts collect

Scanning installed providers...
Warning: Failed to read config from zed: warn: Failed to read JSON config at /Users/cho/.config/zed/settings.json: SyntaxError: JSON Parse error: Property name must be a string literal
      at readJsonConfig (/Users/cho/Developer/taal/src/providers/utils.ts:21:11)
      at readConfig (/Users/cho/Developer/taal/src/providers/base.ts:25:20)
      at collect (/Users/cho/Developer/taal/src/commands/collect.ts:50:37)

✓ Found 4 servers from 3 providers  ← Should be 4+ providers

⚠ Conflicts detected:
  - "atlassian" found in: claude-code, opencode

✓ Updated config: /Users/cho/.taal/config.yaml
```

**Issue**: Zed provider is silently skipped, reducing the number of providers scanned.

---

## Solution Analysis

### Option 1: Use `jsonc-parser` (RECOMMENDED) ✅

**Library**: `jsonc-parser@3.3.1` (already available)

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
- ✅ No new dependencies (already available)
- ✅ Backward compatible (JSONC is superset of JSON)
- ✅ Fixes all 7 JSON providers
- ✅ Handles comments and trailing commas
- ✅ Well-maintained library (used by VS Code)
- ✅ Minimal code change

**Disadvantages**:
- ❌ None identified

**Effort**: 1-2 hours

**Risk**: LOW (backward compatible)

### Option 2: Use `json5` Library

**Library**: `json5` (not currently installed)

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
- ❌ Less commonly used than jsonc-parser

**Effort**: 1-2 hours

**Risk**: LOW (backward compatible)

### Option 3: Regex Preprocessing

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
- ❌ Not maintainable

**Not recommended**

### Option 4: Do Nothing

**Current behavior**:
- ❌ Zed provider silently fails
- ❌ Warning logged but collect succeeds
- ❌ Zed config not synced
- ❌ Other JSON providers vulnerable

**Impact**: Users with Zed won't get MCP servers synced.

**Not recommended**

---

## Recommendation

**Use Option 1: `jsonc-parser`**

**Rationale**:
1. Library already available (no new dependencies)
2. Minimal code change (1 import, 1 function call)
3. Fixes all 7 JSON providers
4. Backward compatible
5. Well-tested library (used by VS Code)
6. Handles both comments and trailing commas

---

## Implementation Plan

### Phase 1: Code Changes (30 minutes)

**File**: `src/providers/utils.ts`

```typescript
// Add import at top
import { parse as parseJsonc } from 'jsonc-parser';

// Update readJsonConfig function
export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    return parseJsonc(content);  // Changed from JSON.parse()
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}
```

### Phase 2: Testing (30 minutes)

**File**: `tests/providers/utils.test.ts`

Add test cases for:
1. Standard JSON (backward compatibility)
2. JSONC with trailing commas
3. JSONC with comments
4. JSONC with mixed syntax
5. Real Zed settings.json format

### Phase 3: Documentation (15 minutes)

**File**: `README.md`

Update to note:
- JSON configs support JSONC format
- Trailing commas are allowed
- Comments are supported

### Phase 4: Verification (15 minutes)

```bash
# Run tests
bun test

# Run collect command
bun run src/index.ts collect

# Verify Zed is included
# Should show: "providersWithConfigs: 4" (or more)
```

**Total Effort**: ~1.5 hours

---

## Verification Checklist

### Before Fix
- [ ] `taal collect` shows warning for Zed
- [ ] Zed provider is skipped
- [ ] Only 3 providers with configs

### After Fix
- [ ] `taal collect` succeeds without warnings
- [ ] Zed provider is included
- [ ] 4+ providers with configs
- [ ] All tests pass
- [ ] No breaking changes

---

## Files Involved

### To Modify
- `src/providers/utils.ts` - Update `readJsonConfig()` function

### To Add/Update
- `tests/providers/utils.test.ts` - Add JSONC test cases
- `README.md` - Document JSONC support

### No Changes Needed
- `src/providers/zed.ts` - Already correct
- `src/providers/base.ts` - Already correct
- `src/commands/collect.ts` - Already correct
- `package.json` - No new dependencies needed

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

**Problem**: TAAL's JSON parser fails on Zed's settings.json because Zed uses JSONC format (with trailing commas) while TAAL uses strict JSON parsing.

**Root Cause**: Line 18 of `/Users/cho/.config/zed/settings.json` contains a trailing comma that is valid in JSONC but invalid in strict JSON.

**Scope**: 7 JSON-format providers are vulnerable to JSONC syntax.

**Solution**: Replace `JSON.parse()` with `jsonc-parser` in `readJsonConfig()` function.

**Effort**: 1-2 hours

**Risk**: LOW (backward compatible)

**Recommendation**: Implement Option 1 (use `jsonc-parser`) immediately.

---

## Appendix: Technical Details

### JSONC vs JSON vs JSON5

| Feature | JSON | JSONC | JSON5 |
|---------|------|-------|-------|
| Trailing commas | ❌ | ✅ | ✅ |
| Comments | ❌ | ✅ | ✅ |
| Unquoted keys | ❌ | ❌ | ✅ |
| Single quotes | ❌ | ❌ | ✅ |
| Hex numbers | ❌ | ❌ | ✅ |

### Library Comparison

| Library | Size | Speed | Maintenance | Used By |
|---------|------|-------|-------------|---------|
| `jsonc-parser` | Small | Fast | Active | VS Code |
| `json5` | Medium | Medium | Active | Various |
| `JSON.parse()` | Built-in | Fastest | N/A | Native |

### Zed Settings File Details

- **Path**: `/Users/cho/.config/zed/settings.json`
- **Size**: 1,004 bytes
- **Format**: JSONC
- **Trailing commas**: Yes (line 18)
- **Comments**: No
- **Unquoted keys**: No

---

## References

- [JSONC Parser NPM](https://www.npmjs.com/package/jsonc-parser)
- [JSON5 Specification](https://spec.json5.org/)
- [VS Code Settings Format](https://code.visualstudio.com/docs/getstarted/settings)
- [Zed Editor Documentation](https://zed.dev/docs)

---

**Investigation completed**: January 17, 2026
**Investigator**: Claude Code
**Status**: Ready for implementation
