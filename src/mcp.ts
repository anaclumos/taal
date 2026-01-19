#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { exists, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isError } from "es-toolkit/predicate";
import YAML from "yaml";
import { z } from "zod/v4";
import { collectAndUpdateConfig } from "./commands/collect.js";
import { diff } from "./commands/diff.js";
import { init } from "./commands/init.js";
import { list } from "./commands/list.js";
import { providers } from "./commands/providers.js";
import { sync } from "./commands/sync.js";
import { validate } from "./commands/validate.js";
import { McpServerSchema, TaalConfigSchema } from "./config/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
) as { version: string };

function createToolResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data,
  };
}

function createToolError(error: unknown) {
  const message = isError(error) ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    structuredContent: { error: message },
  };
}

interface RawTaalConfig {
  version?: string;
  mcp?: Record<string, unknown>;
  skills?: { paths?: string[] };
  providers?: { enabled?: string[] };
  [key: string]: unknown;
}

function createDefaultConfig(): RawTaalConfig {
  return {
    version: "1",
    mcp: {
      taal: {
        command: "bunx",
        args: ["--bun", "taal-mcp"],
      },
    },
    skills: { paths: ["~/.taal/skills"] },
    providers: { enabled: [] },
  };
}

function formatSchemaErrors(
  issues: Array<{ path: (string | number)[]; message: string }>
) {
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
}

function ensureVersion(config: RawTaalConfig) {
  if (!config.version) {
    config.version = "1";
  }
}

function assertObjectSection(
  value: unknown,
  name: string
): Record<string, unknown> {
  if (value === undefined) {
    return {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${name} section: expected an object`);
  }
  return value as Record<string, unknown>;
}

async function loadRawConfig(
  baseDir?: string,
  options: { createIfMissing?: boolean } = {}
): Promise<{
  configPath: string;
  config: RawTaalConfig;
  rawText?: string;
  exists: boolean;
}> {
  const home = baseDir || homedir();
  const configPath = join(home, ".taal", "config.yaml");
  const fileExists = await exists(configPath);

  if (!fileExists) {
    if (!options.createIfMissing) {
      throw new Error("Config file not found");
    }
    return {
      configPath,
      config: createDefaultConfig(),
      exists: false,
    };
  }

  const rawText = await readFile(configPath, "utf-8");
  const parsed = YAML.parse(rawText);
  const normalized = parsed ?? {};

  if (typeof normalized !== "object" || Array.isArray(normalized)) {
    throw new Error("Invalid config format: expected a YAML mapping");
  }

  return {
    configPath,
    config: normalized as RawTaalConfig,
    rawText,
    exists: true,
  };
}

async function writeValidatedConfig(configPath: string, config: RawTaalConfig) {
  const result = TaalConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(formatSchemaErrors(result.error.issues).join("\n"));
  }

  await writeFile(configPath, YAML.stringify(config), "utf-8");
}

export function createTaalMcpServer() {
  const server = new McpServer({
    name: "taal",
    version: packageJson.version,
  });

  const baseDirSchema = z
    .string()
    .describe("Root directory to treat as the home directory (contains .taal).")
    .optional();
  const providerSchema = z
    .string()
    .describe("Provider name to target (optional).")
    .optional();
  const forceSchema = z
    .boolean()
    .describe("Overwrite existing configuration if it already exists.")
    .optional();
  const createIfMissingSchema = z
    .boolean()
    .describe("Create a default config if it does not exist.")
    .optional();
  const overwriteSchema = z
    .boolean()
    .describe("Overwrite the existing entry if it already exists.")
    .optional();
  const errorIfMissingSchema = z
    .boolean()
    .describe("Return an error if the entry does not exist.")
    .optional();
  const includeRawSchema = z
    .boolean()
    .describe("Include raw YAML content in the response.")
    .optional();
  const skillPathSchema = z
    .string()
    .describe("Skill directory path to add or remove.");
  const mcpNameSchema = z
    .string()
    .describe("MCP server name key to add or remove.");

  const mcpServerInputSchema = {
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    url: z.string().optional(),
    headers: z.record(z.string()).optional(),
    overrides: z
      .record(
        z.object({
          enabled_tools: z.array(z.string()).optional(),
        })
      )
      .optional(),
  };

  server.registerTool(
    "taal_init",
    {
      description: "Initialize TAAL configuration and collect existing MCPs.",
      inputSchema: {
        baseDir: baseDirSchema,
        force: forceSchema,
      },
    },
    async ({ baseDir, force }) => {
      try {
        const result = await init(baseDir, { force });
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_config_read",
    {
      description: "Read TAAL config.yaml (parsed and optionally raw).",
      inputSchema: {
        baseDir: baseDirSchema,
        includeRaw: includeRawSchema,
      },
    },
    async ({ baseDir, includeRaw }) => {
      try {
        const { configPath, config, rawText, exists } =
          await loadRawConfig(baseDir);
        const validation = TaalConfigSchema.safeParse(config);
        const response = {
          configPath,
          exists,
          config,
          valid: validation.success,
          errors: validation.success
            ? []
            : formatSchemaErrors(validation.error.issues),
          raw: includeRaw ? rawText || "" : undefined,
        };
        return createToolResult(response);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_collect",
    {
      description:
        "Collect MCP servers from installed providers and merge into config.",
      inputSchema: {
        baseDir: baseDirSchema,
      },
    },
    async ({ baseDir }) => {
      try {
        const result = await collectAndUpdateConfig(baseDir);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_mcp_add",
    {
      description: "Add or update an MCP server entry in config.yaml.",
      inputSchema: {
        baseDir: baseDirSchema,
        createIfMissing: createIfMissingSchema,
        overwrite: overwriteSchema,
        name: mcpNameSchema,
        server: z.object(mcpServerInputSchema),
      },
    },
    async ({
      baseDir,
      createIfMissing,
      overwrite,
      name,
      server: serverConfig,
    }) => {
      try {
        const validation = McpServerSchema.safeParse(serverConfig);
        if (!validation.success) {
          throw new Error(
            formatSchemaErrors(validation.error.issues).join("\n")
          );
        }

        const { configPath, config } = await loadRawConfig(baseDir, {
          createIfMissing,
        });

        ensureVersion(config);
        const mcpSection = assertObjectSection(config.mcp, "mcp");
        config.mcp = mcpSection;
        const existsAlready = Object.hasOwn(mcpSection, name);

        if (existsAlready && !overwrite) {
          throw new Error(`MCP server "${name}" already exists`);
        }

        mcpSection[name] = serverConfig;
        config.mcp = mcpSection;

        await writeValidatedConfig(configPath, config);

        return createToolResult({
          configPath,
          name,
          replaced: existsAlready,
          totalServers: Object.keys(mcpSection).length,
        });
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_mcp_delete",
    {
      description: "Delete an MCP server entry from config.yaml.",
      inputSchema: {
        baseDir: baseDirSchema,
        errorIfMissing: errorIfMissingSchema,
        name: mcpNameSchema,
      },
    },
    async ({ baseDir, errorIfMissing, name }) => {
      try {
        const { configPath, config } = await loadRawConfig(baseDir);
        ensureVersion(config);
        const mcpSection = assertObjectSection(config.mcp, "mcp");
        config.mcp = mcpSection;
        const existsAlready = Object.hasOwn(mcpSection, name);

        if (!existsAlready) {
          if (errorIfMissing) {
            throw new Error(`MCP server "${name}" does not exist`);
          }
          return createToolResult({
            configPath,
            name,
            removed: false,
            totalServers: Object.keys(mcpSection).length,
          });
        }

        delete mcpSection[name];
        config.mcp = mcpSection;

        await writeValidatedConfig(configPath, config);

        return createToolResult({
          configPath,
          name,
          removed: true,
          totalServers: Object.keys(mcpSection).length,
        });
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_skill_path_add",
    {
      description: "Add a skills path to config.yaml.",
      inputSchema: {
        baseDir: baseDirSchema,
        createIfMissing: createIfMissingSchema,
        path: skillPathSchema,
      },
    },
    async ({ baseDir, createIfMissing, path }) => {
      try {
        const { configPath, config } = await loadRawConfig(baseDir, {
          createIfMissing,
        });

        ensureVersion(config);
        const skillsSection = assertObjectSection(config.skills, "skills");
        const pathsValue = (skillsSection as { paths?: unknown }).paths;
        if (pathsValue !== undefined && !Array.isArray(pathsValue)) {
          throw new Error("Invalid skills.paths: expected an array");
        }
        const paths = (pathsValue as string[] | undefined) ?? [];
        const existsAlready = paths.includes(path);

        if (!existsAlready) {
          paths.push(path);
        }

        skillsSection.paths = paths;
        config.skills = skillsSection;

        await writeValidatedConfig(configPath, config);

        return createToolResult({
          configPath,
          path,
          added: !existsAlready,
          totalPaths: paths.length,
        });
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_skill_path_delete",
    {
      description: "Remove a skills path from config.yaml.",
      inputSchema: {
        baseDir: baseDirSchema,
        errorIfMissing: errorIfMissingSchema,
        path: skillPathSchema,
      },
    },
    async ({ baseDir, errorIfMissing, path }) => {
      try {
        const { configPath, config } = await loadRawConfig(baseDir);
        ensureVersion(config);
        const skillsSection = assertObjectSection(config.skills, "skills");
        const pathsValue = (skillsSection as { paths?: unknown }).paths;
        if (pathsValue !== undefined && !Array.isArray(pathsValue)) {
          throw new Error("Invalid skills.paths: expected an array");
        }
        const paths = (pathsValue as string[] | undefined) ?? [];
        const index = paths.indexOf(path);

        if (index === -1) {
          if (errorIfMissing) {
            throw new Error(`Skill path "${path}" does not exist`);
          }
          return createToolResult({
            configPath,
            path,
            removed: false,
            totalPaths: paths.length,
          });
        }

        paths.splice(index, 1);
        skillsSection.paths = paths;
        config.skills = skillsSection;

        await writeValidatedConfig(configPath, config);

        return createToolResult({
          configPath,
          path,
          removed: true,
          totalPaths: paths.length,
        });
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_validate",
    {
      description: "Validate TAAL configuration.",
      inputSchema: {
        baseDir: baseDirSchema,
      },
    },
    async ({ baseDir }) => {
      try {
        const result = await validate(baseDir);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_diff",
    {
      description: "Show pending MCP changes without writing.",
      inputSchema: {
        baseDir: baseDirSchema,
        provider: providerSchema,
      },
    },
    async ({ baseDir, provider }) => {
      try {
        const result = await diff(baseDir, provider);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_sync",
    {
      description: "Sync MCP configs and skills to enabled providers.",
      inputSchema: {
        baseDir: baseDirSchema,
        provider: providerSchema,
      },
    },
    async ({ baseDir, provider }) => {
      try {
        const result = await sync(baseDir, provider);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_list",
    {
      description: "List configured MCP servers, skills, and providers.",
      inputSchema: {
        baseDir: baseDirSchema,
      },
    },
    async ({ baseDir }) => {
      try {
        const result = await list(baseDir);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  server.registerTool(
    "taal_providers",
    {
      description: "List supported providers and their status.",
      inputSchema: {
        baseDir: baseDirSchema,
      },
    },
    async ({ baseDir }) => {
      try {
        const result = await providers(baseDir);
        return createToolResult(result);
      } catch (error) {
        return createToolError(error);
      }
    }
  );

  return server;
}

async function main() {
  const server = createTaalMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TAAL MCP server running on stdio");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("TAAL MCP server error:", error);
    process.exit(1);
  });
}
