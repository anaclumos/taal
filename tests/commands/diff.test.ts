import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diff } from '../../src/commands/diff';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(join(testDir, '.taal'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('diff shows no changes when configs match', async () => {
  const config = `
version: "1"

mcp:
  test-server:
    command: npx
    args: ["-y", "@test/server"]

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, 'claude_desktop_config.json'),
    JSON.stringify({
      mcpServers: {
        'test-server': {
          command: 'npx',
          args: ['-y', '@test/server']
        }
      }
    }, null, 2)
  );
  
  const result = await diff(testDir);
  
  expect(result.hasChanges).toBe(false);
  expect(result.changes).toHaveLength(0);
});

test('diff detects new servers to add', async () => {
  const config = `
version: "1"

mcp:
  new-server:
    command: node
    args: ["server.js"]

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, 'claude_desktop_config.json'),
    JSON.stringify({ mcpServers: {} }, null, 2)
  );
  
  const result = await diff(testDir);
  
  expect(result.hasChanges).toBe(true);
  expect(result.changes.length).toBeGreaterThan(0);
  expect(result.changes[0].type).toBe('add');
});

test('diff detects servers to remove', async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, 'claude_desktop_config.json'),
    JSON.stringify({
      mcpServers: {
        'old-server': {
          command: 'npx',
          args: ['-y', '@old/server']
        }
      }
    }, null, 2)
  );
  
  const result = await diff(testDir);
  
  expect(result.hasChanges).toBe(true);
  expect(result.changes.some(c => c.type === 'remove')).toBe(true);
});

test('diff detects modified servers', async () => {
  const config = `
version: "1"

mcp:
  test-server:
    command: node
    args: ["new-server.js"]

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(
    join(claudeDir, 'claude_desktop_config.json'),
    JSON.stringify({
      mcpServers: {
        'test-server': {
          command: 'npx',
          args: ['-y', '@test/server']
        }
      }
    }, null, 2)
  );
  
  const result = await diff(testDir);
  
  expect(result.hasChanges).toBe(true);
  expect(result.changes.some(c => c.type === 'modify')).toBe(true);
});

test('diff supports single provider filter', async () => {
  const config = `
version: "1"

mcp:
  test-server:
    command: npx

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
    - cursor
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const result = await diff(testDir, 'claude-desktop');
  
  expect(result.provider).toBe('claude-desktop');
});

test('diff returns error for missing config', async () => {
  const result = await diff(testDir);
  
  expect(result.error).toBeDefined();
});
