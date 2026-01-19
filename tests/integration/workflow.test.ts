import { afterEach, beforeEach, expect, test } from "bun:test";
import { exists, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import YAML from "yaml";
import { collect } from "../../src/commands/collect";
import { diff } from "../../src/commands/diff";
import { init } from "../../src/commands/init";
import { list } from "../../src/commands/list";
import { providers } from "../../src/commands/providers";
import { sync } from "../../src/commands/sync";
import { validate } from "../../src/commands/validate";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-integration-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("full workflow: init → validate → sync", async () => {
  await init(testDir);

  const configPath = join(testDir, ".taal", "config.yaml");
  expect(await exists(configPath)).toBe(true);

  const validateResult = await validate(testDir);
  expect(validateResult.valid).toBe(true);

  const config = `
version: "1"

mcp:
  test-server:
    command: npx
    args: ["-y", "@test/server"]

skills:
  paths:
    - ${testDir}/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(configPath, config);

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, "claude_desktop_config.json"), "{}");

  const syncResult = await sync(testDir);
  expect(syncResult.success).toBe(true);
  expect(syncResult.synced).toContain("claude-desktop");

  const claudeConfig = JSON.parse(
    await readFile(join(claudeDir, "claude_desktop_config.json"), "utf-8")
  );
  expect(claudeConfig.mcpServers).toHaveProperty("test-server");
});

test("full workflow: init → collect → validate → diff → sync", async () => {
  await init(testDir);

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, "claude_desktop_config.json"),
    JSON.stringify({
      mcpServers: {
        "existing-server": {
          command: "node",
          args: ["server.js"],
        },
        taal: {
          command: "bunx",
          args: ["--bun", "taal-mcp"],
        },
      },
    })
  );

  const collectResult = await collect(testDir);
  expect(collectResult.servers).toHaveProperty("existing-server");

  const configPath = join(testDir, ".taal", "config.yaml");
  let config = await readFile(configPath, "utf-8");
  const parsedConfig = YAML.parse(config) as Record<string, unknown>;
  const mcpSection =
    (parsedConfig.mcp as Record<string, unknown> | undefined) || {};
  mcpSection["existing-server"] = {
    command: "node",
    args: ["server.js"],
  };
  parsedConfig.mcp = mcpSection;
  await writeFile(configPath, YAML.stringify(parsedConfig));

  const validateResult = await validate(testDir);
  expect(validateResult.valid).toBe(true);

  const diffResult = await diff(testDir);
  expect(diffResult.hasChanges).toBe(false);

  config = await readFile(configPath, "utf-8");
  const updatedParsedConfig = YAML.parse(config) as Record<string, unknown>;
  const updatedMcpSection =
    (updatedParsedConfig.mcp as Record<string, unknown> | undefined) || {};
  updatedMcpSection["new-server"] = {
    command: "node",
    args: ["new-server.js"],
  };
  updatedParsedConfig.mcp = updatedMcpSection;

  await writeFile(configPath, YAML.stringify(updatedParsedConfig));

  const diffResult2 = await diff(testDir);
  expect(diffResult2.hasChanges).toBe(true);
  expect(
    diffResult2.changes.some(
      (c) => c.type === "add" && c.serverName === "new-server"
    )
  ).toBe(true);

  const syncResult = await sync(testDir);
  expect(syncResult.success).toBe(true);
});

test("workflow with skills: init → add skill → sync", async () => {
  await init(testDir);

  const skillDir = join(testDir, ".taal", "skills", "test-skill");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    "---\nname: Test Skill\n---\n\nTest skill content"
  );

  const configPath = join(testDir, ".taal", "config.yaml");
  const config = `
version: "1"

mcp: {}

skills:
  paths:
    - ${testDir}/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(configPath, config);

  const listResult = await list(testDir);
  expect(listResult.skills.length).toBeGreaterThan(0);
  expect(listResult.skills.some((s) => s.name === "Test Skill")).toBe(true);

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, "claude_desktop_config.json"), "{}");

  await sync(testDir);

  const skillPath = join(
    testDir,
    ".claude",
    "skills",
    "test-skill",
    "SKILL.md"
  );
  expect(await exists(skillPath)).toBe(true);
});

test("error handling: missing config file", async () => {
  const validateResult = await validate(testDir);
  expect(validateResult.valid).toBe(false);
  expect(validateResult.errors).toContain("Config file not found");

  const diffResult = await diff(testDir);
  expect(diffResult.error).toBeDefined();

  const syncResult = await sync(testDir);
  expect(syncResult.success).toBe(false);
  expect(syncResult.error).toBeDefined();

  const listResult = await list(testDir);
  expect(listResult.error).toBeDefined();
});

test("error handling: invalid YAML", async () => {
  await init(testDir);

  const configPath = join(testDir, ".taal", "config.yaml");
  await writeFile(configPath, "invalid: yaml: [[[");

  const validateResult = await validate(testDir);
  expect(validateResult.valid).toBe(false);
  expect(
    validateResult.errors.some((e) => e.includes("YAML") || e.includes("parse"))
  ).toBe(true);
});

test("error handling: invalid config schema", async () => {
  await init(testDir);

  const configPath = join(testDir, ".taal", "config.yaml");
  const invalidConfig = `
version: "999"

mcp:
  test-server:
    invalid_field: true
`;

  await writeFile(configPath, invalidConfig);

  const validateResult = await validate(testDir);
  expect(validateResult.valid).toBe(false);
  expect(validateResult.errors.length).toBeGreaterThan(0);
});

test("providers command shows all providers", async () => {
  const providersResult = await providers(testDir);

  expect(providersResult.providers).toHaveLength(9);
  expect(
    providersResult.providers.some((p) => p.name === "claude-desktop")
  ).toBe(true);
  expect(providersResult.providers.some((p) => p.name === "claude-code")).toBe(
    true
  );
  expect(providersResult.providers.some((p) => p.name === "cursor")).toBe(true);
  expect(providersResult.providers.some((p) => p.name === "continue")).toBe(
    true
  );
  expect(providersResult.providers.some((p) => p.name === "zed")).toBe(true);
  expect(providersResult.providers.some((p) => p.name === "opencode")).toBe(
    true
  );
  expect(providersResult.providers.some((p) => p.name === "codex")).toBe(true);
  expect(providersResult.providers.some((p) => p.name === "windsurf")).toBe(
    true
  );
  expect(providersResult.providers.some((p) => p.name === "antigravity")).toBe(
    true
  );
});

test("sync creates backups before writing", async () => {
  await init(testDir);

  const config = `
version: "1"

mcp:
  test-server:
    command: npx

skills:
  paths: []

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, ".taal", "config.yaml"), config);

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  const configPath = join(claudeDir, "claude_desktop_config.json");
  await writeFile(configPath, JSON.stringify({ existing: "data" }));

  await sync(testDir);

  const backupDir = join(testDir, ".taal", "backups");
  expect(await exists(backupDir)).toBe(true);
});

test("platform-specific paths: macOS", async () => {
  await init(testDir);

  const providersResult = await providers(testDir);

  const claudeProvider = providersResult.providers.find(
    (p) => p.name === "claude-desktop"
  );
  expect(claudeProvider?.configPath).toContain("Library/Application Support");
});

test("platform-specific paths: Linux simulation", async () => {
  const linuxTestDir = join(testDir, "home", "user");
  await mkdir(linuxTestDir, { recursive: true });

  await init(linuxTestDir);

  const configPath = join(linuxTestDir, ".taal", "config.yaml");
  expect(await exists(configPath)).toBe(true);
});
