import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile, exists } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sync } from '../../src/commands/sync';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(join(testDir, '.taal'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('sync writes config to installed providers', async () => {
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
  await writeFile(join(claudeDir, 'claude_desktop_config.json'), '{}');
  
  const result = await sync(testDir);
  
  expect(result.success).toBe(true);
  expect(result.synced.length).toBeGreaterThan(0);
  
  const claudeConfig = JSON.parse(
    await readFile(join(claudeDir, 'claude_desktop_config.json'), 'utf-8')
  );
  
  expect(claudeConfig.mcpServers).toHaveProperty('test-server');
});

test('sync creates backup before writing', async () => {
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
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  const configPath = join(claudeDir, 'claude_desktop_config.json');
  await writeFile(configPath, JSON.stringify({ existing: 'data' }));
  
  await sync(testDir);
  
  const backupDir = join(testDir, '.taal', 'backups');
  const backupFiles = await readFile(backupDir, 'utf-8').catch(() => null);
  
  expect(await exists(backupDir)).toBe(true);
});

test('sync supports single provider filter', async () => {
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
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, 'claude_desktop_config.json'), '{}');
  
  const result = await sync(testDir, 'claude-desktop');
  
  expect(result.synced).toHaveLength(1);
  expect(result.synced[0]).toBe('claude-desktop');
});

test('sync continues on failure and reports summary', async () => {
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
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, 'claude_desktop_config.json'), '{}');
  
  const result = await sync(testDir);
  
  expect(result.synced.length + result.failed.length).toBeGreaterThan(0);
});

test('sync skips disabled providers', async () => {
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
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), config);
  
  const cursorDir = join(testDir, 'Library', 'Application Support', 'Cursor', 'User');
  await mkdir(cursorDir, { recursive: true });
  await writeFile(join(cursorDir, 'settings.json'), '{}');
  
  const result = await sync(testDir);
  
  expect(result.synced.includes('cursor')).toBe(false);
});

test('sync copies skills to provider directories', async () => {
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
    '---\nname: Test Skill\n---\n\nTest content'
  );
  
  const claudeDir = join(testDir, 'Library', 'Application Support', 'Claude');
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, 'claude_desktop_config.json'), '{}');
  
  await sync(testDir);
  
  const skillsPath = join(testDir, '.claude', 'skills', 'test-skill', 'SKILL.md');
  expect(await exists(skillsPath)).toBe(true);
});

test('sync returns error for missing config', async () => {
  const result = await sync(testDir);
  
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});
