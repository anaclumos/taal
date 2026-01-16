#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TaalConfigSchema } from "../config/schema.js";

// Generate JSON Schema from Zod schema
const jsonSchema = zodToJsonSchema(TaalConfigSchema, {
  name: "TaalConfig",
  $refStrategy: "none", // Inline all definitions for simplicity
});

// Write to root directory
const schemaPath = join(process.cwd(), "taal.schema.json");
writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

console.log(`✓ Generated JSON Schema at ${schemaPath}`);
