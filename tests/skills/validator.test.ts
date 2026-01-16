import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { validateSkill } from '../../src/skills/validator.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/taal-test-skills-validator';

describe('validateSkill', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
  
  it('should validate skill with valid frontmatter', () => {
    const skillDir = join(TEST_DIR, 'valid-skill');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill
description: A test skill
---

# Test Skill

This is a test skill.
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(true);
    expect(result.name).toBe('Test Skill');
    expect(result.error).toBeUndefined();
  });
  
  it('should fail if SKILL.md does not exist', () => {
    const skillDir = join(TEST_DIR, 'no-skill-md');
    mkdirSync(skillDir);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('SKILL.md not found');
  });
  
  it('should fail if SKILL.md does not start with frontmatter', () => {
    const skillDir = join(TEST_DIR, 'no-frontmatter');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `# Test Skill

This skill has no frontmatter.
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must start with YAML frontmatter');
  });
  
  it('should fail if frontmatter is not properly closed', () => {
    const skillDir = join(TEST_DIR, 'unclosed-frontmatter');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not properly closed');
  });
  
  it('should fail if frontmatter has invalid YAML', () => {
    const skillDir = join(TEST_DIR, 'invalid-yaml');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill
invalid: yaml: syntax: here
---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid YAML frontmatter');
  });
  
  it('should fail if frontmatter is not an object', () => {
    const skillDir = join(TEST_DIR, 'frontmatter-not-object');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
just a string
---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a YAML object');
  });
  
  it('should fail if name field is missing', () => {
    const skillDir = join(TEST_DIR, 'no-name');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
description: A skill without a name
---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must contain a "name" field');
  });
  
  it('should fail if name field is not a string', () => {
    const skillDir = join(TEST_DIR, 'name-not-string');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: 123
---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must contain a "name" field (string)');
  });
  
  it('should accept frontmatter with additional fields', () => {
    const skillDir = join(TEST_DIR, 'extra-fields');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill
description: A test skill
version: 1.0.0
author: Test Author
tags:
  - test
  - example
---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(true);
    expect(result.name).toBe('Test Skill');
  });
  
  it('should handle empty frontmatter object', () => {
    const skillDir = join(TEST_DIR, 'empty-frontmatter');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---

---

# Test Skill
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a YAML object');
  });
  
  it('should handle skill with content after frontmatter', () => {
    const skillDir = join(TEST_DIR, 'with-content');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill
---

# Test Skill

## Description

This is a detailed description of the skill.

## Usage

\`\`\`bash
taal sync
\`\`\`

## Examples

- Example 1
- Example 2
`);
    
    const result = validateSkill(skillDir);
    
    expect(result.valid).toBe(true);
    expect(result.name).toBe('Test Skill');
  });
});
