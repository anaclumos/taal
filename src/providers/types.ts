import type { McpServer } from '../config/schema.js';

/**
 * Configuration format supported by providers
 */
export type ConfigFormat = 'json' | 'yaml' | 'toml';

/**
 * Provider interface - defines how to interact with each AI coding assistant
 */
export interface Provider {
  /** Provider name (e.g., 'claude-desktop', 'cursor') */
  name: string;
  
  /** Path to provider's config file (can be function for dynamic paths) */
  configPath: string | ((home: string) => string);
  
  /** Config file format */
  format: ConfigFormat;
  
  /** Key in config where MCP servers are stored (e.g., 'mcpServers', 'context_servers') */
  mcpKey: string;
  
  /** Optional path to provider's skills directory */
  skillsPath?: string | ((home: string) => string);
  
  /**
   * Check if provider is installed on this system
   */
  isInstalled(): Promise<boolean>;
  
  /**
   * Read provider's current config
   */
  readConfig(): Promise<unknown>;
  
  /**
   * Write config to provider's config file
   * Should use atomic write and backup
   */
  writeConfig(config: unknown): Promise<void>;
  
  /**
   * Transform TAAL MCP servers to provider-specific format
   */
  transformMcpServers(servers: Record<string, McpServer>): unknown;
  
  /**
   * Optional: Transform skills to provider-specific format
   */
  transformSkills?(skills: unknown[]): unknown;
}

/**
 * Provider metadata for registration
 */
export interface ProviderMetadata {
  name: string;
  configPath: string | ((home: string) => string);
  format: ConfigFormat;
  mcpKey: string;
  skillsPath?: string | ((home: string) => string);
}
