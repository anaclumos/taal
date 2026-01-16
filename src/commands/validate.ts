import { loadTaalConfig } from "../config/loader.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validate(baseDir?: string): Promise<ValidationResult> {
  const result = await loadTaalConfig(baseDir);

  return {
    valid: result.config !== null && result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}
