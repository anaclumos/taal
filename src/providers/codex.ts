import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { Provider } from './types.js';
import type { McpServer } from '../config/schema.js';
import { readTomlConfig, resolveConfigPath } from './utils.js';
import { backupConfig } from '../utils/backup.js';
import { atomicWrite } from '../utils/atomic-write.js';
import { stringify as stringifyToml } from '@iarna/toml';

/**
 * Codex Provider
 * Config: ~/.codex/config.toml
 * Format: TOML with [mcp_servers.name] sections
 * http_headers for HTTP servers
 * enabled_tools support from overrides
 * Skills: ~/.codex/skills/
 */
export class CodexProvider implements Provider {
  name = 'codex';
  configPath = (home: string) => join(home, '.codex', 'config.toml');
  format = 'toml' as const;
  mcpKey = 'mcp_servers';
  skillsPath = (home: string) => join(home, '.codex', 'skills');
  
  async isInstalled(home?: string): Promise<boolean> {
    const homeDir = home || homedir();
    const configDir = dirname(resolveConfigPath(this.configPath, homeDir));
    return existsSync(configDir);
  }
  
  async readConfig(home?: string): Promise<unknown> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    return readTomlConfig(path);
  }
  
  async writeConfig(config: unknown, home?: string): Promise<void> {
    const homeDir = home || homedir();
    const path = resolveConfigPath(this.configPath, homeDir);
    
    backupConfig(path);
    
    const tomlContent = stringifyToml(config as any);
    atomicWrite(path, tomlContent);
  }
  
  transformMcpServers(servers: Record<string, McpServer>): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};
    
    for (const [name, server] of Object.entries(servers)) {
      if (server.url) {
        transformed[name] = {
          url: server.url,
          ...(server.headers && { http_headers: server.headers }),
          enabled: true,
          startup_timeout_sec: 30,
          ...(server.overrides?.codex?.enabled_tools && { 
            enabled_tools: server.overrides.codex.enabled_tools 
          }),
        };
      } else if (server.command) {
        transformed[name] = {
          command: server.command,
          ...(server.args && { args: server.args }),
          ...(server.env && { env: server.env }),
          enabled: true,
          ...(server.overrides?.codex?.enabled_tools && { 
            enabled_tools: server.overrides.codex.enabled_tools 
          }),
        };
      } else {
        console.warn(`Skipping server "${name}" - missing command or url`);
      }
    }
    
    return transformed;
  }
}

import { registry } from './registry.js';
registry.register(new CodexProvider());
