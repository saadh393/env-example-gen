import { describe, expect, it } from 'vitest';

import { DEFAULT_PLACEHOLDER } from '../src/constants.js';
import { generatePlaceholder } from '../src/placeholders.js';

describe('generatePlaceholder', () => {
  it('returns the secret placeholder for sensitive keys', () => {
    expect(generatePlaceholder('API_KEY')).toBe('<YOUR_SECRET_HERE>');
    expect(generatePlaceholder('refresh_token')).toBe('<YOUR_SECRET_HERE>');
  });

  it('detects structural placeholders such as URLs and ports', () => {
    expect(generatePlaceholder('DATABASE_URL')).toBe(
      '<PROTOCOL://USERNAME:PASSWORD@HOST/DATABASENAME>'
    );
    expect(generatePlaceholder('SERVER_PORT')).toBe('<PORT IN NUMBER>');
  });

  it('falls back to the default placeholder when no pattern matches', () => {
    expect(generatePlaceholder('UNMATCHED_VALUE')).toBe(DEFAULT_PLACEHOLDER);
  });
});
