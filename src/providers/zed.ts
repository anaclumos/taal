import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";

export class ZedProvider extends BaseProvider {
  name = "zed";
  configPath = (home: string) => join(home, ".config", "zed", "settings.json");
  format = "json" as const;
  mcpKey = "context_servers";

  transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          url: server.url,
          ...(server.headers && { headers: server.headers }),
        };
      } else if (server.command) {
        transformed[name] = {
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
}
