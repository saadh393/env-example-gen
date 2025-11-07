import { promises as fs } from 'node:fs';
import path from 'node:path';

const ENV_FILE_PATTERN = /^\.env(\..+)?$/;

export async function discoverEnvFiles(cwd: string): Promise<string[]> {
  const directoryEntries = await fs.readdir(cwd, { withFileTypes: true });

  return directoryEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ENV_FILE_PATTERN.test(name))
    .filter((name) => !name.includes('.example'))
    .sort()
    .map((name) => path.join(cwd, name));
}
