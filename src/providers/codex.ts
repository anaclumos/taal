import { homedir } from "node:os";
import { join } from "node:path";
import type { JsonMap } from "@iarna/toml";
import { stringify as stringifyToml } from "@iarna/toml";
import type { McpServer } from "../config/schema.js";
import { atomicWrite } from "../utils/atomic-write.js";
import { backupConfig } from "../utils/backup.js";
import { BaseProvider } from "./base.js";
import { resolveConfigPath } from "./utils.js";

export class CodexProvider extends BaseProvider {
  name = "codex";
  configPath = (home: string) => join(home, ".codex", "config.toml");
  format = "toml" as const;
  mcpKey = "mcp_servers";
  skillsPath = (home: string) => join(home, ".codex", "skills");

  override async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);

    backupConfig(path);

    const tomlContent = stringifyToml(config as JsonMap);
    atomicWrite(path, tomlContent);
  }

  transformMcpServers(
    servers: Record<string, McpServer>
  ): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          url: server.url,
          ...(server.headers && { http_headers: server.headers }),
          enabled: true,
          startup_timeout_sec: 30,
          ...(server.overrides?.codex?.enabled_tools && {
            enabled_tools: server.overrides.codex.enabled_tools,
          }),
        };
      } else if (server.command) {
        transformed[name] = {
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: server.env }),
          enabled: true,
          ...(server.overrides?.codex?.enabled_tools && {
            enabled_tools: server.overrides.codex.enabled_tools,
          }),
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }

    return transformed;
  }
}
