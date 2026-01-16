import { homedir } from 'node:os';
import { registry } from '../providers/registry.js';
import type { McpServer } from '../config/schema.js';

// Import all providers to register them
import '../providers/claude-desktop.js';
import '../providers/claude-code.js';
import '../providers/cursor.js';
import '../providers/continue.js';
import '../providers/zed.js';
import '../providers/opencode.js';
import '../providers/codex.js';
import '../providers/windsurf.js';
import '../providers/antigravity.js';

export interface CollectConflict {
  serverName: string;
  providers: string[];
  configs: unknown[];
}

export interface CollectResult {
  servers: Record<string, McpServer>;
  conflicts: CollectConflict[];
  summary: {
    totalServers: number;
    providersScanned: number;
    providersWithConfigs: number;
  };
}

/**
 * Collect MCP server configs from all installed providers
 */
export async function collect(baseDir?: string): Promise<CollectResult> {
  const home = baseDir || homedir();
  const servers: Record<string, McpServer> = {};
  const conflicts: CollectConflict[] = [];
  const serverSources = new Map<string, { provider: string; config: unknown }[]>();
  
  let providersScanned = 0;
  let providersWithConfigs = 0;
  
  const allProviders = registry.getAll();
  
  for (const provider of allProviders) {
    providersScanned++;
    
    try {
      // Check if provider is installed
      const isInstalled = await provider.isInstalled(home);
      if (!isInstalled) {
        continue;
      }
      
      // Read provider config
      const config = await provider.readConfig(home);
      if (!config || typeof config !== 'object') {
        continue;
      }
      
      // Extract MCP servers from config
      const mcpServers = (config as Record<string, unknown>)[provider.mcpKey];
      if (!mcpServers || typeof mcpServers !== 'object') {
        continue;
      }
      
      providersWithConfigs++;
      
      // Process each server
      for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
        // Track source for conflict detection
        if (!serverSources.has(serverName)) {
          serverSources.set(serverName, []);
        }
        serverSources.get(serverName)!.push({
          provider: provider.name,
          config: serverConfig
        });
        
        // Convert to TAAL format
        const taalServer = convertToTaalFormat(serverConfig);
        if (taalServer) {
          servers[serverName] = taalServer;
        }
      }
    } catch (error) {
      // Skip providers that fail to read
      console.warn(`Warning: Failed to read config from ${provider.name}:`, error);
    }
  }
  
  // Detect conflicts
  for (const [serverName, sources] of serverSources.entries()) {
    if (sources.length > 1) {
      // Check if configs are actually different
      const configStrings = sources.map(s => JSON.stringify(s.config));
      const uniqueConfigs = new Set(configStrings);
      
      if (uniqueConfigs.size > 1) {
        conflicts.push({
          serverName,
          providers: sources.map(s => s.provider),
          configs: sources.map(s => s.config)
        });
      }
    }
  }
  
  return {
    servers,
    conflicts,
    summary: {
      totalServers: Object.keys(servers).length,
      providersScanned,
      providersWithConfigs
    }
  };
}

/**
 * Convert provider-specific server config to TAAL format
 */
function convertToTaalFormat(config: unknown): McpServer | null {
  if (!config || typeof config !== 'object') {
    return null;
  }
  
  const obj = config as Record<string, unknown>;
  
  // HTTP server
  if (obj.url && typeof obj.url === 'string') {
    return {
      url: obj.url,
      headers: obj.headers as Record<string, string> || obj.http_headers as Record<string, string>
    };
  }
  
  // Stdio server
  if (obj.command && typeof obj.command === 'string') {
    const server: McpServer = {
      command: obj.command
    };
    
    if (Array.isArray(obj.args)) {
      server.args = obj.args as string[];
    }
    
    if (obj.env && typeof obj.env === 'object') {
      server.env = obj.env as Record<string, string>;
    } else if (obj.environment && typeof obj.environment === 'object') {
      server.env = obj.environment as Record<string, string>;
    }
    
    return server;
  }
  
  // OpenCode format with command array
  if (Array.isArray(obj.command) && obj.command.length > 0) {
    const [cmd, ...args] = obj.command as string[];
    const server: McpServer = {
      command: cmd,
      args
    };
    
    if (obj.environment && typeof obj.environment === 'object') {
      server.env = obj.environment as Record<string, string>;
    }
    
    return server;
  }
  
  return null;
}
