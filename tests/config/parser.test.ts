import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { loadConfig } from '../../src/config/parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/taal-test-parser';

describe('loadConfig', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });
  
  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });
  
  it('should load valid minimal YAML config', () => {
    const configPath = join(TEST_DIR, 'minimal.yaml');
    writeFileSync(configPath, `
version: "1"
`);
    
    const config = loadConfig(configPath);
    expect(config.version).toBe('1');
    expect(config.mcp).toBeUndefined();
    expect(config.skills).toBeUndefined();
    expect(config.providers).toBeUndefined();
  });
  
  it('should load valid full YAML config', () => {
    const configPath = join(TEST_DIR, 'full.yaml');
    writeFileSync(configPath, `
version: "1"

mcp:
  filesystem:
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem"
      - "/tmp"
    env:
      LOG_LEVEL: debug
  
  context7:
    url: https://mcp.context7.com/mcp
    headers:
      CONTEXT7_API_KEY: key123

skills:
  paths:
    - ~/.taal/skills
    - ./project-skills

providers:
  enabled:
    - claude-desktop
    - cursor
    - zed
`);
    
    const config = loadConfig(configPath);
    expect(config.version).toBe('1');
    expect(config.mcp?.filesystem.command).toBe('npx');
    expect(config.mcp?.filesystem.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem', '/tmp']);
    expect(config.mcp?.context7.url).toBe('https://mcp.context7.com/mcp');
    expect(config.skills?.paths).toEqual(['~/.taal/skills', './project-skills']);
    expect(config.providers?.enabled).toEqual(['claude-desktop', 'cursor', 'zed']);
  });
  
  it('should substitute environment variables', () => {
    const originalEnv = process.env;
    process.env = { ...originalEnv, TEST_API_KEY: 'secret-key-123' };
    
    const configPath = join(TEST_DIR, 'with-env.yaml');
    writeFileSync(configPath, `
version: "1"

mcp:
  test-server:
    url: https://example.com
    headers:
      Authorization: "Bearer \${TEST_API_KEY}"
`);
    
    const config = loadConfig(configPath);
    expect(config.mcp?.['test-server'].headers?.Authorization).toBe('Bearer secret-key-123');
    
    process.env = originalEnv;
  });
  
  it('should throw on non-existent file', () => {
    const configPath = join(TEST_DIR, 'does-not-exist.yaml');
    
    expect(() => loadConfig(configPath)).toThrow(/Failed to read config file/);
  });
  
  it('should throw on invalid YAML syntax', () => {
    const configPath = join(TEST_DIR, 'invalid.yaml');
    writeFileSync(configPath, `
version: "1"
mcp:
  invalid: yaml: syntax: here:
`);
    
    expect(() => loadConfig(configPath)).toThrow(/Failed to parse YAML/);
  });
  
  it('should throw on schema validation failure - invalid version', () => {
    const configPath = join(TEST_DIR, 'bad-version.yaml');
    writeFileSync(configPath, `
version: "2"
`);
    
    expect(() => loadConfig(configPath)).toThrow(/Config validation failed/);
  });
  
  it('should throw on schema validation failure - missing version', () => {
    const configPath = join(TEST_DIR, 'no-version.yaml');
    writeFileSync(configPath, `
mcp:
  test: {}
`);
    
    expect(() => loadConfig(configPath)).toThrow(/Config validation failed/);
  });
  
  it('should throw on schema validation failure - server with both command and url', () => {
    const configPath = join(TEST_DIR, 'invalid-server.yaml');
    writeFileSync(configPath, `
version: "1"

mcp:
  bad-server:
    command: npx
    url: https://example.com
`);
    
    expect(() => loadConfig(configPath)).toThrow(/Config validation failed/);
    expect(() => loadConfig(configPath)).toThrow(/stdio \(command\) or http \(url\)/);
  });
  
  it('should handle YAML with comments', () => {
    const configPath = join(TEST_DIR, 'with-comments.yaml');
    writeFileSync(configPath, `
# TAAL Configuration
version: "1"

# MCP Servers
mcp:
  # Filesystem server
  filesystem:
    command: npx
    args: ["-y", "package"]
`);
    
    const config = loadConfig(configPath);
    expect(config.version).toBe('1');
    expect(config.mcp?.filesystem.command).toBe('npx');
  });
  
  it('should handle empty YAML file', () => {
    const configPath = join(TEST_DIR, 'empty.yaml');
    writeFileSync(configPath, '');
    
    expect(() => loadConfig(configPath)).toThrow(/Config validation failed/);
  });
  
  it('should handle YAML with only whitespace', () => {
    const configPath = join(TEST_DIR, 'whitespace.yaml');
    writeFileSync(configPath, '   \n\n   \n');
    
    expect(() => loadConfig(configPath)).toThrow(/Config validation failed/);
  });
});
