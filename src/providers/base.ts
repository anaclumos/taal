import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname } from "node:path";
import type { McpServer } from "../config/schema.js";
import type { ConfigFormat, Provider } from "./types.js";
import {
  readConfig,
  resolveConfigPath,
  writeConfig as writeConfigUtil,
} from "./utils.js";

export abstract class BaseProvider implements Provider {
  abstract name: string;
  abstract configPath: string | ((home: string) => string);
  abstract format: ConfigFormat;
  abstract mcpKey: string;
  skillsPath?: string | ((home: string) => string);

  async isInstalled(home?: string): Promise<boolean> {
    const homeDir = home || homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, homeDir));
    return existsSync(configDir);
  }

  async readConfig(home?: string): Promise<unknown> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    return readConfig(path, this.format);
  }

  async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    writeConfigUtil(path, this.format, config);
  }

  abstract transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> | unknown[];
}

export function createStdioTransformer(providerName: string) {
  return function transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        console.warn(
          `Skipping HTTP server "${name}" - ${providerName} only supports stdio servers`
        );
        continue;
      }

      if (!server.command) {
        console.warn(`Skipping server "${name}" - missing command`);
        continue;
      }

      transformed[name] = {
        command: server.command,
        ...(server.args && { args: server.args }),
        ...(server.env && { env: server.env }),
      };
    }

    return transformed;
  };
}
