import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { McpServer } from "../../src/config/schema.js";
import { ClaudeCodeProvider } from "../../src/providers/claude-code.js";
import { ClaudeDesktopProvider } from "../../src/providers/claude-desktop.js";

const TEST_DIR = "/tmp/taal-test-claude";

describe("ClaudeDesktopProvider", () => {
  let provider: ClaudeDesktopProvider;

  beforeEach(() => {
    provider = new ClaudeDesktopProvider();
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should have correct metadata", () => {
    expect(provider.name).toBe("claude-desktop");
    expect(provider.format).toBe("json");
    expect(provider.mcpKey).toBe("mcpServers");
  });

  it("should resolve config path correctly", () => {
    const home = "/Users/testuser";
    const path =
      typeof provider.configPath === "function"
        ? provider.configPath(home)
        : provider.configPath;

    expect(path).toBe(
      "/Users/testuser/Library/Application Support/Claude/claude_desktop_config.json"
    );
  });

  it("should resolve skills path correctly", () => {
    const home = "/Users/testuser";
    const path =
      typeof provider.skillsPath === "function"
        ? provider.skillsPath(home)
        : provider.skillsPath;

    expect(path).toBe("/Users/testuser/.claude/skills");
  });

  it("should transform stdio servers correctly", () => {
    const servers: Record<string, McpServer> = {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { LOG_LEVEL: "debug" },
      },
      "another-server": {
        command: "node",
        args: ["server.js"],
      },
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { LOG_LEVEL: "debug" },
      },
      "another-server": {
        command: "node",
        args: ["server.js"],
      },
    });
  });

  it("should skip HTTP servers with warning", () => {
    const servers: Record<string, McpServer> = {
      "stdio-server": {
        command: "npx",
        args: ["-y", "package"],
      },
      "http-server": {
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer token" },
      },
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      "stdio-server": {
        command: "npx",
        args: ["-y", "package"],
      },
    });
    expect(Object.keys(result)).not.toContain("http-server");
  });

  it("should skip servers without command", () => {
    const servers: Record<string, McpServer> = {
      "valid-server": {
        command: "npx",
        args: ["-y", "package"],
      },
      "invalid-server": {
        args: ["test"],
        env: { KEY: "value" },
      } as any,
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      "valid-server": {
        command: "npx",
        args: ["-y", "package"],
      },
    });
  });

  it("should handle servers with only command (no args or env)", () => {
    const servers: Record<string, McpServer> = {
      "simple-server": {
        command: "some-binary",
      },
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      "simple-server": {
        command: "some-binary",
      },
    });
  });

  it("should read config from file", async () => {
    const testHome = TEST_DIR;
    const configDir = join(
      testHome,
      "Library",
      "Application Support",
      "Claude"
    );
    mkdirSync(configDir, { recursive: true });

    const configPath = join(configDir, "claude_desktop_config.json");
    const configData = {
      mcpServers: {
        "test-server": {
          command: "npx",
          args: ["-y", "package"],
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(configData, null, 2));

    provider.configPath = configPath;
    const config = await provider.readConfig();

    expect(config).toEqual(configData);
  });

  it("should write config to file", async () => {
    const testHome = TEST_DIR;
    const configDir = join(
      testHome,
      "Library",
      "Application Support",
      "Claude"
    );
    mkdirSync(configDir, { recursive: true });

    const configPath = join(configDir, "claude_desktop_config.json");
    provider.configPath = configPath;

    const configData = {
      mcpServers: {
        "new-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await provider.writeConfig(configData);

    expect(existsSync(configPath)).toBe(true);
    const written = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(written).toEqual(configData);
  });
});

describe("ClaudeCodeProvider", () => {
  let provider: ClaudeCodeProvider;

  beforeEach(() => {
    provider = new ClaudeCodeProvider();
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should have correct metadata", () => {
    expect(provider.name).toBe("claude-code");
    expect(provider.format).toBe("json");
    expect(provider.mcpKey).toBe("mcpServers");
  });

  it("should resolve config path correctly", () => {
    const home = "/Users/testuser";
    const path =
      typeof provider.configPath === "function"
        ? provider.configPath(home)
        : provider.configPath;

    expect(path).toBe("/Users/testuser/.claude/settings.json");
  });

  it("should resolve skills path correctly", () => {
    const home = "/Users/testuser";
    const path =
      typeof provider.skillsPath === "function"
        ? provider.skillsPath(home)
        : provider.skillsPath;

    expect(path).toBe("/Users/testuser/.claude/skills");
  });

  it("should transform stdio servers correctly", () => {
    const servers: Record<string, McpServer> = {
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { LOG_LEVEL: "debug" },
      },
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      filesystem: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        env: { LOG_LEVEL: "debug" },
      },
    });
  });

  it("should skip HTTP servers with warning", () => {
    const servers: Record<string, McpServer> = {
      "stdio-server": {
        command: "npx",
        args: ["-y", "package"],
      },
      "http-server": {
        url: "https://example.com/mcp",
        headers: { Authorization: "Bearer token" },
      },
    };

    const result = provider.transformMcpServers(servers);

    expect(result).toEqual({
      "stdio-server": {
        command: "npx",
        args: ["-y", "package"],
      },
    });
    expect(Object.keys(result)).not.toContain("http-server");
  });

  it("should read config from file", async () => {
    const testHome = TEST_DIR;
    const configDir = join(testHome, ".claude");
    mkdirSync(configDir, { recursive: true });

    const configPath = join(configDir, "settings.json");
    const configData = {
      mcpServers: {
        "test-server": {
          command: "npx",
          args: ["-y", "package"],
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(configData, null, 2));

    provider.configPath = configPath;
    const config = await provider.readConfig();

    expect(config).toEqual(configData);
  });

  it("should write config to file", async () => {
    const testHome = TEST_DIR;
    const configDir = join(testHome, ".claude");
    mkdirSync(configDir, { recursive: true });

    const configPath = join(configDir, "settings.json");
    provider.configPath = configPath;

    const configData = {
      mcpServers: {
        "new-server": {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await provider.writeConfig(configData);

    expect(existsSync(configPath)).toBe(true);
    const written = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(written).toEqual(configData);
  });
});
