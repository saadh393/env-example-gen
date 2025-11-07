import { DEFAULT_PLACEHOLDER } from './constants.js';
import type { PlaceholderRule } from './types.js';

const PLACEHOLDER_RULES: PlaceholderRule[] = [
  { pattern: /PORT/i, placeholder: '<PORT IN NUMBER>' },
  { pattern: /(URI|URL)/i, placeholder: '<PROTOCOL://USERNAME:PASSWORD@HOST/DATABASENAME>' },
  { pattern: /HOST/i, placeholder: '<HOSTNAME>' },
  { pattern: /(PASS|PASSWORD|SECRET|TOKEN|KEY)/i, placeholder: '<YOUR_SECRET_HERE>' },
  { pattern: /USER/i, placeholder: '<USERNAME OR EMAIL>' },
  { pattern: /EMAIL/i, placeholder: '<EMAIL_ADDRESS>' },
  { pattern: /(EXPIRES?_IN|TIMEOUT)/i, placeholder: '<TIME_DURATION>' }
];

export function generatePlaceholder(key: string): string {
  const normalizedKey = key.toUpperCase();

  for (const rule of PLACEHOLDER_RULES) {
    if (rule.pattern.test(normalizedKey)) {
      return rule.placeholder;
    }
  }

  return DEFAULT_PLACEHOLDER;
}
