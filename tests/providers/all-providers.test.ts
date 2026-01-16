import { describe, it, expect } from 'bun:test';
import { CursorProvider } from '../../src/providers/cursor.js';
import { ContinueProvider } from '../../src/providers/continue.js';
import { ZedProvider } from '../../src/providers/zed.js';
import { OpenCodeProvider } from '../../src/providers/opencode.js';
import { CodexProvider } from '../../src/providers/codex.js';
import { WindsurfProvider } from '../../src/providers/windsurf.js';
import { AntigravityProvider } from '../../src/providers/antigravity.js';
import type { McpServer } from '../../src/config/schema.js';

describe('CursorProvider', () => {
  const provider = new CursorProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('cursor');
    expect(provider.format).toBe('json');
    expect(provider.mcpKey).toBe('mcpServers');
  });
  
  it('should transform stdio servers correctly', () => {
    const servers: Record<string, McpServer> = {
      'test': { command: 'npx', args: ['-y', 'package'] },
    };
    const result = provider.transformMcpServers(servers);
    expect(result).toEqual({
      'test': { command: 'npx', args: ['-y', 'package'] },
    });
  });
});

describe('ContinueProvider', () => {
  const provider = new ContinueProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('continue');
    expect(provider.format).toBe('yaml');
    expect(provider.mcpKey).toBe('mcpServers');
  });
  
  it('should transform servers to array format', () => {
    const servers: Record<string, McpServer> = {
      'test': { command: 'npx', args: ['-y', 'package'], env: { KEY: '${VAR}' } },
    };
    const result = provider.transformMcpServers(servers) as any[];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('test');
    expect(result[0].env.KEY).toBe('${{ secrets.VAR }}');
  });
  
  it('should support HTTP servers', () => {
    const servers: Record<string, McpServer> = {
      'http-server': { url: 'https://example.com', headers: { AUTH: '${TOKEN}' } },
    };
    const result = provider.transformMcpServers(servers) as any[];
    expect(result[0].url).toBe('https://example.com');
    expect(result[0].headers.AUTH).toBe('${{ secrets.TOKEN }}');
  });
});

describe('ZedProvider', () => {
  const provider = new ZedProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('zed');
    expect(provider.format).toBe('json');
    expect(provider.mcpKey).toBe('context_servers');
  });
  
  it('should support both stdio and HTTP servers', () => {
    const servers: Record<string, McpServer> = {
      'stdio': { command: 'npx', args: ['-y', 'package'] },
      'http': { url: 'https://example.com', headers: { AUTH: 'token' } },
    };
    const result = provider.transformMcpServers(servers);
    expect(result['stdio']).toEqual({ command: 'npx', args: ['-y', 'package'] });
    expect(result['http']).toEqual({ url: 'https://example.com', headers: { AUTH: 'token' } });
  });
});

describe('OpenCodeProvider', () => {
  const provider = new OpenCodeProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('opencode');
    expect(provider.format).toBe('json');
    expect(provider.mcpKey).toBe('mcp');
  });
  
  it('should transform stdio servers with type and command array', () => {
    const servers: Record<string, McpServer> = {
      'test': { command: 'npx', args: ['-y', 'package'], env: { KEY: 'value' } },
    };
    const result = provider.transformMcpServers(servers) as any;
    expect(result['test'].type).toBe('local');
    expect(result['test'].command).toEqual(['npx', '-y', 'package']);
    expect(result['test'].environment).toEqual({ KEY: 'value' });
    expect(result['test'].enabled).toBe(true);
  });
  
  it('should transform HTTP servers with type remote', () => {
    const servers: Record<string, McpServer> = {
      'http': { url: 'https://example.com', headers: { AUTH: 'token' } },
    };
    const result = provider.transformMcpServers(servers) as any;
    expect(result['http'].type).toBe('remote');
    expect(result['http'].url).toBe('https://example.com');
  });
});

describe('CodexProvider', () => {
  const provider = new CodexProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('codex');
    expect(provider.format).toBe('toml');
    expect(provider.mcpKey).toBe('mcp_servers');
  });
  
  it('should transform HTTP servers with http_headers', () => {
    const servers: Record<string, McpServer> = {
      'http': { url: 'https://example.com', headers: { AUTH: 'token' } },
    };
    const result = provider.transformMcpServers(servers) as any;
    expect(result['http'].url).toBe('https://example.com');
    expect(result['http'].http_headers).toEqual({ AUTH: 'token' });
    expect(result['http'].enabled).toBe(true);
  });
  
  it('should include enabled_tools from overrides', () => {
    const servers: Record<string, McpServer> = {
      'test': { 
        url: 'https://example.com',
        overrides: { codex: { enabled_tools: ['tool1', 'tool2'] } },
      },
    };
    const result = provider.transformMcpServers(servers) as any;
    expect(result['test'].enabled_tools).toEqual(['tool1', 'tool2']);
  });
});

describe('WindsurfProvider', () => {
  const provider = new WindsurfProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('windsurf');
    expect(provider.format).toBe('json');
    expect(provider.mcpKey).toBe('mcpServers');
  });
  
  it('should add streamable-http transport for HTTP servers', () => {
    const servers: Record<string, McpServer> = {
      'http': { url: 'https://example.com', headers: { AUTH: 'token' } },
    };
    const result = provider.transformMcpServers(servers) as any;
    expect(result['http'].transport).toBe('streamable-http');
    expect(result['http'].url).toBe('https://example.com');
  });
});

describe('AntigravityProvider', () => {
  const provider = new AntigravityProvider();
  
  it('should have correct metadata', () => {
    expect(provider.name).toBe('antigravity');
    expect(provider.format).toBe('json');
    expect(provider.mcpKey).toBe('mcpServers');
  });
  
  it('should transform stdio servers correctly', () => {
    const servers: Record<string, McpServer> = {
      'test': { command: 'npx', args: ['-y', 'package'] },
    };
    const result = provider.transformMcpServers(servers);
    expect(result).toEqual({
      'test': { command: 'npx', args: ['-y', 'package'] },
    });
  });
  
  it('should skip HTTP servers', () => {
    const servers: Record<string, McpServer> = {
      'stdio': { command: 'npx' },
      'http': { url: 'https://example.com' },
    };
    const result = provider.transformMcpServers(servers);
    expect(Object.keys(result)).toEqual(['stdio']);
  });
});
