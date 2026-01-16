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
  
  async isInstalled(home?: string): Promise<boolean> {
    const homeDir = home || homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, homeDir));
    return existsSync(configDir);
  }
  
  async readConfig(home?: string): Promise<unknown> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    return readJsonConfig(path);
  }
  
  async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
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

import { registry } from './registry.js';
registry.register(new ClaudeCodeProvider());
