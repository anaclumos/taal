# TAAL Implementation Guide: Zed JSONC Parser

## Problem Statement

TAAL is failing to parse Zed's `settings.json` with error:
```
Property name must be a string literal
```

**Root Cause**: TAAL uses a strict JSON parser that rejects JSONC features (comments, trailing commas).

**Solution**: Implement JSONC parsing support.

---

## What TAAL Needs to Parse

### Valid Zed Configuration Examples

#### Example 1: Comments
```json
{
  // This is a comment
  "theme": "dark",
  /* Multi-line
     comment */
  "font_size": 14
}
```

#### Example 2: Trailing Commas
```json
{
  "settings": {
    "theme": "dark",
    "font_size": 14,  // <- trailing comma
  },
  "extensions": [
    "rust",
    "python",
  ],  // <- trailing comma
}
```

#### Example 3: Combined
```json
{
  // User preferences
  "theme": {
    "mode": "system",
    "light": "One Light",
    "dark": "One Dark",  // <- trailing comma
  },
  /* Editor settings */
  "buffer_font_size": 15,
}
```

---

## Implementation Options

### Option 1: Use Existing JSONC Library (Recommended)

#### JavaScript/TypeScript
```typescript
import { parse } from 'jsonc-parser';

const content = fs.readFileSync('settings.json', 'utf-8');
const config = parse(content);
```

**Library**: `jsonc-parser` (by Microsoft)
- Actively maintained
- Handles comments and trailing commas
- Preserves location information

#### Python
```python
import json5

with open('settings.json', 'r') as f:
    config = json5.load(f)
```

**Library**: `json5`
- Supports JSONC features
- Simple API

#### Rust
```rust
use serde_json_lenient::from_str;

let content = std::fs::read_to_string("settings.json")?;
let config: serde_json::Value = from_str(&content)?;
```

**Library**: `serde_json_lenient`
- Zed's own choice
- Lenient parsing
- Preserves comments (with additional logic)

---

### Option 2: Preprocess to Remove Comments

If you can't use a JSONC library, strip comments before parsing:

```javascript
function stripComments(jsonString) {
  return jsonString
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove /* */ comments
    .replace(/\/\/.*$/gm, '')           // Remove // comments
    .replace(/,(\s*[}\]])/g, '$1');     // Remove trailing commas
}

const cleanJson = stripComments(content);
const config = JSON.parse(cleanJson);
```

**Pros**: Works with any JSON parser
**Cons**: Loses comment information, fragile regex

---

### Option 3: Custom JSONC Parser

Build a simple JSONC parser:

```javascript
class JSONCParser {
  parse(text) {
    // 1. Tokenize (handle comments)
    // 2. Parse tokens into AST
    // 3. Convert AST to JavaScript object
  }
}
```

**Pros**: Full control
**Cons**: Complex, error-prone, maintenance burden

---

## Recommended Approach for TAAL

### Step 1: Identify TAAL's Language
- If JavaScript/TypeScript: Use `jsonc-parser`
- If Python: Use `json5`
- If Rust: Use `serde_json_lenient`
- If other: Find equivalent JSONC library

### Step 2: Update Parser
Replace strict JSON parser with JSONC parser in the relevant module.

### Step 3: Test Cases
Ensure TAAL can parse:
1. Comments (single-line and multi-line)
2. Trailing commas
3. Standard JSON (backward compatibility)
4. Mixed features

### Step 4: Error Handling
Provide clear error messages when parsing fails:
```
Error parsing settings.json at line 15, column 3:
  Unexpected token '}' - did you mean to remove the trailing comma?
```

---

## Testing Checklist

- [ ] Parse Zed's default settings file
- [ ] Parse settings with `//` comments
- [ ] Parse settings with `/* */` comments
- [ ] Parse settings with trailing commas
- [ ] Parse settings with mixed features
- [ ] Preserve error location information (line/column)
- [ ] Handle nested objects with comments
- [ ] Handle arrays with trailing commas
- [ ] Backward compatibility with strict JSON

---

## Example: JavaScript Implementation

```javascript
import { parse, printParseErrorCode } from 'jsonc-parser';
import fs from 'fs';

function loadZedSettings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const errors = [];
    
    const config = parse(content, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });
    
    if (errors.length > 0) {
      errors.forEach(error => {
        console.error(
          `Parse error at offset ${error.offset}: ${printParseErrorCode(error.error)}`
        );
      });
      throw new Error('Failed to parse settings.json');
    }
    
    return config;
  } catch (error) {
    console.error(`Error loading settings from ${filePath}:`, error.message);
    throw error;
  }
}

// Usage
const settings = loadZedSettings('~/.config/zed/settings.json');
console.log(settings);
```

---

## Example: Python Implementation

```python
import json5
from pathlib import Path

def load_zed_settings(file_path):
    """Load Zed settings.json with JSONC support."""
    try:
        with open(Path(file_path).expanduser(), 'r') as f:
            config = json5.load(f)
        return config
    except json5.JSON5DecodeError as e:
        print(f"Error parsing settings.json: {e}")
        raise
    except FileNotFoundError:
        print(f"Settings file not found: {file_path}")
        raise

# Usage
settings = load_zed_settings('~/.config/zed/settings.json')
print(settings)
```

---

## Example: Rust Implementation

```rust
use serde_json_lenient::from_str;
use std::fs;

fn load_zed_settings(file_path: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let content = fs::read_to_string(file_path)?;
    let config = from_str(&content)?;
    Ok(config)
}

// Usage
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let settings = load_zed_settings("~/.config/zed/settings.json")?;
    println!("{:#}", settings);
    Ok(())
}
```

---

## Validation Against Zed's Actual Format

### Test File: Zed's Default Settings
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

**Validation**: Your parser should successfully parse this without errors.

---

## Migration Path

1. **Phase 1**: Add JSONC parser library
2. **Phase 2**: Update settings loading code
3. **Phase 3**: Add comprehensive tests
4. **Phase 4**: Update error messages
5. **Phase 5**: Document JSONC support in TAAL

---

## References

- **jsonc-parser**: https://github.com/microsoft/node-jsonc-parser
- **json5**: https://github.com/dpranke/pyjson5
- **serde_json_lenient**: https://docs.rs/serde_json_lenient
- **JSONC Spec**: https://jsonc.org/

---

## Conclusion

TAAL needs to support JSONC to properly parse Zed's configuration files. The recommended approach is to use an existing, well-maintained JSONC library rather than building a custom parser. This ensures compatibility and reduces maintenance burden.
