import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { TEMPLATE_HEADER_LINES } from '../src/constants.js';
import { EnvTemplateGenerator } from '../src/template-generator.js';

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'env-template-gen-'));
}

async function cleanup(directory: string): Promise<void> {
  await fs.rm(directory, { recursive: true, force: true });
}

describe('EnvTemplateGenerator', () => {
  it('preserves comments/blanks and injects descriptive placeholders', async () => {
    const tmpDir = await createTempDir();
    try {
      const inputPath = path.join(tmpDir, '.env');
      const outputPath = path.join(tmpDir, '.env.example');
      const inputContent = [
        '# Application configuration',
        '',
        'PORT=8080',
        'DATABASE_URL="postgres://user:pass@host/db"',
        'JWT_SECRET=abcd1234 # keep secret',
        ''
      ].join('\n');

      await fs.writeFile(inputPath, inputContent, 'utf8');

      const generator = new EnvTemplateGenerator();
      const result = await generator.generate(inputPath, outputPath);
      const output = await fs.readFile(outputPath, 'utf8');

      const expectedBody = [
        ...TEMPLATE_HEADER_LINES,
        '',
        '# Application configuration',
        '',
        'PORT=<PORT IN NUMBER>',
        'DATABASE_URL="<PROTOCOL://USERNAME:PASSWORD@HOST/DATABASENAME>"',
        'JWT_SECRET=<YOUR_SECRET_HERE> # keep secret'
      ].join('\n');

      expect(output).toBe(`${expectedBody}\n`);
      expect(result.variableCount).toBe(3);
      expect(result.commentCount).toBe(1);
    } finally {
      await cleanup(tmpDir);
    }
  });

  it('retains export keyword, quotes, and suggested output path', async () => {
    const tmpDir = await createTempDir();
    try {
      const inputPath = path.join(tmpDir, '.env.local');
      const inputContent = ["export API_TOKEN='super-secret'", 'CACHE_TIMEOUT=30 # seconds'].join('\n');

      await fs.writeFile(inputPath, inputContent, 'utf8');

      const generator = new EnvTemplateGenerator();
      const outputPath = generator.getSuggestedOutputPath(inputPath);
      await generator.generate(inputPath);
      const output = await fs.readFile(outputPath, 'utf8');
      const lines = output.trim().split('\n').slice(TEMPLATE_HEADER_LINES.length + 1);

      expect(lines).toContain("export API_TOKEN='<YOUR_SECRET_HERE>'");
      expect(lines).toContain('CACHE_TIMEOUT=<TIME_DURATION> # seconds');
      expect(outputPath.endsWith('.example')).toBe(true);
    } finally {
      await cleanup(tmpDir);
    }
  });
});
