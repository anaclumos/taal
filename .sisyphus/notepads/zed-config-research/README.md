# Zed Editor Configuration Format Research

## 📋 Contents

This research directory contains comprehensive findings about Zed editor's configuration file format.

### Files

1. **summary.md** - Quick reference with key findings
2. **findings.md** - Detailed research with evidence and sources
3. **implementation-guide.md** - Actionable steps for TAAL to implement JSONC support

---

## 🎯 Quick Answer

**Zed uses JSONC (JSON with Comments)** - a superset of JSON that supports:
- ✅ Single-line comments (`//`)
- ✅ Multi-line comments (`/* */`)
- ✅ Trailing commas in objects and arrays

---

## 🔍 Research Methodology

This research was conducted using:

1. **Official Documentation**
   - Zed's official docs at https://zed.dev/docs/
   - JSON language support documentation

2. **Source Code Analysis**
   - Zed GitHub repository (zed-industries/zed)
   - Settings JSON crate implementation
   - Default settings files
   - Unit tests

3. **Technical Deep Dive**
   - Parser implementation: `serde_json_lenient`
   - Comment preservation logic
   - Trailing comma handling

4. **Comparative Analysis**
   - VS Code's JSONC implementation
   - Other editor configurations

---

## 📊 Key Findings

| Aspect | Status | Evidence |
|--------|--------|----------|
| Comments supported | ✅ Yes | Official docs + default settings file |
| Trailing commas | ✅ Yes | Unit tests + default settings file |
| Parser used | `serde_json_lenient` | Zed source code |
| Comment preservation | ✅ Yes | `replace_value_in_json_text()` function |

---

## 🚨 TAAL's Current Issue

**Error**: "Property name must be a string literal"

**Cause**: TAAL uses strict JSON parser that rejects JSONC features

**Solution**: Implement JSONC parsing support (see implementation-guide.md)

---

## 📚 Sources

- **Official Zed Docs**: https://zed.dev/docs/configuring-zed
- **Zed GitHub**: https://github.com/zed-industries/zed
- **serde_json_lenient**: https://docs.rs/serde_json_lenient
- **JSONC Spec**: https://jsonc.org/

---

## ✅ Verification

All findings have been verified against:
- Official Zed documentation
- Zed's source code
- Real-world configuration examples
- Unit tests in Zed's codebase

---

## 🔗 Related Issues

- Zed Issue #12316: "Certain comments are not permitted in Zed's settings.json"
- Zed Issue #6074: "Allow support for trailing commas in JSON blocks"
- Zed Issue #14906: "Mark tsconfig.json as JSONC"

---

## 📝 Next Steps for TAAL

1. Choose a JSONC parser library for your language
2. Replace strict JSON parser with JSONC parser
3. Add test cases for JSONC features
4. Update error messages
5. Document JSONC support

See **implementation-guide.md** for detailed instructions.

---

**Research Date**: January 2026
**Status**: Complete and verified
