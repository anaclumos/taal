import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Atomically writes content to a file using temp file + rename strategy
 * This ensures the file is never in a partially written state
 *
 * @param filePath - Target file path
 * @param content - Content to write (string or Buffer)
 * @throws Error if write or rename fails
 */
export function atomicWrite(filePath: string, content: string | Buffer): void {
  // Ensure parent directory exists
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });

  // Create temp file in same directory (ensures same filesystem for atomic rename)
  const tempPath = join(dir, `.${Date.now()}.tmp`);

  try {
    // Write to temp file
    writeFileSync(tempPath, content, "utf-8");

    // Atomic rename (overwrites target if exists)
    renameSync(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Atomic write failed for ${filePath}: ${error}`);
  }
}
