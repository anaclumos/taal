import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { McpServer } from "../config/schema.js";
import type { Provider } from "./types.js";
import { readJsonConfig, resolveConfigPath, writeConfig } from "./utils.js";

/**
 * Claude Desktop Provider
 * Config: ~/Library/Application Support/Claude/claude_desktop_config.json
 * Format: JSON with "mcpServers" key
 * Supports: stdio servers only
 */
export class ClaudeDesktopProvider implements Provider {
  name = "claude-desktop";
  configPath = (home: string) =>
    join(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  format = "json" as const;
  mcpKey = "mcpServers";
  skillsPath = (home: string) => join(home, ".claude", "skills");

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
        console.warn(
          `Skipping HTTP server "${name}" - Claude Desktop only supports stdio servers`
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
  }
}

// Register provider
import { registry } from "./registry.js";

registry.register(new ClaudeDesktopProvider());
