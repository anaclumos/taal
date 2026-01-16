# Zed Editor Configuration Format - Research Summary

## Quick Answer

**Zed uses JSONC (JSON with Comments)** - a superset of JSON that allows:
- ✅ Comments: `//` (single-line) and `/* */` (multi-line)
- ✅ Trailing commas in objects and arrays
- ✅ Standard JSON syntax (quoted keys, double quotes)

---

## Key Findings

### 1. Official Confirmation
From **Zed's official documentation** (https://zed.dev/docs/configuring-zed):
> "The syntax for configuration files is a super-set of JSON that allows `//` comments."

### 2. Parser Implementation
Zed uses **`serde_json_lenient`** - a lenient JSON parser specifically designed for hand-edited configuration files.

**Features:**
- Parses `//` and `/* */` comments
- Allows trailing commas
- Preserves comments when programmatically updating settings

### 3. Real-World Evidence
Zed's own default settings file (`assets/settings/initial_user_settings.json`) uses JSONC:

```json
// Zed settings
//
// For information on how to configure Zed, see the Zed
// documentation: https://zed.dev/docs/configuring-zed
{
  "ui_font_size": 16,
  "buffer_font_size": 15,
  "theme": {
    "mode": "system",
    "light": "One Light",
    "dark": "One Dark",
  },
}
```

Notice:
- Comments at the top
- Trailing comma after `"dark": "One Dark",`

### 4. Test Evidence
Zed's test suite explicitly verifies:
- Comment preservation during JSON updates
- Trailing comma support in arrays and objects

---

## Why TAAL is Failing

**Error**: "Property name must be a string literal"

**Cause**: TAAL is using a **strict JSON parser** that doesn't support JSONC features.

**Solution**: Switch to a lenient JSON parser that supports JSONC.

---

## What's NOT Supported

- ❌ Unquoted keys (e.g., `{a: 1}` - must be `{"a": 1}`)
- ❌ Single quotes (e.g., `{'key': 'value'}` - must use double quotes)
- ❌ JSON5 features like `Infinity`, `NaN`, hex numbers

---

## Implementation Details

### Zed's Approach
1. **Parser**: `serde_json_lenient` crate
2. **Location**: `/crates/settings_json/src/settings_json.rs`
3. **Key function**: `parse_json_with_comments<T>()`
4. **Special feature**: `replace_value_in_json_text()` - preserves formatting when updating

### Why This Matters
Zed doesn't just parse JSONC - it **preserves comments and formatting** when the editor programmatically updates settings. This is a sophisticated approach that maintains user comments even after automatic modifications.

---

## Comparison: Zed vs VS Code

| Aspect | Zed | VS Code |
|--------|-----|---------|
| Format | JSONC | JSONC |
| Comments | `//` and `/* */` | `//` and `/* */` |
| Trailing commas | ✅ Yes | ✅ Yes |
| Parser | `serde_json_lenient` | `node-jsonc-parser` |
| Comment preservation | ✅ Yes | ✅ Yes |

Both editors use JSONC, but with different implementations.

---

## Recommendations for TAAL

### Immediate Fix
Replace strict JSON parser with a JSONC parser:
- **JavaScript/TypeScript**: `jsonc-parser` or `json5`
- **Python**: `json5` or `commentjson`
- **Rust**: `serde_json_lenient`

### Best Practice
Consider implementing comment preservation when updating settings programmatically (like Zed does).

---

## Sources

1. **Official Zed Documentation**: https://zed.dev/docs/configuring-zed
2. **Zed JSON Language Support**: https://zed.dev/docs/languages/json
3. **Zed GitHub Repository**: https://github.com/zed-industries/zed
4. **serde_json_lenient Documentation**: https://docs.rs/serde_json_lenient
5. **Zed Settings JSON Crate**: https://github.com/zed-industries/zed/tree/main/crates/settings_json

---

## Conclusion

Zed's `settings.json` is **definitively JSONC**, not strict JSON. The error TAAL is experiencing confirms that TAAL needs to implement JSONC parsing support to properly handle Zed configuration files.
