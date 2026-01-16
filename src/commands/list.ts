import { homedir } from "node:os";
import { compact } from "es-toolkit/array";
import { isError } from "es-toolkit/predicate";
import { loadTaalConfig } from "../config/loader.js";
import { discoverSkills } from "../skills/discovery.js";

export interface ServerInfo {
  name: string;
  type: "stdio" | "http";
  command?: string;
  url?: string;
}

export interface SkillInfo {
  name: string;
  path: string;
}

export interface ListResult {
  servers: ServerInfo[];
  skills: SkillInfo[];
  enabledProviders: string[];
  error?: string;
}

export async function list(baseDir?: string): Promise<ListResult> {
  const home = baseDir || homedir();
  const result = await loadTaalConfig(baseDir);

  if (!result.config) {
    return {
      servers: [],
      skills: [],
      enabledProviders: [],
      error: result.errors[0] || "Config file not found",
    };
  }

  const config = result.config;

  try {
    const servers = compact(
      Object.entries(config.mcp || {}).map(([name, server]) => {
        if (server.url) {
          return { name, type: "http" as const, url: server.url };
        }
        if (server.command) {
          return { name, type: "stdio" as const, command: server.command };
        }
        return undefined;
      })
    );

    const skillPaths = config.skills?.paths || [];
    const discoveredSkills = await discoverSkills(skillPaths, home);

    const skills: SkillInfo[] = discoveredSkills.map((skill) => ({
      name: skill.name,
      path: skill.path,
    }));

    const enabledProviders = config.providers?.enabled || [];

    return {
      servers,
      skills,
      enabledProviders,
    };
  } catch (error) {
    return {
      servers: [],
      skills: [],
      enabledProviders: [],
      error: isError(error) ? error.message : String(error),
    };
  }
}
