import { exists, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { substituteEnvVars } from "../config/env.js";
import { TaalConfigSchema } from "../config/schema.js";
import { registry } from "../providers/registry.js";
import { copySkillsToProvider } from "../skills/copy.js";
import { discoverSkills } from "../skills/discovery.js";
import { backupConfig } from "../utils/backup.js";

import "../providers/claude-desktop.js";
import "../providers/claude-code.js";
import "../providers/cursor.js";
import "../providers/continue.js";
import "../providers/zed.js";
import "../providers/opencode.js";
import "../providers/codex.js";
import "../providers/windsurf.js";
import "../providers/antigravity.js";

export interface SyncResult {
  success: boolean;
  synced: string[];
  failed: Array<{ provider: string; error: string }>;
  error?: string;
}

export async function sync(
  baseDir?: string,
  providerName?: string
): Promise<SyncResult> {
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  if (!(await exists(configPath))) {
    return {
      success: false,
      synced: [],
      failed: [],
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
        success: false,
        synced: [],
        failed: [],
        error: "Invalid config",
      };
    }

    const config = result.data;
    const synced: string[] = [];
    const failed: Array<{ provider: string; error: string }> = [];

    const providers = providerName
      ? [registry.get(providerName)].filter(Boolean)
      : registry.getAll();

    const enabledProviders = config.providers?.enabled || [];

    for (const provider of providers) {
      if (!provider) {
        continue;
      }

      if (!enabledProviders.includes(provider.name)) {
        continue;
      }

      try {
        const isInstalled = await provider.isInstalled(home);
        if (!isInstalled) {
          continue;
        }

        const currentConfig = await provider.readConfig(home);

        await backupConfig(
          typeof provider.configPath === "function"
            ? provider.configPath(home)
            : provider.configPath,
          home
        );

        const taalServers = config.mcp || {};
        const transformedServers = provider.transformMcpServers(taalServers);

        const newConfig = {
          ...(currentConfig as object),
          [provider.mcpKey]: transformedServers,
        };

        await provider.writeConfig(newConfig, home);

        if (provider.skillsPath && config.skills?.paths) {
          const allSkills = await discoverSkills(config.skills.paths, home);
          const skillsPath =
            typeof provider.skillsPath === "function"
              ? provider.skillsPath(home)
              : provider.skillsPath;

          await copySkillsToProvider(allSkills, skillsPath);
        }

        synced.push(provider.name);
      } catch (error) {
        failed.push({
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: failed.length === 0,
      synced,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      synced: [],
      failed: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
