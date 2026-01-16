import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readJsonConfig, writeConfig, resolveConfigPath } from './utils.js';

/**
 * Windsurf Provider
 * Config: Similar to Cursor/VSCode
 * Format: JSON with "mcpServers" key
 * Supports: stdio and streamable-http
 */
export class WindsurfProvider implements Provider {
  name = 'windsurf';
  configPath = (home: string) => {
    const os = platform();
    if (os === 'darwin') {
      return join(home, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json');
    } else {
      return join(home, '.config', 'Windsurf', 'User', 'settings.json');
    }
  };
  format = 'json' as const;
  mcpKey = 'mcpServers';
  
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
          transport: 'streamable-http',
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
