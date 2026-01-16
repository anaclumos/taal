import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { validateSkill } from "./validator.js";

/**
 * Represents a discovered skill
 */
export interface Skill {
  name: string;
  path: string;
  skillMdPath: string;
}

/**
 * Discover all valid skills from given paths
 *
 * @param paths - Array of paths to search for skills
 * @returns Array of discovered skills
 */
export function discoverSkills(paths: string[]): Skill[] {
  const skills: Skill[] = [];

  for (const basePath of paths) {
    if (!existsSync(basePath)) {
      console.warn(`Skills path does not exist: ${basePath}`);
      continue;
    }

    try {
      const entries = readdirSync(basePath);

      for (const entry of entries) {
        const skillPath = join(basePath, entry);

        // Skip if not a directory
        try {
          const stat = statSync(skillPath);
          if (!stat.isDirectory()) {
            continue;
          }
        } catch {
          continue;
        }

        // Check if SKILL.md exists
        const skillMdPath = join(skillPath, "SKILL.md");
        if (!existsSync(skillMdPath)) {
          continue;
        }

        // Validate skill
        const validation = validateSkill(skillPath);
        if (!validation.valid) {
          console.warn(`Invalid skill at ${skillPath}: ${validation.error}`);
          continue;
        }

        skills.push({
          name: validation.name!,
          path: skillPath,
          skillMdPath,
        });
      }
    } catch (error) {
      console.warn(`Failed to read skills directory ${basePath}: ${error}`);
    }
  }

  return skills;
}
