import { exists, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { substituteEnvVars } from "../config/env.js";
import { TaalConfigSchema } from "../config/schema.js";
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
  const configPath = join(home, ".taal", "config.yaml");

  if (!(await exists(configPath))) {
    return {
      servers: [],
      skills: [],
      enabledProviders: [],
      error: "Config file not found",
    };
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig = parse(content);
    const configWithEnv = substituteEnvVars(rawConfig);
    const result = TaalConfigSchema.safeParse(configWithEnv);

    if (!result.success) {
      return {
        servers: [],
        skills: [],
        enabledProviders: [],
        error: "Invalid config",
      };
    }

    const config = result.data;

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
