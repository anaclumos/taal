import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

export function backupConfig(filePath: string, baseDir?: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  
  const home = baseDir || homedir();
  const backupDir = join(home, '.taal', 'backups');
  mkdirSync(backupDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = basename(filePath);
  const backupPath = join(backupDir, `${filename}.${timestamp}.backup`);
  
  try {
    copyFileSync(filePath, backupPath);
    return backupPath;
  } catch (error) {
    throw new Error(`Failed to backup ${filePath}: ${error}`);
  }
}
