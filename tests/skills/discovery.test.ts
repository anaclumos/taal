import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { discoverSkills } from '../../src/skills/discovery.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/taal-test-skills-discovery';

describe('discoverSkills', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
  
  it('should discover valid skills', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    const skill1Dir = join(skillsDir, 'skill-1');
    mkdirSync(skill1Dir);
    writeFileSync(join(skill1Dir, 'SKILL.md'), `---
name: Test Skill 1
---

# Test Skill 1
`);
    
    const skill2Dir = join(skillsDir, 'skill-2');
    mkdirSync(skill2Dir);
    writeFileSync(join(skill2Dir, 'SKILL.md'), `---
name: Test Skill 2
description: A test skill
---

# Test Skill 2
`);
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe('Test Skill 1');
    expect(skills[1].name).toBe('Test Skill 2');
  });
  
  it('should skip directories without SKILL.md', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    const validSkillDir = join(skillsDir, 'valid-skill');
    mkdirSync(validSkillDir);
    writeFileSync(join(validSkillDir, 'SKILL.md'), `---
name: Valid Skill
---

# Valid Skill
`);
    
    const invalidSkillDir = join(skillsDir, 'invalid-skill');
    mkdirSync(invalidSkillDir);
    writeFileSync(join(invalidSkillDir, 'README.md'), 'No SKILL.md here');
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Valid Skill');
  });
  
  it('should skip files in skills directory', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    writeFileSync(join(skillsDir, 'README.md'), 'This is a file, not a skill');
    
    const validSkillDir = join(skillsDir, 'valid-skill');
    mkdirSync(validSkillDir);
    writeFileSync(join(validSkillDir, 'SKILL.md'), `---
name: Valid Skill
---

# Valid Skill
`);
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Valid Skill');
  });
  
  it('should skip skills with invalid frontmatter', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    const validSkillDir = join(skillsDir, 'valid-skill');
    mkdirSync(validSkillDir);
    writeFileSync(join(validSkillDir, 'SKILL.md'), `---
name: Valid Skill
---

# Valid Skill
`);
    
    const invalidSkillDir = join(skillsDir, 'invalid-skill');
    mkdirSync(invalidSkillDir);
    writeFileSync(join(invalidSkillDir, 'SKILL.md'), `---
description: Missing name field
---

# Invalid Skill
`);
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Valid Skill');
  });
  
  it('should handle multiple skill paths', () => {
    const skillsDir1 = join(TEST_DIR, 'skills1');
    mkdirSync(skillsDir1, { recursive: true });
    
    const skill1Dir = join(skillsDir1, 'skill-1');
    mkdirSync(skill1Dir);
    writeFileSync(join(skill1Dir, 'SKILL.md'), `---
name: Skill 1
---

# Skill 1
`);
    
    const skillsDir2 = join(TEST_DIR, 'skills2');
    mkdirSync(skillsDir2, { recursive: true });
    
    const skill2Dir = join(skillsDir2, 'skill-2');
    mkdirSync(skill2Dir);
    writeFileSync(join(skill2Dir, 'SKILL.md'), `---
name: Skill 2
---

# Skill 2
`);
    
    const skills = discoverSkills([skillsDir1, skillsDir2]);
    
    expect(skills).toHaveLength(2);
    expect(skills.map(s => s.name).sort()).toEqual(['Skill 1', 'Skill 2']);
  });
  
  it('should handle non-existent paths gracefully', () => {
    const nonExistentPath = join(TEST_DIR, 'does-not-exist');
    
    const skills = discoverSkills([nonExistentPath]);
    
    expect(skills).toHaveLength(0);
  });
  
  it('should return empty array for empty paths array', () => {
    const skills = discoverSkills([]);
    
    expect(skills).toHaveLength(0);
  });
  
  it('should include skill path and skillMdPath', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    const skillDir = join(skillsDir, 'test-skill');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Test Skill
---

# Test Skill
`);
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].path).toBe(skillDir);
    expect(skills[0].skillMdPath).toBe(join(skillDir, 'SKILL.md'));
  });
  
  it('should discover skills with additional files and directories', () => {
    const skillsDir = join(TEST_DIR, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    
    const skillDir = join(skillsDir, 'complex-skill');
    mkdirSync(skillDir);
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: Complex Skill
---

# Complex Skill
`);
    
    mkdirSync(join(skillDir, 'scripts'));
    writeFileSync(join(skillDir, 'scripts', 'helper.sh'), '#!/bin/bash\necho "helper"');
    
    mkdirSync(join(skillDir, 'references'));
    writeFileSync(join(skillDir, 'references', 'doc.md'), '# Documentation');
    
    const skills = discoverSkills([skillsDir]);
    
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('Complex Skill');
  });
});
