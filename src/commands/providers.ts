import { homedir } from "node:os";
import { loadTaalConfig } from "../config/loader.js";
import { initializeProviders, registry } from "../providers/index.js";

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
  initializeProviders();
  const home = baseDir || homedir();

  const result = await loadTaalConfig(baseDir);
  const enabledProviders = result.config?.providers?.enabled || [];

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
