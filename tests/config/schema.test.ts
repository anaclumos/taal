import { describe, expect, it } from "bun:test";
import { McpServerSchema, TaalConfigSchema } from "../../src/config/schema.js";

describe("McpServerSchema", () => {
  it("should accept valid stdio server", () => {
    const result = McpServerSchema.safeParse({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem"],
      env: { LOG_LEVEL: "debug" },
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid http server", () => {
    const result = McpServerSchema.safeParse({
      url: "https://mcp.context7.com/mcp",
      headers: { Authorization: "Bearer token123" },
    });
    expect(result.success).toBe(true);
  });

  it("should accept server with overrides", () => {
    const result = McpServerSchema.safeParse({
      url: "https://example.com",
      overrides: {
        codex: {
          enabled_tools: ["tool1", "tool2"],
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject server with both command and url", () => {
    const result = McpServerSchema.safeParse({
      command: "npx",
      url: "https://example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "stdio (command) or http (url)"
      );
    }
  });

  it("should reject server with neither command nor url", () => {
    const result = McpServerSchema.safeParse({
      args: ["test"],
      env: { KEY: "value" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "stdio (command) or http (url)"
      );
    }
  });

  it("should accept stdio server with only command (no args or env)", () => {
    const result = McpServerSchema.safeParse({
      command: "some-binary",
    });
    expect(result.success).toBe(true);
  });

  it("should accept http server with only url (no headers)", () => {
    const result = McpServerSchema.safeParse({
      url: "https://example.com/mcp",
    });
    expect(result.success).toBe(true);
  });
});

describe("TaalConfigSchema", () => {
  it("should accept valid minimal config", () => {
    const result = TaalConfigSchema.safeParse({
      version: "1",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid full config", () => {
    const result = TaalConfigSchema.safeParse({
      version: "1",
      mcp: {
        filesystem: {
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
          env: { LOG_LEVEL: "debug" },
        },
        context7: {
          url: "https://mcp.context7.com/mcp",
          headers: { CONTEXT7_API_KEY: "key123" },
          overrides: {
            codex: {
              enabled_tools: ["query-docs"],
            },
          },
        },
      },
      skills: {
        paths: ["~/.taal/skills", "./project-skills"],
      },
      providers: {
        enabled: ["claude-desktop", "cursor", "zed"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid version", () => {
    const result = TaalConfigSchema.safeParse({
      version: "2",
    });
    expect(result.success).toBe(false);
  });

  it("should reject config without version", () => {
    const result = TaalConfigSchema.safeParse({
      mcp: {},
    });
    expect(result.success).toBe(false);
  });

  it("should accept config with only mcp section", () => {
    const result = TaalConfigSchema.safeParse({
      version: "1",
      mcp: {
        "test-server": {
          command: "test",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept config with only skills section", () => {
    const result = TaalConfigSchema.safeParse({
      version: "1",
      skills: {
        paths: ["~/.taal/skills"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept config with only providers section", () => {
    const result = TaalConfigSchema.safeParse({
      version: "1",
      providers: {
        enabled: ["claude-desktop"],
      },
    });
    expect(result.success).toBe(true);
  });
});
