import { homedir } from "node:os";
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
    const servers: ServerInfo[] = [];
    for (const [name, server] of Object.entries(config.mcp || {})) {
      if (server.url) {
        servers.push({
          name,
          type: "http",
          url: server.url,
        });
      } else if (server.command) {
        servers.push({
          name,
          type: "stdio",
          command: server.command,
        });
      }
    }

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
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
