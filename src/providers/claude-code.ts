import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";
import { readConfig, writeConfig as writeConfigUtil } from "./utils.js";

export class ClaudeCodeProvider extends BaseProvider {
  name = "claude-code";
  configPath = (home: string) => join(home, ".claude", "settings.json");
  format = "json" as const;
  mcpKey = "mcpServers";
  skillsPath = (home: string) => join(home, ".claude", "skills");

  private readonly cliConfigPath = (home: string) => join(home, ".claude.json");
  private transformedServersCache: Record<string, unknown> = {};

  transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          type: "http",
          url: server.url,
          ...(server.headers && { headers: server.headers }),
        };
      } else if (server.command) {
        transformed[name] = {
          type: "stdio",
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: server.env }),
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }

    this.transformedServersCache = transformed;
    return transformed;
  }

  transformConfig(
    config: Record<string, unknown>,
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const serverNames = Object.keys(servers);
    const existingEnabled = Array.isArray(config.enabledMcpjsonServers)
      ? (config.enabledMcpjsonServers as string[])
      : [];

    const mergedEnabled = [...new Set([...existingEnabled, ...serverNames])];

    return {
      ...config,
      enabledMcpjsonServers: mergedEnabled,
    };
  }

  async writeConfig(config: unknown, home?: string): Promise<void> {
    await super.writeConfig(config, home);

    const homeDir = home || (await import("node:os")).homedir();
    const cliPath = this.cliConfigPath(homeDir);
    const cliConfig = (await readConfig(cliPath, "json")) as Record<
      string,
      unknown
    >;

    const existingCliServers =
      (cliConfig.mcpServers as Record<string, unknown>) || {};
    const mergedCliServers = {
      ...existingCliServers,
      ...this.transformedServersCache,
    };

    const newCliConfig = {
      ...cliConfig,
      mcpServers: mergedCliServers,
    };

    writeConfigUtil(cliPath, "json", newCliConfig);
  }
}
