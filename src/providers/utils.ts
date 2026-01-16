import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { parse as parseToml } from '@iarna/toml';
import type { ConfigFormat } from './types.js';
import { atomicWrite } from '../utils/atomic-write.js';
import { backupConfig } from '../utils/backup.js';

/**
 * Read and parse a JSON config file
 */
export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }
  
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON config at ${path}: ${error}`);
  }
}

/**
 * Read and parse a YAML config file
 */
export function readYamlConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }
  
  try {
    const content = readFileSync(path, 'utf-8');
    return parseYaml(content);
  } catch (error) {
    throw new Error(`Failed to read YAML config at ${path}: ${error}`);
  }
}

/**
 * Read and parse a TOML config file
 */
export function readTomlConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }
  
  try {
    const content = readFileSync(path, 'utf-8');
    return parseToml(content);
  } catch (error) {
    throw new Error(`Failed to read TOML config at ${path}: ${error}`);
  }
}

/**
 * Read config file based on format
 */
export function readConfig(path: string, format: ConfigFormat): unknown {
  switch (format) {
    case 'json':
      return readJsonConfig(path);
    case 'yaml':
      return readYamlConfig(path);
    case 'toml':
      return readTomlConfig(path);
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
}

/**
 * Write config file with backup and atomic write
 */
export function writeConfig(
  path: string,
  format: ConfigFormat,
  config: unknown
): void {
  // Create backup if file exists
  backupConfig(path);
  
  // Serialize based on format
  let content: string;
  switch (format) {
    case 'json':
      content = JSON.stringify(config, null, 2);
      break;
    case 'yaml':
      // Note: YAML stringify will be implemented when needed
      throw new Error('YAML write not yet implemented');
    case 'toml':
      // Note: TOML stringify will be implemented when needed
      throw new Error('TOML write not yet implemented');
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
  
  // Atomic write
  atomicWrite(path, content);
}

/**
 * Resolve config path (handle both string and function)
 */
export function resolveConfigPath(
  configPath: string | ((home: string) => string),
  home: string
): string {
  return typeof configPath === 'function' ? configPath(home) : configPath;
}
