import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";
import {
  readConfig as readConfigUtil,
  writeConfig as writeConfigUtil,
} from "./utils.js";

export class ClaudeCodeProvider extends BaseProvider {
  name = "claude-code";
  configPath = (home: string) => join(home, ".claude", "settings.json");
  secondaryConfigPath = (home: string) => join(home, ".claude.json");
  format = "json" as const;
  mcpKey = "mcpServers";
  skillsPath = (home: string) => join(home, ".claude", "skills");

  override async isInstalled(home?: string): Promise<boolean> {
    const homeDir = home || homedir();
    const secondaryPath = this.secondaryConfigPath(homeDir);
    return existsSync(join(homeDir, ".claude")) || existsSync(secondaryPath);
  }

  override async readConfig(home?: string): Promise<unknown> {
    const homeDir = home || homedir();
    const primaryPath = this.configPath(homeDir);
    const secondaryPath = this.secondaryConfigPath(homeDir);

    const primaryConfig = readConfigUtil(primaryPath, this.format) as Record<
      string,
      unknown
    >;
    const secondaryConfig = readConfigUtil(
      secondaryPath,
      this.format
    ) as Record<string, unknown>;

    const primaryServers = (primaryConfig.mcpServers || {}) as Record<
      string,
      unknown
    >;
    const secondaryServers = (secondaryConfig.mcpServers || {}) as Record<
      string,
      unknown
    >;

    return {
      ...primaryConfig,
      mcpServers: {
        ...secondaryServers,
        ...primaryServers,
      },
    };
  }

  override async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const primaryPath = this.configPath(homeDir);
    const secondaryPath = this.secondaryConfigPath(homeDir);

    const configObj = config as Record<string, unknown>;

    writeConfigUtil(primaryPath, this.format, configObj);

    const existingSecondary = readConfigUtil(
      secondaryPath,
      this.format
    ) as Record<string, unknown>;

    const secondaryConfig = {
      ...existingSecondary,
      mcpServers: configObj.mcpServers,
    };
    writeConfigUtil(secondaryPath, this.format, secondaryConfig);
  }

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
}
