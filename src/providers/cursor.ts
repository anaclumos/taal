import { platform } from "node:os";
import { join } from "node:path";
import { BaseProvider, createStdioTransformer } from "./base.js";

export class CursorProvider extends BaseProvider {
  name = "cursor";
  configPath = (home: string) => {
    const os = platform();
    if (os === "darwin") {
      return join(
        home,
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "settings.json"
      );
    }
    return join(home, ".config", "Cursor", "User", "settings.json");
  };
  format = "json" as const;
  mcpKey = "mcpServers";

  transformMcpServers = createStdioTransformer("Cursor");
}
