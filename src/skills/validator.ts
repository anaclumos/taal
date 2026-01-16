import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Validation result for a skill
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  name?: string;
}

/**
 * Validate a skill directory
 * Checks that SKILL.md exists and has valid YAML frontmatter with 'name' field
 *
 * @param skillPath - Path to the skill directory
 * @returns Validation result
 */
export function validateSkill(skillPath: string): ValidationResult {
  const skillMdPath = join(skillPath, "SKILL.md");

  // Check if SKILL.md exists
  if (!existsSync(skillMdPath)) {
    return {
      valid: false,
      error: "SKILL.md not found",
    };
  }

  // Read file content
  let content: string;
  try {
    content = readFileSync(skillMdPath, "utf-8");
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read SKILL.md: ${error}`,
    };
  }

  // Check for YAML frontmatter
  if (!content.startsWith("---\n")) {
    return {
      valid: false,
      error: "SKILL.md must start with YAML frontmatter (---)",
    };
  }

  // Extract frontmatter
  const frontmatterEnd = content.indexOf("\n---\n", 4);
  if (frontmatterEnd === -1) {
    return {
      valid: false,
      error: "SKILL.md frontmatter not properly closed (missing closing ---)",
    };
  }

  const frontmatterContent = content.substring(4, frontmatterEnd);

  // Parse YAML frontmatter
  let frontmatter: any;
  try {
    frontmatter = parseYaml(frontmatterContent);
  } catch (error) {
    return {
      valid: false,
      error: `Invalid YAML frontmatter: ${error}`,
    };
  }

  // Check for required 'name' field
  if (!frontmatter || typeof frontmatter !== "object") {
    return {
      valid: false,
      error: "Frontmatter must be a YAML object",
    };
  }

  if (!frontmatter.name || typeof frontmatter.name !== "string") {
    return {
      valid: false,
      error: 'Frontmatter must contain a "name" field (string)',
    };
  }

  return {
    valid: true,
    name: frontmatter.name,
  };
}
