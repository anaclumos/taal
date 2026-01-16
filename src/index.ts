#!/usr/bin/env bun
import { Command } from 'commander';
import { init } from './commands/init';
import { homedir } from 'node:os';

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

program.parse();
