import type { McpServer } from "../config/schema.js";

export type ConfigFormat = "json" | "yaml" | "toml";

export interface StdioServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HttpServerConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface OpenCodeServerConfig {
  type: "local" | "remote";
  command?: string[];
  url?: string;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface CodexServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  http_headers?: Record<string, string>;
  enabled: boolean;
  startup_timeout_sec?: number;
  enabled_tools?: string[];
}

export interface WindsurfHttpServerConfig extends HttpServerConfig {
  transport: "streamable-http";
}

export interface ProviderConfig {
  [key: string]: unknown;
}

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
  isInstalled(home?: string): Promise<boolean>;

  /**
   * Read provider's current config
   */
  readConfig(home?: string): Promise<unknown>;

  /**
   * Write config to provider's config file
   * Should use atomic write and backup
   */
  writeConfig(config: unknown, home?: string): Promise<void>;

  /**
   * Transform TAAL MCP servers to provider-specific format
   */
  transformMcpServers(servers: Record<string, McpServer>): unknown;

  /**
   * Optional: Transform skills to provider-specific format
   */
  transformSkills?(skills: unknown[]): unknown;

  /**
   * Optional: Apply additional transformations to the full config
   * Called after mcpKey is set, allows providers to add extra keys
   */
  transformConfig?(
    config: Record<string, unknown>,
    servers: Record<string, McpServer>
  ): Record<string, unknown>;
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
