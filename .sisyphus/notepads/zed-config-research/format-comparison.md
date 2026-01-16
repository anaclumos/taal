# JSON vs JSONC vs JSON5 Comparison

## Format Specifications

### Strict JSON
```json
{
  "name": "John",
  "age": 30,
  "hobbies": ["reading", "coding"]
}
```

**Features:**
- ✅ Quoted keys
- ✅ Quoted strings
- ✅ Numbers, booleans, null
- ❌ Comments
- ❌ Trailing commas
- ❌ Unquoted keys
- ❌ Single quotes

---

### JSONC (JSON with Comments)
```jsonc
{
  // User information
  "name": "John",
  "age": 30,
  /* Hobbies list
     (can be multiple lines) */
  "hobbies": ["reading", "coding",],  // trailing comma
}
```

**Features:**
- ✅ Quoted keys
- ✅ Quoted strings
- ✅ Numbers, booleans, null
- ✅ Single-line comments (`//`)
- ✅ Multi-line comments (`/* */`)
- ✅ Trailing commas
- ❌ Unquoted keys
- ❌ Single quotes

**Used by:**
- VS Code (settings.json)
- Zed (settings.json)
- Many other editors

---

### JSON5
```json5
{
  // User information
  name: 'John',  // unquoted key, single quotes
  age: 30,
  /* Hobbies list */
  hobbies: ['reading', 'coding',],  // trailing comma
  hex: 0xFF,
  infinity: Infinity,
  notANumber: NaN,
}
```

**Features:**
- ✅ Quoted keys
- ✅ Unquoted keys
- ✅ Quoted strings
- ✅ Single quotes
- ✅ Numbers, booleans, null
- ✅ Infinity, NaN, hex numbers
- ✅ Single-line comments (`//`)
- ✅ Multi-line comments (`/* */`)
- ✅ Trailing commas

**Used by:**
- Some configuration files
- Less common than JSONC

---

## Zed's Format

### Official Classification
**JSONC** (JSON with Comments)

### Supported Features
```jsonc
{
  // Single-line comment
  "setting1": "value1",
  
  /* Multi-line
     comment */
  "setting2": {
    "nested": "value",
    "trailing": "comma",  // <- allowed
  },
  
  "array": [
    "item1",
    "item2",  // <- trailing comma allowed
  ],
}
```

### NOT Supported
```jsonc
{
  // ❌ Unquoted keys
  unquoted: "value",
  
  // ❌ Single quotes
  'key': 'value',
  
  // ❌ Unquoted strings
  key: value,
  
  // ❌ Special numbers
  hex: 0xFF,
  infinity: Infinity,
}
```

---

## Parser Comparison

| Feature | JSON | JSONC | JSON5 |
|---------|------|-------|-------|
| Comments | ❌ | ✅ | ✅ |
| Trailing commas | ❌ | ✅ | ✅ |
| Unquoted keys | ❌ | ❌ | ✅ |
| Single quotes | ❌ | ❌ | ✅ |
| Hex numbers | ❌ | ❌ | ✅ |
| Infinity/NaN | ❌ | ❌ | ✅ |

---

## Real-World Examples

### Zed's Default Settings (JSONC)
```jsonc
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

### VS Code's settings.json (JSONC)
```jsonc
{
  // Controls the font family
  "editor.fontFamily": "Fira Code",
  
  // Controls the font size
  "editor.fontSize": 14,
  
  // Format on save
  "editor.formatOnSave": true,
}
```

### TypeScript's tsconfig.json (JSONC)
```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "strict": true,  // trailing comma
  },
}
```

---

## Why JSONC for Configuration?

1. **Comments**: Document settings inline
2. **Trailing commas**: Easier to edit (no comma management)
3. **Human-friendly**: Designed for hand-editing
4. **Backward compatible**: Valid JSON is valid JSONC

---

## TAAL's Situation

### Current State
- ❌ Parses strict JSON only
- ❌ Rejects comments
- ❌ Rejects trailing commas
- ❌ Error: "Property name must be a string literal"

### Required State
- ✅ Parse JSONC
- ✅ Accept comments
- ✅ Accept trailing commas
- ✅ Provide clear error messages

### Solution
Use a JSONC parser library instead of strict JSON parser.

---

## Library Recommendations

### JavaScript/TypeScript
```typescript
import { parse } from 'jsonc-parser';
const config = parse(jsonString);
```
**Library**: `jsonc-parser` (Microsoft)

### Python
```python
import json5
config = json5.loads(jsonString)
```
**Library**: `json5`

### Rust
```rust
use serde_json_lenient::from_str;
let config = from_str(jsonString)?;
```
**Library**: `serde_json_lenient`

---

## Testing Checklist

- [ ] Parse JSON (backward compatibility)
- [ ] Parse JSONC with `//` comments
- [ ] Parse JSONC with `/* */` comments
- [ ] Parse JSONC with trailing commas
- [ ] Parse JSONC with mixed features
- [ ] Reject invalid JSON5 features (unquoted keys, single quotes)
- [ ] Provide line/column error information
- [ ] Handle nested structures

---

## Conclusion

Zed uses **JSONC**, not strict JSON. TAAL must implement JSONC parsing to properly handle Zed configuration files.
