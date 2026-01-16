import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ProviderRegistry } from "../../src/providers/registry.js";
import type { Provider } from "../../src/providers/types.js";
import {
  readJsonConfig,
  readTomlConfig,
  readYamlConfig,
  resolveConfigPath,
} from "../../src/providers/utils.js";
import { atomicWrite } from "../../src/utils/atomic-write.js";
import { backupConfig } from "../../src/utils/backup.js";

const TEST_DIR = "/tmp/taal-test-providers";

describe("atomicWrite", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should write content to file", () => {
    const filePath = join(TEST_DIR, "test.txt");
    atomicWrite(filePath, "test content");

    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("test content");
  });

  it("should create parent directory if missing", () => {
    const filePath = join(TEST_DIR, "nested", "dir", "test.txt");
    atomicWrite(filePath, "test content");

    expect(existsSync(filePath)).toBe(true);
  });

  it("should overwrite existing file", () => {
    const filePath = join(TEST_DIR, "test.txt");
    writeFileSync(filePath, "old content");

    atomicWrite(filePath, "new content");

    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("new content");
  });

  it("should not leave temp files on success", () => {
    const filePath = join(TEST_DIR, "test.txt");
    atomicWrite(filePath, "test content");

    // Check no .tmp files exist by reading directory
    const fs = require("node:fs");
    const files = fs.readdirSync(TEST_DIR);
    const hasTempFiles = files.some((f: string) => f.includes(".tmp"));
    expect(hasTempFiles).toBe(false);
  });
});

describe("backupConfig", () => {
  const backupDir = join(homedir(), ".taal", "backups");

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    // Clean up backup directory
    if (existsSync(backupDir)) {
      rmSync(backupDir, { recursive: true, force: true });
    }
  });

  it("should create backup of existing file", () => {
    const filePath = join(TEST_DIR, "config.json");
    writeFileSync(filePath, '{"test": true}');

    const backupPath = backupConfig(filePath);

    expect(backupPath).not.toBeNull();
    expect(existsSync(backupPath!)).toBe(true);
    expect(backupPath).toContain(".taal/backups");
    expect(backupPath).toContain("config.json");
  });

  it("should return null if source file does not exist", () => {
    const filePath = join(TEST_DIR, "nonexistent.json");
    const backupPath = backupConfig(filePath);

    expect(backupPath).toBeNull();
  });

  it("should create timestamped backup filename", () => {
    const filePath = join(TEST_DIR, "config.json");
    writeFileSync(filePath, '{"test": true}');

    const backupPath = backupConfig(filePath);

    expect(backupPath).toMatch(/config\.json\.\d{4}-\d{2}-\d{2}T.*\.backup$/);
  });

  it("should preserve file content in backup", () => {
    const filePath = join(TEST_DIR, "config.json");
    const content = '{"test": true, "value": 123}';
    writeFileSync(filePath, content);

    const backupPath = backupConfig(filePath);
    const backupContent = readFileSync(backupPath!, "utf-8");

    expect(backupContent).toBe(content);
  });
});

describe("readJsonConfig", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read valid JSON file", () => {
    const filePath = join(TEST_DIR, "config.json");
    writeFileSync(filePath, '{"key": "value", "number": 123}');

    const config = readJsonConfig(filePath);
    expect(config).toEqual({ key: "value", number: 123 });
  });

  it("should return empty object if file does not exist", () => {
    const filePath = join(TEST_DIR, "nonexistent.json");
    const config = readJsonConfig(filePath);

    expect(config).toEqual({});
  });

  it("should handle invalid JSON gracefully (JSONC parser returns empty object)", () => {
    const filePath = join(TEST_DIR, "invalid.json");
    writeFileSync(filePath, "{invalid json}");

    const config = readJsonConfig(filePath);
    expect(config).toEqual({});
  });
});

describe("readYamlConfig", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read valid YAML file", () => {
    const filePath = join(TEST_DIR, "config.yaml");
    writeFileSync(filePath, "key: value\nnumber: 123");

    const config = readYamlConfig(filePath);
    expect(config).toEqual({ key: "value", number: 123 });
  });

  it("should return empty object if file does not exist", () => {
    const filePath = join(TEST_DIR, "nonexistent.yaml");
    const config = readYamlConfig(filePath);

    expect(config).toEqual({});
  });
});

describe("readTomlConfig", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should read valid TOML file", () => {
    const filePath = join(TEST_DIR, "config.toml");
    writeFileSync(filePath, 'key = "value"\nnumber = 123');

    const config = readTomlConfig(filePath);
    expect(config).toEqual({ key: "value", number: 123 });
  });

  it("should return empty object if file does not exist", () => {
    const filePath = join(TEST_DIR, "nonexistent.toml");
    const config = readTomlConfig(filePath);

    expect(config).toEqual({});
  });
});

describe("resolveConfigPath", () => {
  it("should return string path as-is", () => {
    const path = "/path/to/config.json";
    const resolved = resolveConfigPath(path, "/home/user");

    expect(resolved).toBe(path);
  });

  it("should call function with home directory", () => {
    const pathFn = (home: string) => `${home}/.config/app/config.json`;
    const resolved = resolveConfigPath(pathFn, "/home/user");

    expect(resolved).toBe("/home/user/.config/app/config.json");
  });
});

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("should register a provider", () => {
    const mockProvider: Provider = {
      name: "test-provider",
      configPath: "/test/config.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    registry.register(mockProvider);

    expect(registry.has("test-provider")).toBe(true);
    expect(registry.get("test-provider")).toBe(mockProvider);
  });

  it("should get all registered providers", () => {
    const provider1: Provider = {
      name: "provider-1",
      configPath: "/test/config1.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    const provider2: Provider = {
      name: "provider-2",
      configPath: "/test/config2.json",
      format: "yaml",
      mcpKey: "context_servers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    registry.register(provider1);
    registry.register(provider2);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(provider1);
    expect(all).toContain(provider2);
  });

  it("should get all provider names", () => {
    const provider1: Provider = {
      name: "provider-1",
      configPath: "/test/config1.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    const provider2: Provider = {
      name: "provider-2",
      configPath: "/test/config2.json",
      format: "yaml",
      mcpKey: "context_servers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    registry.register(provider1);
    registry.register(provider2);

    const names = registry.getNames();
    expect(names).toEqual(["provider-1", "provider-2"]);
  });

  it("should filter installed providers", async () => {
    const installedProvider: Provider = {
      name: "installed",
      configPath: "/test/config1.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    const notInstalledProvider: Provider = {
      name: "not-installed",
      configPath: "/test/config2.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => false,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    registry.register(installedProvider);
    registry.register(notInstalledProvider);

    const installed = await registry.getInstalled();
    expect(installed).toHaveLength(1);
    expect(installed[0].name).toBe("installed");
  });

  it("should clear all providers", () => {
    const mockProvider: Provider = {
      name: "test-provider",
      configPath: "/test/config.json",
      format: "json",
      mcpKey: "mcpServers",
      isInstalled: async () => true,
      readConfig: async () => ({}),
      writeConfig: async () => {},
      transformMcpServers: () => ({}),
    };

    registry.register(mockProvider);
    expect(registry.has("test-provider")).toBe(true);

    registry.clear();
    expect(registry.has("test-provider")).toBe(false);
    expect(registry.getAll()).toHaveLength(0);
  });
});
