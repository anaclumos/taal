import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";
import type { Skill } from "./discovery.js";

/**
 * Copy skills to a provider's skills directory
 *
 * @param skills - Array of skills to copy
 * @param targetPath - Target directory path (provider's skills directory)
 * @param options - Copy options
 */
export function copySkillsToProvider(
  skills: Skill[],
  targetPath: string,
  options: { overwrite?: boolean } = {}
): void {
  const { overwrite = true } = options;

  // Create target directory if it doesn't exist
  mkdirSync(targetPath, { recursive: true });

  for (const skill of skills) {
    const skillDirName = basename(skill.path);
    const targetSkillPath = join(targetPath, skillDirName);

    try {
      // Remove existing skill if overwrite is enabled
      if (overwrite && existsSync(targetSkillPath)) {
        rmSync(targetSkillPath, { recursive: true, force: true });
      }

      // Copy skill directory recursively
      cpSync(skill.path, targetSkillPath, {
        recursive: true,
        force: overwrite,
      });

      console.log(`Copied skill "${skill.name}" to ${targetSkillPath}`);
    } catch (error) {
      console.warn(`Failed to copy skill "${skill.name}": ${error}`);
    }
  }
}

/**
 * Copy a single skill to a target directory
 *
 * @param skill - Skill to copy
 * @param targetPath - Target directory path
 * @param options - Copy options
 */
export function copySkill(
  skill: Skill,
  targetPath: string,
  options: { overwrite?: boolean } = {}
): void {
  copySkillsToProvider([skill], targetPath, options);
}
