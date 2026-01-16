import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readJsonConfig, writeConfig, resolveConfigPath } from './utils.js';

/**
 * Claude Code Provider
 * Config: ~/.claude/settings.json
 * Format: JSON with "mcpServers" key
 * Supports: stdio servers only
 */
export class ClaudeCodeProvider implements Provider {
  name = 'claude-code';
  configPath = (home: string) => join(home, '.claude', 'settings.json');
  format = 'json' as const;
  mcpKey = 'mcpServers';
  skillsPath = (home: string) => join(home, '.claude', 'skills');
  
  async isInstalled(): Promise<boolean> {
    const home = homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, home));
    return existsSync(configDir);
  }
  
  async readConfig(): Promise<unknown> {
    const home = homedir();
    const path = resolveConfigPath(this.configPath, home);
    return readJsonConfig(path);
  }
  
  async writeConfig(config: unknown): Promise<void> {
    const home = homedir();
    const path = resolveConfigPath(this.configPath, home);
    writeConfig(path, this.format, config);
  }
  
  transformMcpServers(servers: Record<string, McpServer>): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};
    
    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        console.warn(`Skipping HTTP server "${name}" - Claude Code only supports stdio servers`);
        continue;
      }
      
      if (!server.command) {
        console.warn(`Skipping server "${name}" - missing command`);
        continue;
      }
      
      transformed[name] = {
        command: server.command,
        ...(server.args && { args: server.args }),
        ...(server.env && { env: server.env }),
      };
    }
    
    return transformed;
  }
}
