import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { providers } from "../../src/commands/providers";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(join(testDir, ".taal"), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("providers lists all 9 supported providers", async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const result = await providers(testDir);

  expect(result.providers).toHaveLength(9);
  expect(result.providers.some((p) => p.name === "claude-desktop")).toBe(true);
  expect(result.providers.some((p) => p.name === "claude-code")).toBe(true);
  expect(result.providers.some((p) => p.name === "cursor")).toBe(true);
  expect(result.providers.some((p) => p.name === "zed")).toBe(true);
});

test("providers shows installed status", async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled: []
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });

  const result = await providers(testDir);

  const claudeProvider = result.providers.find(
    (p) => p.name === "claude-desktop"
  );
  expect(claudeProvider?.installed).toBe(true);
});

test("providers shows enabled status from config", async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled:
    - claude-desktop
    - cursor
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const result = await providers(testDir);

  const claudeProvider = result.providers.find(
    (p) => p.name === "claude-desktop"
  );
  const cursorProvider = result.providers.find((p) => p.name === "cursor");
  const zedProvider = result.providers.find((p) => p.name === "zed");

  expect(claudeProvider?.enabled).toBe(true);
  expect(cursorProvider?.enabled).toBe(true);
  expect(zedProvider?.enabled).toBe(false);
});

test("providers shows config paths", async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled: []
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const result = await providers(testDir);

  for (const provider of result.providers) {
    expect(provider.configPath).toBeDefined();
    expect(typeof provider.configPath).toBe("string");
  }
});

test("providers works without config file", async () => {
  const result = await providers(testDir);

  expect(result.providers).toHaveLength(9);
  expect(result.providers.every((p) => !p.enabled)).toBe(true);
});

test("providers shows format for each provider", async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled: []
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const result = await providers(testDir);

  const claudeProvider = result.providers.find(
    (p) => p.name === "claude-desktop"
  );
  const codexProvider = result.providers.find((p) => p.name === "codex");
  const continueProvider = result.providers.find((p) => p.name === "continue");

  expect(claudeProvider?.format).toBe("json");
  expect(codexProvider?.format).toBe("toml");
  expect(continueProvider?.format).toBe("yaml");
});
