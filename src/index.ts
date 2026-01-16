#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init';
import { collect } from './commands/collect';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { writeFile, readFile, exists } from 'node:fs/promises';
import YAML from 'yaml';

const program = new Command();

program
  .name('taal')
  .description('CLI to sync MCP server configs and Agent Skills across AI providers')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize TAAL configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    try {
      await init(homedir(), options);
      console.log('✓ TAAL initialized successfully');
      console.log(`  Config: ${homedir()}/.taal/config.yaml`);
      console.log(`  Skills: ${homedir()}/.taal/skills/`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('collect')
  .description('Import existing MCP configs from installed providers')
  .action(async () => {
    try {
      console.log('Scanning installed providers...');
      const result = await collect();
      
      console.log(`\n✓ Found ${result.summary.totalServers} servers from ${result.summary.providersWithConfigs} providers`);
      
      if (result.conflicts.length > 0) {
        console.log('\n⚠ Conflicts detected:');
        for (const conflict of result.conflicts) {
          console.log(`  - "${conflict.serverName}" found in: ${conflict.providers.join(', ')}`);
        }
      }
      
      const configPath = join(homedir(), '.taal', 'config.yaml');
      let existingConfig: any = { version: '1', mcp: {}, skills: { paths: ['~/.taal/skills'] }, providers: { enabled: [] } };
      
      if (await exists(configPath)) {
        const content = await readFile(configPath, 'utf-8');
        existingConfig = YAML.parse(content);
      }
      
      existingConfig.mcp = { ...existingConfig.mcp, ...result.servers };
      
      await writeFile(configPath, YAML.stringify(existingConfig), 'utf-8');
      console.log(`\n✓ Updated config: ${configPath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
