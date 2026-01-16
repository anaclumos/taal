import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
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
 * Expand ~ to home directory in a path
 */
function expandPath(path: string, home: string): string {
  if (path.startsWith("~/")) {
    return join(home, path.slice(2));
  }
  if (path === "~") {
    return home;
  }
  return path;
}

/**
 * Discover all valid skills from given paths
 *
 * @param paths - Array of paths to search for skills
 * @param baseDir - Optional base directory for ~ expansion (defaults to homedir())
 * @returns Array of discovered skills
 */
export function discoverSkills(paths: string[], baseDir?: string): Skill[] {
  const skills: Skill[] = [];
  const home = baseDir || homedir();

  for (const rawPath of paths) {
    const basePath = expandPath(rawPath, home);
    if (!existsSync(basePath)) {
      console.warn(`Skills path does not exist: ${basePath}`);
      continue;
    }

    try {
      const entries = readdirSync(basePath).sort();

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
