import { platform } from "node:os";
import { join } from "node:path";
import type { McpServer } from "../config/schema.js";
import { BaseProvider } from "./base.js";

export class WindsurfProvider extends BaseProvider {
  name = "windsurf";
  configPath = (home: string) => {
    const os = platform();
    if (os === "darwin") {
      return join(
        home,
        "Library",
        "Application Support",
        "Windsurf",
        "User",
        "settings.json"
      );
    }
    return join(home, ".config", "Windsurf", "User", "settings.json");
  };
  format = "json" as const;
  mcpKey = "mcpServers";

  transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          url: server.url,
          transport: "streamable-http",
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
