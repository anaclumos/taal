import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";

export class OpenCodeProvider extends BaseProvider {
  name = "opencode";
  configPath = (home: string) =>
    join(home, ".config", "opencode", "opencode.json");
  format = "json" as const;
  mcpKey = "mcp";
  skillsPath = (home: string) => join(home, ".opencode", "skills");

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
