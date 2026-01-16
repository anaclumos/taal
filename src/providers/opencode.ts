import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { McpServer } from "../config/schema.js";
import type { Provider } from "./types.js";
import { readJsonConfig, resolveConfigPath, writeConfig } from "./utils.js";

/**
 * OpenCode Provider
 * Config: opencode.json (project) or ~/.config/opencode/opencode.json (global)
 * Format: JSON with "mcp" key
 * type: "local" | "remote"
 * command is array, uses "environment" not "env"
 * Skills: .opencode/skills/
 */
export class OpenCodeProvider implements Provider {
  name = "opencode";
  configPath = (home: string) =>
    join(home, ".config", "opencode", "opencode.json");
  format = "json" as const;
  mcpKey = "mcp";
  skillsPath = (home: string) => join(home, ".opencode", "skills");

  async isInstalled(home?: string): Promise<boolean> {
    const homeDir = home || homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, homeDir));
    return existsSync(configDir);
  }

  async readConfig(home?: string): Promise<unknown> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    return readJsonConfig(path);
  }

  async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    writeConfig(path, this.format, config);
  }

  transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          type: "remote",
          url: server.url,
          ...(server.headers && { headers: server.headers }),
          enabled: true,
        };
      } else if (server.command) {
        const command = [server.command, ...(server.args || [])];

        transformed[name] = {
          type: "local",
          command,
          ...(server.env && { environment: server.env }),
          enabled: true,
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }

    return transformed;
  }
}

import { registry } from "./registry.js";

registry.register(new OpenCodeProvider());
