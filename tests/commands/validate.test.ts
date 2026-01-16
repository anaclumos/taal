import { test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate } from '../../src/commands/validate';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `taal-test-${Date.now()}`);
  await mkdir(join(testDir, '.taal'), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('validate returns success for valid config', async () => {
  const validConfig = `
version: "1"

mcp:
  test-server:
    command: npx
    args: ["-y", "@test/server"]
    env:
      KEY: value

skills:
  paths:
    - ~/.taal/skills

providers:
  enabled:
    - claude-desktop
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), validConfig);
  
  const result = await validate(testDir);
  
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test('validate returns errors for invalid config', async () => {
  const invalidConfig = `
version: "2"
mcp:
  test-server:
    invalid: true
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), invalidConfig);
  
  const result = await validate(testDir);
  
  expect(result.valid).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('validate detects missing config file', async () => {
  const result = await validate(testDir);
  
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Config file not found');
});

test('validate detects undefined environment variables', async () => {
  const configWithEnv = `
version: "1"

mcp:
  test-server:
    command: npx
    args: ["-y", "@test/server"]
    env:
      UNDEFINED_VAR: "\${UNDEFINED_VAR_12345}"
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), configWithEnv);
  
  const result = await validate(testDir);
  
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.warnings.some(w => w.includes('UNDEFINED_VAR_12345'))).toBe(true);
});

test('validate detects mutual exclusivity violations', async () => {
  const invalidConfig = `
version: "1"

mcp:
  test-server:
    command: npx
    url: https://example.com
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), invalidConfig);
  
  const result = await validate(testDir);
  
  expect(result.valid).toBe(false);
});

test('validate handles malformed YAML', async () => {
  const malformedYaml = `
version: "1"
mcp:
  test-server:
    command: npx
  invalid yaml here [[[
`;

  await writeFile(join(testDir, '.taal', 'config.yaml'), malformedYaml);
  
  const result = await validate(testDir);
  
  expect(result.valid).toBe(false);
  expect(result.errors.some(e => e.includes('YAML') || e.includes('parse'))).toBe(true);
});
