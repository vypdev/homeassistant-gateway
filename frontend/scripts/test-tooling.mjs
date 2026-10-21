import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const expected = pkg.packageManager.replace(/^pnpm@/, '');
assert.equal(pkg.devDependencies.pnpm, expected);
const home = mkdtempSync(join(tmpdir(), 'gateway-tooling-'));
try {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/pnpm/bin/pnpm.cjs'), '--version'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15_000,
    env: { PATH: dirname(process.execPath), HOME: home },
  });
  assert.equal(result.status, 0, 'The declared pnpm must run without credentials or a Corepack HOME.');
  assert.equal(result.stdout.trim(), expected);
} finally {
  rmSync(home, { recursive: true, force: true });
}
console.log('isolated verification tooling: ok');
