import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, exists, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { init } from '../../src/commands/init';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('init creates .taal directory', async () => {
  await init(testDir);
  
  const taalDir = join(testDir, '.taal');
  expect(await exists(taalDir)).toBe(true);
});

test('init creates config.yaml with sample content', async () => {
  await init(testDir);
  
  const configPath = join(testDir, '.taal', 'config.yaml');
  expect(await exists(configPath)).toBe(true);
  
  const content = await readFile(configPath, 'utf-8');
  expect(content).toContain('version: "1"');
  expect(content).toContain('mcp:');
  expect(content).toContain('skills:');
  expect(content).toContain('providers:');
});

test('init creates skills directory', async () => {
  await init(testDir);
  
  const skillsDir = join(testDir, '.taal', 'skills');
  expect(await exists(skillsDir)).toBe(true);
});

test('init throws error if config already exists', async () => {
  await init(testDir);
  
  await expect(init(testDir)).rejects.toThrow('already initialized');
});

test('init with force flag overwrites existing config', async () => {
  await init(testDir);
  
  const configPath = join(testDir, '.taal', 'config.yaml');
  const originalContent = await readFile(configPath, 'utf-8');
  
  await init(testDir, { force: true });
  
  const newContent = await readFile(configPath, 'utf-8');
  expect(newContent).toBe(originalContent); // Same template
});

test('init creates backups directory', async () => {
  await init(testDir);
  
  const backupsDir = join(testDir, '.taal', 'backups');
  expect(await exists(backupsDir)).toBe(true);
});
