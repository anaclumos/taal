import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { copySkill, copySkillsToProvider } from "../../src/skills/copy.js";
import type { Skill } from "../../src/skills/discovery.js";

const TEST_DIR = "/tmp/taal-test-skills-copy";

describe("copySkillsToProvider", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should copy skills to target directory", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skill1Dir = join(sourceDir, "skill-1");
    mkdirSync(skill1Dir);
    writeFileSync(
      join(skill1Dir, "SKILL.md"),
      `---
name: Skill 1
---

# Skill 1
`
    );

    const skill2Dir = join(sourceDir, "skill-2");
    mkdirSync(skill2Dir);
    writeFileSync(
      join(skill2Dir, "SKILL.md"),
      `---
name: Skill 2
---

# Skill 2
`
    );

    const skills: Skill[] = [
      {
        name: "Skill 1",
        path: skill1Dir,
        skillMdPath: join(skill1Dir, "SKILL.md"),
      },
      {
        name: "Skill 2",
        path: skill2Dir,
        skillMdPath: join(skill2Dir, "SKILL.md"),
      },
    ];

    const targetDir = join(TEST_DIR, "target");

    copySkillsToProvider(skills, targetDir);

    expect(existsSync(join(targetDir, "skill-1", "SKILL.md"))).toBe(true);
    expect(existsSync(join(targetDir, "skill-2", "SKILL.md"))).toBe(true);
  });

  it("should create target directory if it does not exist", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "test-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: Test Skill
---

# Test Skill
`
    );

    const skills: Skill[] = [
      {
        name: "Test Skill",
        path: skillDir,
        skillMdPath: join(skillDir, "SKILL.md"),
      },
    ];

    const targetDir = join(TEST_DIR, "nested", "target", "dir");

    copySkillsToProvider(skills, targetDir);

    expect(existsSync(targetDir)).toBe(true);
    expect(existsSync(join(targetDir, "test-skill", "SKILL.md"))).toBe(true);
  });

  it("should copy skill with additional files and directories", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "complex-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: Complex Skill
---

# Complex Skill
`
    );

    mkdirSync(join(skillDir, "scripts"));
    writeFileSync(
      join(skillDir, "scripts", "helper.sh"),
      '#!/bin/bash\necho "helper"'
    );

    mkdirSync(join(skillDir, "references"));
    writeFileSync(join(skillDir, "references", "doc.md"), "# Documentation");

    const skills: Skill[] = [
      {
        name: "Complex Skill",
        path: skillDir,
        skillMdPath: join(skillDir, "SKILL.md"),
      },
    ];

    const targetDir = join(TEST_DIR, "target");

    copySkillsToProvider(skills, targetDir);

    expect(existsSync(join(targetDir, "complex-skill", "SKILL.md"))).toBe(true);
    expect(
      existsSync(join(targetDir, "complex-skill", "scripts", "helper.sh"))
    ).toBe(true);
    expect(
      existsSync(join(targetDir, "complex-skill", "references", "doc.md"))
    ).toBe(true);
  });

  it("should overwrite existing skills by default", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "test-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: Test Skill
---

# New Version
`
    );

    const targetDir = join(TEST_DIR, "target");
    mkdirSync(targetDir, { recursive: true });

    const existingSkillDir = join(targetDir, "test-skill");
    mkdirSync(existingSkillDir);
    writeFileSync(
      join(existingSkillDir, "SKILL.md"),
      `---
name: Test Skill
---

# Old Version
`
    );

    const skills: Skill[] = [
      {
        name: "Test Skill",
        path: skillDir,
        skillMdPath: join(skillDir, "SKILL.md"),
      },
    ];

    copySkillsToProvider(skills, targetDir);

    const content = readFileSync(
      join(targetDir, "test-skill", "SKILL.md"),
      "utf-8"
    );
    expect(content).toContain("New Version");
    expect(content).not.toContain("Old Version");
  });

  it("should respect overwrite option when set to false", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "test-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: Test Skill
---

# New Version
`
    );

    const targetDir = join(TEST_DIR, "target");
    mkdirSync(targetDir, { recursive: true });

    const existingSkillDir = join(targetDir, "test-skill");
    mkdirSync(existingSkillDir);
    writeFileSync(
      join(existingSkillDir, "SKILL.md"),
      `---
name: Test Skill
---

# Old Version
`
    );

    const skills: Skill[] = [
      {
        name: "Test Skill",
        path: skillDir,
        skillMdPath: join(skillDir, "SKILL.md"),
      },
    ];

    copySkillsToProvider(skills, targetDir, { overwrite: false });

    const content = readFileSync(
      join(targetDir, "test-skill", "SKILL.md"),
      "utf-8"
    );
    expect(content).toContain("Old Version");
  });

  it("should handle empty skills array", () => {
    const targetDir = join(TEST_DIR, "target");

    copySkillsToProvider([], targetDir);

    expect(existsSync(targetDir)).toBe(true);
    const files = readdirSync(targetDir);
    expect(files).toHaveLength(0);
  });

  it("should preserve file content exactly", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "test-skill");
    mkdirSync(skillDir);

    const originalContent = `---
name: Test Skill
version: 1.0.0
---

# Test Skill

This is a test skill with **markdown** formatting.

\`\`\`bash
echo "test"
\`\`\`
`;
    writeFileSync(join(skillDir, "SKILL.md"), originalContent);

    const skills: Skill[] = [
      {
        name: "Test Skill",
        path: skillDir,
        skillMdPath: join(skillDir, "SKILL.md"),
      },
    ];

    const targetDir = join(TEST_DIR, "target");

    copySkillsToProvider(skills, targetDir);

    const copiedContent = readFileSync(
      join(targetDir, "test-skill", "SKILL.md"),
      "utf-8"
    );
    expect(copiedContent).toBe(originalContent);
  });
});

describe("copySkill", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should copy a single skill", () => {
    const sourceDir = join(TEST_DIR, "source");
    mkdirSync(sourceDir, { recursive: true });

    const skillDir = join(sourceDir, "test-skill");
    mkdirSync(skillDir);
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---
name: Test Skill
---

# Test Skill
`
    );

    const skill: Skill = {
      name: "Test Skill",
      path: skillDir,
      skillMdPath: join(skillDir, "SKILL.md"),
    };

    const targetDir = join(TEST_DIR, "target");

    copySkill(skill, targetDir);

    expect(existsSync(join(targetDir, "test-skill", "SKILL.md"))).toBe(true);
  });
});
