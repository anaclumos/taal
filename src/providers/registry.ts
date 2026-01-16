import type { Provider } from "./types.js";

/**
 * Global provider registry
 */
class ProviderRegistry {
  private readonly providers: Map<string, Provider> = new Map();

  /**
   * Register a provider
   */
  register(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: string): Provider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAll(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all provider names
   */
  getNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all installed providers
   */
  async getInstalled(): Promise<Provider[]> {
    const all = this.getAll();
    const installed: Provider[] = [];

    for (const provider of all) {
      if (await provider.isInstalled()) {
        installed.push(provider);
      }
    }

    return installed;
  }

  /**
   * Clear all registered providers (mainly for testing)
   */
  clear(): void {
    this.providers.clear();
  }
}

// Export singleton instance
export const registry = new ProviderRegistry();

// Export class for testing
export { ProviderRegistry };
