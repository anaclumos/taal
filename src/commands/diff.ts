import { homedir } from "node:os";
import { isEqual } from "es-toolkit";
import { loadTaalConfig } from "../config/loader.js";
import { initializeProviders, registry } from "../providers/index.js";

export interface DiffChange {
  type: "add" | "remove" | "modify";
  serverName: string;
  provider: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffResult {
  hasChanges: boolean;
  changes: DiffChange[];
  provider?: string;
  error?: string;
}

export async function diff(
  baseDir?: string,
  providerName?: string
): Promise<DiffResult> {
  initializeProviders();
  const home = baseDir || homedir();

  const result = await loadTaalConfig(baseDir);

  if (!result.config) {
    return {
      hasChanges: false,
      changes: [],
      error: result.errors[0] || "Config file not found",
    };
  }

  const config = result.config;

  try {
    const changes: DiffChange[] = [];

    const providers = providerName
      ? [registry.get(providerName)].filter(Boolean)
      : registry.getAll();

    for (const provider of providers) {
      if (!provider) {
        continue;
      }

      const isInstalled = await provider.isInstalled(home);
      if (!isInstalled) {
        continue;
      }

      const enabledProviders = config.providers?.enabled || [];
      if (!enabledProviders.includes(provider.name)) {
        continue;
      }

      try {
        const currentConfig = await provider.readConfig(home);
        const currentServers: Record<string, unknown> =
          ((currentConfig as Record<string, unknown>)?.[
            provider.mcpKey
          ] as Record<string, unknown>) || {};

        const taalServers = config.mcp || {};
        const transformedServers = provider.transformMcpServers(taalServers);

        const currentKeys = new Set(Object.keys(currentServers));
        const taalKeys = new Set(Object.keys(transformedServers as object));

        for (const key of taalKeys) {
          if (currentKeys.has(key)) {
            const currentValue = currentServers[key];
            const newValue = (transformedServers as Record<string, unknown>)[
              key
            ];

            if (!isEqual(currentValue, newValue)) {
              changes.push({
                type: "modify",
                serverName: key,
                provider: provider.name,
                oldValue: currentServers[key],
                newValue: (transformedServers as Record<string, unknown>)[key],
              });
            }
          } else {
            changes.push({
              type: "add",
              serverName: key,
              provider: provider.name,
              newValue: (transformedServers as Record<string, unknown>)[key],
            });
          }
        }

        for (const key of currentKeys) {
          if (!taalKeys.has(key)) {
            changes.push({
              type: "remove",
              serverName: key,
              provider: provider.name,
              oldValue: currentServers[key],
            });
          }
        }
      } catch (_error) {
        // Ignore provider read errors - continue with other providers
      }
    }

    return {
      hasChanges: changes.length > 0,
      changes,
      provider: providerName,
    };
  } catch (error) {
    return {
      hasChanges: false,
      changes: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
