import { existsSync, readFileSync } from "node:fs";
import type { JsonMap } from "@iarna/toml";
import { parse as parseToml, stringify as stringifyToml } from "@iarna/toml";
import { parse as parseJsonc } from "jsonc-parser";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { atomicWrite } from "../utils/atomic-write.js";
import { backupConfig } from "../utils/backup.js";
import type { ConfigFormat } from "./types.js";

/**
 * Read and parse a JSON config file (supports JSONC - JSON with Comments)
 */
export function readJsonConfig(path: string): unknown {
  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = readFileSync(path, "utf-8");
    // Use JSONC parser to support comments and trailing commas (used by Zed, VS Code, etc.)
    return parseJsonc(content);
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
    const content = readFileSync(path, "utf-8");
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
    const content = readFileSync(path, "utf-8");
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
    case "json":
      return readJsonConfig(path);
    case "yaml":
      return readYamlConfig(path);
    case "toml":
      return readTomlConfig(path);
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }
}

export function writeConfig(
  path: string,
  format: ConfigFormat,
  config: unknown
): void {
  backupConfig(path);

  let content: string;
  switch (format) {
    case "json":
      content = JSON.stringify(config, null, 2);
      break;
    case "yaml":
      content = stringifyYaml(config);
      break;
    case "toml":
      content = stringifyToml(config as JsonMap);
      break;
    default:
      throw new Error(`Unsupported config format: ${format}`);
  }

  atomicWrite(path, content);
}

/**
 * Resolve config path (handle both string and function)
 */
export function resolveConfigPath(
  configPath: string | ((home: string) => string),
  home: string
): string {
  return typeof configPath === "function" ? configPath(home) : configPath;
}
