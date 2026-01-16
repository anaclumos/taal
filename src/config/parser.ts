import { readFileSync } from "node:fs";
import { isError } from "es-toolkit/predicate";
import { parse } from "yaml";
import { substituteEnvVars } from "./env.js";
import { type TaalConfig, TaalConfigSchema } from "./schema.js";

/**
 * Loads and validates TAAL configuration from a YAML file
 *
 * @param path - Path to the YAML configuration file
 * @returns Validated TaalConfig object
 * @throws Error if file cannot be read, YAML is invalid, or validation fails
 */
export function loadConfig(path: string): TaalConfig {
  // 1. Read file
  let fileContent: string;
  try {
    fileContent = readFileSync(path, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read config file at ${path}: ${isError(error) ? error.message : String(error)}`
    );
  }

  // 2. Parse YAML
  let rawConfig: unknown;
  try {
    rawConfig = parse(fileContent);
  } catch (error) {
    throw new Error(
      `Failed to parse YAML in ${path}: ${isError(error) ? error.message : String(error)}`
    );
  }

  // 3. Substitute environment variables
  const configWithEnv = substituteEnvVars(rawConfig);

  // 4. Validate with Zod
  const result = TaalConfigSchema.safeParse(configWithEnv);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Config validation failed:\n${errors}`);
  }

  return result.data;
}
