import { homedir } from "node:os";
import { isError } from "es-toolkit/predicate";
import { loadTaalConfig } from "../config/loader.js";
import { initializeProviders, registry } from "../providers/index.js";
import { copySkillsToProvider } from "../skills/copy.js";
import { discoverSkills } from "../skills/discovery.js";
import { backupConfig } from "../utils/backup.js";

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
  initializeProviders();
  const home = baseDir || homedir();

  const result = await loadTaalConfig(baseDir);

  if (!result.config) {
    return {
      success: false,
      synced: [],
      failed: [],
      error: result.errors[0] || "Config file not found",
    };
  }

  const config = result.config;

  try {
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
          error: isError(error) ? error.message : String(error),
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
      error: isError(error) ? error.message : String(error),
    };
  }
}
