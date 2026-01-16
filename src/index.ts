#!/usr/bin/env bun
import { Command } from 'commander';

const program = new Command();

program
  .name('taal')
  .description('CLI to sync MCP server configs and Agent Skills across AI providers')
  .version('1.0.0');

program.parse();
