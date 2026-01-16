import { join } from "node:path";
import { BaseProvider, createStdioTransformer } from "./base.js";

export class ClaudeDesktopProvider extends BaseProvider {
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

  transformMcpServers = createStdioTransformer("Claude Desktop");
}
