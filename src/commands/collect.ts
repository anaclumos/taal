import { existsSync } from "node:fs";
import { exists, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isEqual, isPlainObject, isString, uniqWith } from "es-toolkit";
import YAML from "yaml";
import type { McpServer } from "../config/schema.js";
import { initializeProviders, registry } from "../providers/index.js";
import { copySkillsToProvider } from "../skills/copy.js";
import { discoverSkills } from "../skills/discovery.js";

export interface CollectConflict {
  serverName: string;
  providers: string[];
  configs: unknown[];
}

export interface CollectResult {
  servers: Record<string, McpServer>;
  conflicts: CollectConflict[];
  skillsCollected: number;
  summary: {
    totalServers: number;
    providersScanned: number;
    providersWithConfigs: number;
  };
}

export interface CollectAndUpdateConfigResult extends CollectResult {
  configPath: string;
}

/**
 * Collect MCP server configs from all installed providers
 */
export async function collect(baseDir?: string): Promise<CollectResult> {
  initializeProviders();
  const home = baseDir || homedir();
  const servers: Record<string, McpServer> = {};
  const conflicts: CollectConflict[] = [];
  const serverSources = new Map<
    string,
    { provider: string; config: unknown }[]
  >();

  let providersScanned = 0;
  let providersWithConfigs = 0;

  const allProviders = registry.getAll();

  for (const provider of allProviders) {
    providersScanned++;

    try {
      // Check if provider is installed
      const isInstalled = await provider.isInstalled(home);
      if (!isInstalled) {
        continue;
      }

      // Read provider config
      const config = await provider.readConfig(home);
      if (!config || typeof config !== "object") {
        continue;
      }

      // Extract MCP servers from config
      const mcpServers = (config as Record<string, unknown>)[provider.mcpKey];
      if (!mcpServers || typeof mcpServers !== "object") {
        continue;
      }

      providersWithConfigs++;

      // Process each server
      for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
        // Track source for conflict detection
        if (!serverSources.has(serverName)) {
          serverSources.set(serverName, []);
        }
        serverSources.get(serverName)?.push({
          provider: provider.name,
          config: serverConfig,
        });

        // Convert to TAAL format
        const taalServer = convertToTaalFormat(serverConfig);
        if (taalServer) {
          servers[serverName] = taalServer;
        }
      }
    } catch (error) {
      // Skip providers that fail to read
      console.warn(
        `Warning: Failed to read config from ${provider.name}:`,
        error
      );
    }
  }

  // Detect conflicts
  for (const [serverName, sources] of serverSources.entries()) {
    if (sources.length > 1) {
      // Check if configs are actually different
      const uniqueConfigs = uniqWith(
        sources.map((s) => s.config),
        isEqual
      );

      if (uniqueConfigs.length > 1) {
        conflicts.push({
          serverName,
          providers: sources.map((s) => s.provider),
          configs: sources.map((s) => s.config),
        });
      }
    }
  }

  // Collect skills from providers
  const taalSkillsDir = join(home, ".taal", "skills");
  let skillsCollected = 0;

  for (const provider of allProviders) {
    if (!provider.skillsPath) {
      continue;
    }

    try {
      const isInstalled = await provider.isInstalled(home);
      if (!isInstalled) {
        continue;
      }

      const skillsPath =
        typeof provider.skillsPath === "function"
          ? provider.skillsPath(home)
          : provider.skillsPath;

      if (existsSync(skillsPath)) {
        const providerSkills = discoverSkills([skillsPath], home);
        if (providerSkills.length > 0) {
          await copySkillsToProvider(providerSkills, taalSkillsDir);
          skillsCollected += providerSkills.length;
        }
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to collect skills from ${provider.name}:`,
        error
      );
    }
  }

  return {
    servers,
    conflicts,
    skillsCollected,
    summary: {
      totalServers: Object.keys(servers).length,
      providersScanned,
      providersWithConfigs,
    },
  };
}

export async function collectAndUpdateConfig(
  baseDir?: string
): Promise<CollectAndUpdateConfigResult> {
  const result = await collect(baseDir);
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  interface TaalConfigFile {
    version: string;
    mcp: Record<string, unknown>;
    skills?: { paths: string[] };
    providers?: { enabled: string[] };
  }

  let existingConfig: TaalConfigFile = {
    version: "1",
    mcp: {
      taal: {
        command: "bunx",
        args: ["--bun", "taal-mcp"],
      },
    },
    skills: { paths: ["~/.taal/skills"] },
    providers: { enabled: [] },
  };

  if (await exists(configPath)) {
    const content = await readFile(configPath, "utf-8");
    existingConfig = YAML.parse(content) as TaalConfigFile;
  }

  existingConfig.mcp = { ...existingConfig.mcp, ...result.servers };

  await writeFile(configPath, YAML.stringify(existingConfig), "utf-8");

  return {
    ...result,
    configPath,
  };
}

/**
 * Convert provider-specific server config to TAAL format
 */
function convertToTaalFormat(config: unknown): McpServer | null {
  if (!isPlainObject(config)) {
    return null;
  }

  const obj = config as Record<string, unknown>;

  // HTTP server
  if (obj.url && isString(obj.url)) {
    return {
      url: obj.url,
      headers:
        (obj.headers as Record<string, string>) ||
        (obj.http_headers as Record<string, string>),
    };
  }

  // Stdio server
  if (obj.command && isString(obj.command)) {
    const server: McpServer = {
      command: obj.command,
    };

    if (Array.isArray(obj.args)) {
      server.args = obj.args as string[];
    }

    if (obj.env && isPlainObject(obj.env)) {
      server.env = obj.env as Record<string, string>;
    } else if (obj.environment && isPlainObject(obj.environment)) {
      server.env = obj.environment as Record<string, string>;
    }

    return server;
  }

  // OpenCode format with command array
  if (Array.isArray(obj.command) && obj.command.length > 0) {
    const [cmd, ...args] = obj.command as string[];
    const server: McpServer = {
      command: cmd,
      args,
    };

    if (obj.environment && isPlainObject(obj.environment)) {
      server.env = obj.environment as Record<string, string>;
    }

    return server;
  }

  return null;
}
