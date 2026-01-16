import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { platform, tmpdir } from "node:os";
import { join } from "node:path";
import { collect } from "../../src/commands/collect";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("collect imports from Claude Desktop", async () => {
  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });

  const claudeConfig = {
    mcpServers: {
      "test-server": {
        command: "npx",
        args: ["-y", "@test/server"],
        env: { KEY: "value" },
      },
    },
  };

  await writeFile(
    join(claudeDir, "claude_desktop_config.json"),
    JSON.stringify(claudeConfig, null, 2)
  );

  const result = await collect(testDir);

  expect(result.servers).toHaveProperty("test-server");
  expect(result.servers["test-server"].command).toBe("npx");
});

test("collect imports from Cursor", async () => {
  const os = platform();
  const cursorDir =
    os === "darwin"
      ? join(testDir, "Library", "Application Support", "Cursor", "User")
      : join(testDir, ".config", "Cursor", "User");
  await mkdir(cursorDir, { recursive: true });

  const cursorConfig = {
    mcpServers: {
      "cursor-server": {
        command: "node",
        args: ["server.js"],
      },
    },
  };

  await writeFile(
    join(cursorDir, "settings.json"),
    JSON.stringify(cursorConfig, null, 2)
  );

  const result = await collect(testDir);

  expect(result.servers).toHaveProperty("cursor-server");
});

test("collect merges servers from multiple providers", async () => {
  const os = platform();

  // Claude
  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, "claude_desktop_config.json"),
    JSON.stringify({
      mcpServers: {
        "server-1": { command: "cmd1", args: [] },
      },
    })
  );

  // Cursor
  const cursorDir =
    os === "darwin"
      ? join(testDir, "Library", "Application Support", "Cursor", "User")
      : join(testDir, ".config", "Cursor", "User");
  await mkdir(cursorDir, { recursive: true });
  await writeFile(
    join(cursorDir, "settings.json"),
    JSON.stringify({
      mcpServers: {
        "server-2": { command: "cmd2", args: [] },
      },
    })
  );

  const result = await collect(testDir);

  expect(result.servers).toHaveProperty("server-1");
  expect(result.servers).toHaveProperty("server-2");
});

test("collect warns on duplicate server names with different configs", async () => {
  const os = platform();

  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, "claude_desktop_config.json"),
    JSON.stringify({
      mcpServers: {
        "same-server": { command: "cmd1", args: [] },
      },
    })
  );

  const cursorDir =
    os === "darwin"
      ? join(testDir, "Library", "Application Support", "Cursor", "User")
      : join(testDir, ".config", "Cursor", "User");
  await mkdir(cursorDir, { recursive: true });
  await writeFile(
    join(cursorDir, "settings.json"),
    JSON.stringify({
      mcpServers: {
        "same-server": { command: "cmd2", args: [] },
      },
    })
  );

  const result = await collect(testDir);

  expect(result.conflicts).toHaveLength(1);
  expect(result.conflicts[0].serverName).toBe("same-server");
});

test("collect skips providers without configs", async () => {
  const result = await collect(testDir);

  expect(Object.keys(result.servers)).toHaveLength(0);
  expect(result.conflicts).toHaveLength(0);
});

test("collect returns summary of imported servers", async () => {
  const claudeDir = join(testDir, "Library", "Application Support", "Claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, "claude_desktop_config.json"),
    JSON.stringify({
      mcpServers: {
        "server-1": { command: "cmd1", args: [] },
        "server-2": { command: "cmd2", args: [] },
      },
    })
  );

  const result = await collect(testDir);

  expect(result.summary.totalServers).toBe(2);
  expect(result.summary.providersScanned).toBeGreaterThan(0);
});
