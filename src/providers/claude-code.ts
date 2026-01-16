import { join } from "node:path";
import { BaseProvider, createStdioTransformer } from "./base.js";

export class ClaudeCodeProvider extends BaseProvider {
  name = "claude-code";
  configPath = (home: string) => join(home, ".claude", "settings.json");
  format = "json" as const;
  mcpKey = "mcpServers";
  skillsPath = (home: string) => join(home, ".claude", "skills");

  transformMcpServers = createStdioTransformer("Claude Code");
}
