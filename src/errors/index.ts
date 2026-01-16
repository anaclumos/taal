export class TaalError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TaalError";
    this.code = code;
  }
}

export class ConfigError extends TaalError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class ProviderError extends TaalError {
  readonly providerName: string;

  constructor(message: string, providerName: string) {
    super(message, "PROVIDER_ERROR");
    this.name = "ProviderError";
    this.providerName = providerName;
  }
}

export class ValidationError extends TaalError {
  readonly errors: string[];

  constructor(message: string, errors: string[]) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
