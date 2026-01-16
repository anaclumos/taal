import { z } from "zod";

/**
 * MCP Server Schema
 * Supports either stdio (command-based) OR HTTP (url-based) servers, not both
 */
export const McpServerSchema = z
  .object({
    // Stdio server fields
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),

    // HTTP server fields
    url: z.string().optional(),
    headers: z.record(z.string()).optional(),

    // Provider-specific overrides
    overrides: z
      .record(
        z.object({
          enabled_tools: z.array(z.string()).optional(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      const hasStdio = !!data.command;
      const hasHttp = !!data.url;
      // Must be either stdio OR http, not both, not neither
      return (hasStdio && !hasHttp) || (hasHttp && !hasStdio);
    },
    {
      message: "Server must be either stdio (command) or http (url), not both",
    }
  );

/**
 * Skills Configuration Schema
 */
export const SkillsConfigSchema = z.object({
  paths: z.array(z.string()),
});

/**
 * Providers Configuration Schema
 */
export const ProvidersConfigSchema = z.object({
  enabled: z.array(z.string()),
});

/**
 * TAAL Configuration Schema
 */
export const TaalConfigSchema = z.object({
  version: z.literal("1"),
  mcp: z.record(McpServerSchema).optional(),
  skills: SkillsConfigSchema.optional(),
  providers: ProvidersConfigSchema.optional(),
});

// Export inferred types
export type McpServer = z.infer<typeof McpServerSchema>;
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
export type TaalConfig = z.infer<typeof TaalConfigSchema>;
