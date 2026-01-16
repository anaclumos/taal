#!/usr/bin/env bun
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TaalConfigSchema } from '../config/schema.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Generate JSON Schema from Zod schema
const jsonSchema = zodToJsonSchema(TaalConfigSchema, {
  name: 'TaalConfig',
  $refStrategy: 'none', // Inline all definitions for simplicity
});

// Write to root directory
const schemaPath = join(process.cwd(), 'taal.schema.json');
writeFileSync(schemaPath, JSON.stringify(jsonSchema, null, 2));

console.log(`✓ Generated JSON Schema at ${schemaPath}`);
