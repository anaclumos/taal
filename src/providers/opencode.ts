import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readJsonConfig, writeConfig, resolveConfigPath } from './utils.js';

/**
 * OpenCode Provider
 * Config: opencode.json (project) or ~/.config/opencode/opencode.json (global)
 * Format: JSON with "mcp" key
 * type: "local" | "remote"
 * command is array, uses "environment" not "env"
 * Skills: .opencode/skills/
 */
export class OpenCodeProvider implements Provider {
  name = 'opencode';
  configPath = (home: string) => join(home, '.config', 'opencode', 'opencode.json');
  format = 'json' as const;
  mcpKey = 'mcp';
  skillsPath = (home: string) => join(home, '.opencode', 'skills');
  
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
        transformed[name] = {
          type: 'remote',
          url: server.url,
          ...(server.headers && { headers: server.headers }),
          enabled: true,
        };
      } else if (server.command) {
        const command = [server.command, ...(server.args || [])];
        
        transformed[name] = {
          type: 'local',
          command,
          ...(server.env && { environment: server.env }),
          enabled: true,
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }
    
    return transformed;
  }
}
