import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

const PACKAGE_NAME = "@anaclumos/taal";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = join(homedir(), ".taal", ".update-check-cache.json");

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, "..", "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
  version: string;
};
const CURRENT_VERSION = packageJson.version;

interface UpdateCache {
  lastCheck: number;
  latestVersion: string | null;
}

function readCache(): UpdateCache {
  try {
    if (existsSync(CACHE_FILE)) {
      return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch {
    return { lastCheck: 0, latestVersion: null };
  }
  return { lastCheck: 0, latestVersion: null };
}

function writeCache(cache: UpdateCache): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    return;
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`
    );
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { version?: string };
    return data.version || null;
  } catch {
    return null;
  }
}

function getCurrentVersion(): string {
  return CURRENT_VERSION;
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0;
    const l = latestParts[i] || 0;
    if (l > c) {
      return 1;
    }
    if (l < c) {
      return -1;
    }
  }
  return 0;
}

export async function checkForUpdates(): Promise<void> {
  const cache = readCache();
  const now = Date.now();

  if (now - cache.lastCheck < CHECK_INTERVAL_MS && cache.latestVersion) {
    const current = getCurrentVersion();
    if (compareVersions(current, cache.latestVersion) > 0) {
      printUpdateNotice(current, cache.latestVersion);
    }
    return;
  }

  const latestVersion = await fetchLatestVersion();
  writeCache({ lastCheck: now, latestVersion });

  if (latestVersion) {
    const current = getCurrentVersion();
    if (compareVersions(current, latestVersion) > 0) {
      printUpdateNotice(current, latestVersion);
    }
  }
}

function printUpdateNotice(current: string, latest: string): void {
  console.log();
  console.log(
    chalk.yellow("  ╭─────────────────────────────────────────────────────╮")
  );
  console.log(
    chalk.yellow("  │                                                     │")
  );
  console.log(
    chalk.yellow(
      `  │   Update available: ${chalk.dim(current)} → ${chalk.green(latest)}                  │`
    )
  );
  console.log(
    chalk.yellow(
      `  │   Run ${chalk.cyan("bun add -g @anaclumos/taal")} to update        │`
    )
  );
  console.log(
    chalk.yellow("  │                                                     │")
  );
  console.log(
    chalk.yellow("  ╰─────────────────────────────────────────────────────╯")
  );
  console.log();
}
