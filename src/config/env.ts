import { isPlainObject, isString } from "es-toolkit";

export function findEnvVarReferences(value: unknown): string[] {
  const refs = new Set<string>();

  if (isString(value)) {
    const matches = value.matchAll(/\$\{([^}]+)\}/g);
    for (const match of matches) {
      refs.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      for (const ref of findEnvVarReferences(item)) {
        refs.add(ref);
      }
    }
  } else if (isPlainObject(value)) {
    for (const v of Object.values(value)) {
      for (const ref of findEnvVarReferences(v)) {
        refs.add(ref);
      }
    }
  }

  return Array.from(refs);
}

export function substituteEnvVars(value: unknown): unknown {
  if (isString(value)) {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.warn(`Warning: Environment variable ${varName} is not set`);
        return match;
      }
      return envValue;
    });
  }

  if (Array.isArray(value)) {
    return value.map(substituteEnvVars);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, substituteEnvVars(v)])
    );
  }

  return value;
}
