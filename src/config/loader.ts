import { exists, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { findEnvVarReferences, substituteEnvVars } from "./env.js";
import { type TaalConfig, TaalConfigSchema } from "./schema.js";

export interface LoadConfigResult {
  config: TaalConfig | null;
  errors: string[];
  warnings: string[];
}

export async function loadTaalConfig(
  baseDir?: string
): Promise<LoadConfigResult> {
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!(await exists(configPath))) {
    return {
      config: null,
      errors: ["Config file not found"],
      warnings: [],
    };
  }

  let content: string;
  try {
    content = await readFile(configPath, "utf-8");
  } catch (error) {
    return {
      config: null,
      errors: [
        `Failed to read config: ${error instanceof Error ? error.message : error}`,
      ],
      warnings: [],
    };
  }

  let rawConfig: unknown;
  try {
    rawConfig = parse(content);
  } catch (error) {
    return {
      config: null,
      errors: [
        `Failed to parse YAML: ${error instanceof Error ? error.message : error}`,
      ],
      warnings,
    };
  }

  const envVarRefs = findEnvVarReferences(rawConfig);
  for (const varName of envVarRefs) {
    if (!process.env[varName]) {
      warnings.push(`Environment variable ${varName} is not set`);
    }
  }

  const configWithEnv = substituteEnvVars(rawConfig);
  const result = TaalConfigSchema.safeParse(configWithEnv);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
    return {
      config: null,
      errors,
      warnings,
    };
  }

  return {
    config: result.data,
    errors: [],
    warnings,
  };
}

export function getConfigPath(baseDir?: string): string {
  const home = baseDir || homedir();
  return join(home, ".taal", "config.yaml");
}
