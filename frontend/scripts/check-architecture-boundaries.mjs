import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourceDir = new URL('../src/', import.meta.url);
const pureModules = new Set([
  'capability-policy.ts',
  'operator-policy.ts',
  'gateway-controller.ts',
  'gateway-contracts.ts',
  'gateway-port.ts',
  'gateway-errors.ts',
]);
const forbidden = [
  { pattern: /from\s+['"]lit['"]/, label: 'Lit' },
  { pattern: /from\s+['"]\.\/api['"]/, label: 'HTTP adapter' },
  { pattern: /from\s+['"]\.\/gateway-api['"]/, label: 'infrastructure adapter' },
  { pattern: /\b(window|document|navigator|localStorage)\b/, label: 'browser global' },
];

const files = await readdir(sourceDir);
const violations = [];
for (const file of files) {
  if (!pureModules.has(file)) continue;
  const content = await readFile(join(sourceDir.pathname, file), 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) violations.push(`${file}: imports or references ${rule.label}`);
  }
}

if (violations.length) {
  console.error(`Architecture boundary violations:\n- ${violations.join('\n- ')}`);
  process.exit(1);
}
console.log(`frontend architecture boundaries: ok (${pureModules.size} modules checked)`);
