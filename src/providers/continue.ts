import { homedir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import type { McpServer } from "../config/schema.js";
import { atomicWrite } from "../utils/atomic-write.js";
import { backupConfig } from "../utils/backup.js";
import { BaseProvider } from "./base.js";
import { resolveConfigPath } from "./utils.js";

export class ContinueProvider extends BaseProvider {
  name = "continue";
  configPath = (home: string) => join(home, ".continue", "config.yaml");
  format = "yaml" as const;
  mcpKey = "mcpServers";

  override async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);

    backupConfig(path);

    const yamlContent = stringifyYaml(config);
    atomicWrite(path, yamlContent);
  }

  transformMcpServers(servers: Record<string, McpServer>): unknown[] {
    const transformed: unknown[] = [];

    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed.push({
          name,
          url: server.url,
          ...(server.headers && {
            headers: this.transformEnvVars(server.headers),
          }),
        });
      } else if (server.command) {
        transformed.push({
          name,
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: this.transformEnvVars(server.env) }),
        });
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }

    return transformed;
  }

  private transformEnvVars(
    obj: Record<string, string>
  ): Record<string, string> {
    const transformed: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[key] = value.replace(/\$\{([^}]+)\}/g, "${{ secrets.$1 }}");
    }
    return transformed;
  }
}
