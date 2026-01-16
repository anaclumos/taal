import { exists, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { substituteEnvVars } from "../config/env.js";
import { TaalConfigSchema } from "../config/schema.js";
import { registry } from "../providers/registry.js";

import "../providers/claude-desktop.js";
import "../providers/claude-code.js";
import "../providers/cursor.js";
import "../providers/continue.js";
import "../providers/zed.js";
import "../providers/opencode.js";
import "../providers/codex.js";
import "../providers/windsurf.js";
import "../providers/antigravity.js";

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
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  if (!(await exists(configPath))) {
    return {
      hasChanges: false,
      changes: [],
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
        hasChanges: false,
        changes: [],
        error: "Invalid config",
      };
    }

    const config = result.data;
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
            const currentValue = JSON.stringify(currentServers[key]);
            const newValue = JSON.stringify(
              (transformedServers as Record<string, unknown>)[key]
            );

            if (currentValue !== newValue) {
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
