import { exists, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { findEnvVarReferences, substituteEnvVars } from "../config/env.js";
import { TaalConfigSchema } from "../config/schema.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validate(baseDir?: string): Promise<ValidationResult> {
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!(await exists(configPath))) {
    return {
      valid: false,
      errors: ["Config file not found"],
      warnings: [],
    };
  }

  try {
    const content = await readFile(configPath, "utf-8");

    let rawConfig: unknown;
    try {
      rawConfig = parse(content);
    } catch (error) {
      return {
        valid: false,
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
    }

    return {
      valid: result.success,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings,
    };
  }
}
