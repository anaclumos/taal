import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";

export class ClaudeCodeProvider extends BaseProvider {
  name = "claude-code";
  configPath = (home: string) => join(home, ".claude", "settings.json");
  format = "json" as const;
  mcpKey = "mcpServers";
  skillsPath = (home: string) => join(home, ".claude", "skills");

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
