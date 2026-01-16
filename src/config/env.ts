/**
 * Substitutes environment variables in configuration values
 * Replaces ${VAR_NAME} with process.env.VAR_NAME
 * Warns if environment variable is undefined but keeps original string
 */
export function substituteEnvVars(value: unknown): unknown {
  // Handle strings: replace ${VAR} patterns
  if (typeof value === 'string') {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.warn(`Warning: Environment variable ${varName} is not set`);
        return match; // Keep original ${VAR} if undefined
      }
      return envValue;
    });
  }
  
  // Handle arrays: recursively process each element
  if (Array.isArray(value)) {
    return value.map(substituteEnvVars);
  }
  
  // Handle objects: recursively process each value
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substituteEnvVars(v)])
    );
  }
  
  // Primitives (numbers, booleans, null, undefined): return as-is
  return value;
}
