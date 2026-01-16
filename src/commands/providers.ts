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

export interface ProviderInfo {
  name: string;
  configPath: string;
  format: string;
  installed: boolean;
  enabled: boolean;
}

export interface ProvidersResult {
  providers: ProviderInfo[];
}

export async function providers(baseDir?: string): Promise<ProvidersResult> {
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  let enabledProviders: string[] = [];

  if (await exists(configPath)) {
    try {
      const content = await readFile(configPath, "utf-8");
      const rawConfig = parse(content);
      const configWithEnv = substituteEnvVars(rawConfig);
      const result = TaalConfigSchema.safeParse(configWithEnv);

      if (result.success) {
        enabledProviders = result.data.providers?.enabled || [];
      }
    } catch (_error) {
      // Continue with empty enabled list
    }
  }

  const allProviders = registry.getAll();
  const providerInfos: ProviderInfo[] = [];

  for (const provider of allProviders) {
    const installed = await provider.isInstalled(home);
    const configPathResolved =
      typeof provider.configPath === "function"
        ? provider.configPath(home)
        : provider.configPath;

    providerInfos.push({
      name: provider.name,
      configPath: configPathResolved,
      format: provider.format,
      installed,
      enabled: enabledProviders.includes(provider.name),
    });
  }

  return {
    providers: providerInfos,
  };
}
