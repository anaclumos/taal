# Zed Editor Configuration File Format Research

## Executive Summary

**Zed uses JSONC (JSON with Comments)** for its configuration files, specifically a lenient variant that supports:
- ✅ Single-line comments (`//`)
- ✅ Multi-line comments (`/* */`)
- ✅ Trailing commas in objects and arrays
- ✅ Quoted keys (standard JSON requirement)

**NOT supported:**
- ❌ Unquoted keys (standard JSON requirement)
- ❌ Single quotes (must use double quotes)

---

## Official Documentation

### Primary Source: Zed Docs
**URL**: https://zed.dev/docs/configuring-zed

Key quote from official documentation:
> "The syntax for configuration files is a super-set of JSON that allows `//` comments."

### JSON Language Support
**URL**: https://zed.dev/docs/languages/json

Zed documentation explicitly states:
> "Zed also supports a super-set of JSON called JSONC, which allows single line comments (`//`) in JSON files."

---

## Technical Implementation

### Parser Used: `serde_json_lenient`

Zed uses **`serde_json_lenient`** - a lenient JSON parser that extends standard JSON with:
- `/* */` and `//` style comments
- Trailing commas for object and array literals
- Designed specifically for hand-edited configuration files

**Source**: Settings Migration and Import documentation confirms Zed uses `serde_json_lenient` when importing VS Code/Cursor settings.

### Crate: `settings_json`

Zed's internal implementation:
- **Location**: `/crates/settings_json/src/settings_json.rs`
- **Function**: `parse_json_with_comments<T>` uses `serde_json_lenient::Deserializer`
- **Special Feature**: `replace_value_in_json_text()` - preserves comments and formatting when programmatically updating settings

---

## Evidence from Zed Repository

### Default Settings File
**File**: `assets/settings/initial_user_settings.json`

Example showing JSONC features:
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

**Note**: Trailing comma after `"dark": "One Dark",` - this is valid in Zed's JSONC parser.

### Test Evidence
Unit tests in `crates/settings_json/src/settings_json.rs` explicitly verify:

1. **Comment preservation** - `check_object_replace` tests show `//` and `/* */` comments are preserved
2. **Trailing comma support** - `object_replace_array` test:
   ```rust
   check_object_replace_array(
       r#"{ "items": [ 1, 2, 3, ] }"#,
       &["items", "#1"],
       Some(json!(20)),
       r#"{ "items": [ 1, 20, 3, ] }"#
   );
   ```

---

## Configuration File Locations

### User Settings
- **macOS/Linux**: `~/.config/zed/settings.json`
- **Windows**: `%APPDATA%/Zed/settings.json`
- **Linux (XDG)**: `$XDG_CONFIG_HOME/zed/settings.json`

### Project Settings
- **Location**: `.zed/settings.json` in project root
- **Format**: Same JSONC format as user settings

---

## Known Issues & Limitations

### Issue #12316: "Certain comments are not permitted in Zed's settings.json"
- Some edge cases with comment placement may cause issues
- Generally, comments are supported but there may be specific contexts where they fail

### Issue #6074: "Allow support for trailing commas in JSON blocks"
- Trailing commas are supported in Zed's JSONC parser
- However, Zed's automatic formatting may remove them in some cases

### Prettier Formatting Issue
- When using Prettier formatter on `.jsonc` files, it may add trailing commas
- Workaround: Configure `.prettierrc` to disable trailing commas for JSONC files:
  ```json
  {
    "overrides": [
      {
        "files": ["*.jsonc"],
        "options": {
          "parser": "json",
          "trailingComma": "none"
        }
      }
    ]
  }
  ```

---

## Comparison with Other Editors

### VS Code
- Uses JSONC for `settings.json`
- Supports comments and trailing commas
- Uses `microsoft/node-jsonc-parser` library

### Zed
- Uses JSONC for `settings.json`
- Supports comments and trailing commas
- Uses `serde_json_lenient` (Rust-based)
- **Key difference**: Zed preserves comments when programmatically updating settings

---

## TAAL Parser Implications

### Current Error: "Property name must be a string literal"
This error suggests TAAL is using a strict JSON parser that doesn't support JSONC features.

### Solution
TAAL needs to:
1. Use a lenient JSON parser that supports JSONC
2. Support trailing commas
3. Support both `//` and `/* */` comments
4. Preserve comments when modifying settings (optional but recommended)

### Recommended Approach
- Use a JSONC parser library appropriate for your language
- For JavaScript/TypeScript: `jsonc-parser` or `json5`
- For Python: `json5` or `commentjson`
- For Rust: `serde_json_lenient`

---

## Summary Table

| Feature | Supported | Notes |
|---------|-----------|-------|
| Single-line comments (`//`) | ✅ Yes | Fully supported |
| Multi-line comments (`/* */`) | ✅ Yes | Fully supported |
| Trailing commas | ✅ Yes | Supported in objects and arrays |
| Quoted keys | ✅ Yes | Required (standard JSON) |
| Unquoted keys | ❌ No | Not supported |
| Single quotes | ❌ No | Must use double quotes |
| Comment preservation | ✅ Yes | Preserved when updating settings |

---

## References

1. **Official Zed Docs**: https://zed.dev/docs/configuring-zed
2. **JSON Language Support**: https://zed.dev/docs/languages/json
3. **Zed GitHub Repository**: https://github.com/zed-industries/zed
4. **serde_json_lenient**: https://docs.rs/serde_json_lenient
5. **Zed Settings JSON Crate**: `/crates/settings_json/src/settings_json.rs`
