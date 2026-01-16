import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readYamlConfig, resolveConfigPath } from './utils.js';
import { backupConfig } from '../utils/backup.js';
import { atomicWrite } from '../utils/atomic-write.js';
import { stringify as stringifyYaml } from 'yaml';

/**
 * Continue.dev Provider
 * Config: ~/.continue/config.yaml
 * Format: YAML with metadata header
 * Supports: SSE (url) and stdio servers
 * Transforms ${VAR} to ${{ secrets.VAR }}
 */
export class ContinueProvider implements Provider {
  name = 'continue';
  configPath = (home: string) => join(home, '.continue', 'config.yaml');
  format = 'yaml' as const;
  mcpKey = 'mcpServers';
  
  async isInstalled(): Promise<boolean> {
    const home = homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, home));
    return existsSync(configDir);
  }
  
  async readConfig(): Promise<unknown> {
    const home = homedir();
    const path = resolveConfigPath(this.configPath, home);
    return readYamlConfig(path);
  }
  
  async writeConfig(config: unknown): Promise<void> {
    const home = homedir();
    const path = resolveConfigPath(this.configPath, home);
    
    backupConfig(path);
    
    const yamlContent = stringifyYaml(config);
    atomicWrite(path, yamlContent);
  }
  
  transformMcpServers(servers: Record<string, McpServer>): unknown[] {
    const transformed: unknown[] = [];
    
    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed.push({
          name,
          url: server.url,
          ...(server.headers && { headers: this.transformEnvVars(server.headers) }),
        });
      } else if (server.command) {
        transformed.push({
          name,
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: this.transformEnvVars(server.env) }),
        });
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }
    
    return transformed;
  }
  
  private transformEnvVars(obj: Record<string, string>): Record<string, string> {
    const transformed: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[key] = value.replace(/\$\{([^}]+)\}/g, '${{ secrets.$1 }}');
    }
    return transformed;
  }
}
