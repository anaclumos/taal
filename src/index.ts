#!/usr/bin/env bun
import { exists, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import YAML from "yaml";
import { collect } from "./commands/collect";
import { diff } from "./commands/diff";
import { init } from "./commands/init";
import { list } from "./commands/list";
import { providers } from "./commands/providers";
import { sync } from "./commands/sync";
import { validate } from "./commands/validate";

const program = new Command();

program
  .name("taal")
  .description(
    "CLI to sync MCP server configs and Agent Skills across AI providers"
  )
  .version("1.0.0");

program
  .command("init")
  .description("Initialize TAAL configuration")
  .option("-f, --force", "Overwrite existing configuration")
  .action(async (options) => {
    try {
      await init(homedir(), options);
      console.log("✓ TAAL initialized successfully");
      console.log(`  Config: ${homedir()}/.taal/config.yaml`);
      console.log(`  Skills: ${homedir()}/.taal/skills/`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("collect")
  .description("Import existing MCP configs from installed providers")
  .action(async () => {
    try {
      console.log("Scanning installed providers...");
      const result = await collect();

      console.log(
        `\n✓ Found ${result.summary.totalServers} servers from ${result.summary.providersWithConfigs} providers`
      );

      if (result.conflicts.length > 0) {
        console.log("\n⚠ Conflicts detected:");
        for (const conflict of result.conflicts) {
          console.log(
            `  - "${conflict.serverName}" found in: ${conflict.providers.join(", ")}`
          );
        }
      }

      const configPath = join(homedir(), ".taal", "config.yaml");
      let existingConfig: any = {
        version: "1",
        mcp: {},
        skills: { paths: ["~/.taal/skills"] },
        providers: { enabled: [] },
      };

      if (await exists(configPath)) {
        const content = await readFile(configPath, "utf-8");
        existingConfig = YAML.parse(content);
      }

      existingConfig.mcp = { ...existingConfig.mcp, ...result.servers };

      await writeFile(configPath, YAML.stringify(existingConfig), "utf-8");
      console.log(`\n✓ Updated config: ${configPath}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("validate")
  .description("Validate TAAL configuration")
  .action(async () => {
    try {
      const result = await validate();

      if (result.warnings.length > 0) {
        console.log(chalk.yellow("\nWarnings:"));
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  ⚠ ${warning}`));
        }
      }

      if (result.valid) {
        console.log(chalk.green("\n✓ Configuration is valid"));
        process.exit(0);
      } else {
        console.log(chalk.red("\n✗ Configuration is invalid\n"));
        console.log(chalk.red("Errors:"));
        for (const error of result.errors) {
          console.log(chalk.red(`  • ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("diff [provider]")
  .description("Show what would change without writing")
  .action(async (provider?: string) => {
    try {
      const result = await diff(undefined, provider);

      if (result.error) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }

      if (!result.hasChanges) {
        console.log(chalk.green("\n✓ No changes detected"));
        process.exit(0);
      }

      console.log(chalk.bold("\nChanges:\n"));

      const byProvider = new Map<string, typeof result.changes>();
      for (const change of result.changes) {
        if (!byProvider.has(change.provider)) {
          byProvider.set(change.provider, []);
        }
        byProvider.get(change.provider)?.push(change);
      }

      for (const [providerName, changes] of byProvider) {
        console.log(chalk.bold(`${providerName}:`));
        for (const change of changes) {
          if (change.type === "add") {
            console.log(chalk.green(`  + ${change.serverName}`));
          } else if (change.type === "remove") {
            console.log(chalk.red(`  - ${change.serverName}`));
          } else {
            console.log(chalk.yellow(`  ~ ${change.serverName}`));
          }
        }
        console.log();
      }

      process.exit(1);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("sync [provider]")
  .description("Sync MCP configs and skills to providers")
  .action(async (provider?: string) => {
    try {
      console.log(chalk.bold("Syncing..."));
      const result = await sync(undefined, provider);

      if (result.error) {
        console.error(chalk.red(`\nError: ${result.error}`));
        process.exit(1);
      }

      if (result.synced.length > 0) {
        console.log(
          chalk.green(`\n✓ Synced to ${result.synced.length} provider(s):`)
        );
        for (const p of result.synced) {
          console.log(chalk.green(`  • ${p}`));
        }
      }

      if (result.failed.length > 0) {
        console.log(
          chalk.red(`\n✗ Failed to sync ${result.failed.length} provider(s):`)
        );
        for (const f of result.failed) {
          console.log(chalk.red(`  • ${f.provider}: ${f.error}`));
        }
      }

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List configured MCP servers and skills")
  .action(async () => {
    try {
      const result = await list();

      if (result.error) {
        console.error(chalk.red(`Error: ${result.error}`));
        process.exit(1);
      }

      console.log(chalk.bold("\nMCP Servers:\n"));
      if (result.servers.length === 0) {
        console.log(chalk.dim("  No servers configured"));
      } else {
        for (const server of result.servers) {
          const type =
            server.type === "stdio"
              ? chalk.blue("[stdio]")
              : chalk.green("[http]");
          const detail = server.command || server.url || "";
          console.log(
            `  ${type} ${chalk.bold(server.name)} ${chalk.dim(detail)}`
          );
        }
      }

      console.log(chalk.bold("\nSkills:\n"));
      if (result.skills.length === 0) {
        console.log(chalk.dim("  No skills found"));
      } else {
        for (const skill of result.skills) {
          console.log(`  • ${chalk.bold(skill.name)} ${chalk.dim(skill.path)}`);
        }
      }

      console.log(chalk.bold("\nEnabled Providers:\n"));
      if (result.enabledProviders.length === 0) {
        console.log(chalk.dim("  No providers enabled"));
      } else {
        for (const provider of result.enabledProviders) {
          console.log(`  • ${provider}`);
        }
      }

      console.log();
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("providers")
  .description("List all supported providers")
  .action(async () => {
    try {
      const result = await providers();

      console.log(chalk.bold("\nSupported Providers:\n"));

      for (const provider of result.providers) {
        const status = [];

        if (provider.installed) {
          status.push(chalk.green("installed"));
        } else {
          status.push(chalk.dim("not installed"));
        }

        if (provider.enabled) {
          status.push(chalk.blue("enabled"));
        } else {
          status.push(chalk.dim("disabled"));
        }

        const format = chalk.yellow(`[${provider.format}]`);

        console.log(
          `  ${chalk.bold(provider.name)} ${format} ${status.join(", ")}`
        );
        console.log(chalk.dim(`    ${provider.configPath}`));
      }

      console.log();
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
