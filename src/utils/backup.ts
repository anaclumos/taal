import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

/**
 * Creates a timestamped backup of a config file in ~/.taal/backups/
 * 
 * @param filePath - Path to the file to backup
 * @returns Path to the backup file, or null if source doesn't exist
 */
export function backupConfig(filePath: string): string | null {
  // Skip if source file doesn't exist
  if (!existsSync(filePath)) {
    return null;
  }
  
  // Create backup directory
  const backupDir = join(homedir(), '.taal', 'backups');
  mkdirSync(backupDir, { recursive: true });
  
  // Generate timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = basename(filePath);
  const backupPath = join(backupDir, `${filename}.${timestamp}.backup`);
  
  // Copy file to backup location
  try {
    copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to backup ${filePath}: ${error}`);
  }
}
