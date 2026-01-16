import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { list } from '../../src/commands/list';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(join(testDir, '.taal'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('list shows configured MCP servers', async () => {
  const config = `
version: "1"

mcp:
  server-1:
    command: npx
    args: ["-y", "@test/server"]
  server-2:
    url: https://example.com/mcp

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const result = await list(testDir);
  
  expect(result.servers).toHaveLength(2);
  expect(result.servers.some(s => s.name === 'server-1')).toBe(true);
  expect(result.servers.some(s => s.name === 'server-2')).toBe(true);
});

test('list shows server types (stdio vs http)', async () => {
  const config = `
version: "1"

mcp:
  stdio-server:
    command: npx
  http-server:
    url: https://example.com

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const result = await list(testDir);
  
  const stdioServer = result.servers.find(s => s.name === 'stdio-server');
  const httpServer = result.servers.find(s => s.name === 'http-server');
  
  expect(stdioServer?.type).toBe('stdio');
  expect(httpServer?.type).toBe('http');
});

test('list shows discovered skills', async () => {
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

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const skillDir = join(testDir, '.taal', 'skills', 'test-skill');
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, 'SKILL.md'),
    '---\nname: Test Skill\n---\n\nContent'
  );
  
  const result = await list(testDir);
  
  expect(result.skills.length).toBeGreaterThan(0);
  expect(result.skills.some(s => s.name === 'Test Skill')).toBe(true);
});

test('list shows which providers are enabled', async () => {
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
  
  const result = await list(testDir);
  
  expect(result.enabledProviders).toContain('claude-desktop');
  expect(result.enabledProviders).toContain('cursor');
});

test('list returns error for missing config', async () => {
  const result = await list(testDir);
  
  expect(result.error).toBeDefined();
});

test('list handles empty config', async () => {
  const config = `
version: "1"

mcp: {}

skills:
  paths: []

providers:
  enabled: []
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const result = await list(testDir);
  
  expect(result.servers).toHaveLength(0);
  expect(result.skills).toHaveLength(0);
});
