import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readJsonConfig, writeConfig, resolveConfigPath } from './utils.js';

/**
 * Zed Provider
 * Config: ~/.config/zed/settings.json
 * Format: JSON with "context_servers" key (not mcpServers!)
 * Supports: both HTTP and stdio servers
 */
export class ZedProvider implements Provider {
  name = 'zed';
  configPath = (home: string) => join(home, '.config', 'zed', 'settings.json');
  format = 'json' as const;
  mcpKey = 'context_servers';
  
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
          url: server.url,
          ...(server.headers && { headers: server.headers }),
        };
      } else if (server.command) {
        transformed[name] = {
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: server.env }),
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }
    
    return transformed;
  }
}
