import { platform } from "node:os";
import { join } from "node:path";
import { BaseProvider, createStdioTransformer } from "./base.js";

export class AntigravityProvider extends BaseProvider {
  name = "antigravity";
  configPath = (home: string) => {
    const os = platform();
    if (os === "darwin") {
      return join(
        home,
        "Library",
        "Application Support",
        "Antigravity",
        "settings.json"
      );
    }
    return join(home, ".config", "antigravity", "settings.json");
  };
  format = "json" as const;
  mcpKey = "mcpServers";

  transformMcpServers = createStdioTransformer("Antigravity");
}
