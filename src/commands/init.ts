import { exists, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { collect } from "./collect.js";

const SAMPLE_CONFIG = `# TAAL Configuration
# https://github.com/user/taal

version: "1"

mcp: {}
  # Example stdio server
  # example-server:
  #   command: npx
  #   args: ["-y", "@example/mcp-server"]
  #   env:
  #     API_KEY: "\${API_KEY}"
  
  # Example HTTP server
  # context7:
  #   url: https://mcp.context7.com/mcp
  #   headers:
  #     CONTEXT7_API_KEY: "\${CONTEXT7_API_KEY}"

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
    - claude-code
    - cursor
    - continue
    - zed
    - opencode
    - codex
    - windsurf
    - antigravity
`;

export interface InitOptions {
  force?: boolean;
}

export interface InitResult {
  configPath: string;
  collected: boolean;
  serversFound: number;
}

export async function init(
  baseDir?: string,
  options: InitOptions = {}
): Promise<InitResult> {
  const taalDir = join(baseDir || homedir(), ".taal");
  const configPath = join(taalDir, "config.yaml");
  const skillsDir = join(taalDir, "skills");
  const backupsDir = join(taalDir, "backups");

  // Check if already initialized
  if ((await exists(configPath)) && !options.force) {
    throw new Error("TAAL is already initialized. Use --force to overwrite.");
  }

  // Create directories
  await mkdir(taalDir, { recursive: true });
  await mkdir(skillsDir, { recursive: true });
  await mkdir(backupsDir, { recursive: true });

  // Write sample config
  await writeFile(configPath, SAMPLE_CONFIG, "utf-8");

  // Automatically collect existing MCP configs from installed providers
  const collectResult = await collect(baseDir);

  return {
    configPath,
    collected: collectResult.summary.totalServers > 0,
    serversFound: collectResult.summary.totalServers,
  };
}
