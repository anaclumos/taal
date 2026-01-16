import { mkdir, writeFile, exists } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SAMPLE_CONFIG = `# TAAL Configuration
# https://github.com/user/taal

version: "1"

mcp:
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

export async function init(baseDir?: string, options: InitOptions = {}): Promise<void> {
  const taalDir = join(baseDir || homedir(), '.taal');
  const configPath = join(taalDir, 'config.yaml');
  const skillsDir = join(taalDir, 'skills');
  const backupsDir = join(taalDir, 'backups');

  // Check if already initialized
  if (await exists(configPath) && !options.force) {
    throw new Error('TAAL is already initialized. Use --force to overwrite.');
  }

  // Create directories
  await mkdir(taalDir, { recursive: true });
  await mkdir(skillsDir, { recursive: true });
  await mkdir(backupsDir, { recursive: true });

  // Write sample config
  await writeFile(configPath, SAMPLE_CONFIG, 'utf-8');
}
