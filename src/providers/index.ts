import { AntigravityProvider } from "./antigravity.js";
import { ClaudeCodeProvider } from "./claude-code.js";
import { ClaudeDesktopProvider } from "./claude-desktop.js";
import { CodexProvider } from "./codex.js";
import { ContinueProvider } from "./continue.js";
import { CursorProvider } from "./cursor.js";
import { OpenCodeProvider } from "./opencode.js";
import { registry as providerRegistry } from "./registry.js";
import { WindsurfProvider } from "./windsurf.js";
import { ZedProvider } from "./zed.js";

let initialized = false;

export function initializeProviders(): void {
  if (initialized) {
    return;
  }

  providerRegistry.register(new ClaudeDesktopProvider());
  providerRegistry.register(new ClaudeCodeProvider());
  providerRegistry.register(new CursorProvider());
  providerRegistry.register(new ContinueProvider());
  providerRegistry.register(new ZedProvider());
  providerRegistry.register(new OpenCodeProvider());
  providerRegistry.register(new CodexProvider());
  providerRegistry.register(new WindsurfProvider());
  providerRegistry.register(new AntigravityProvider());

  initialized = true;
}

// biome-ignore lint/performance/noBarrelFile: Intentional barrel for provider initialization
export { registry } from "./registry.js";
export type { ConfigFormat, Provider, ProviderMetadata } from "./types.js";
