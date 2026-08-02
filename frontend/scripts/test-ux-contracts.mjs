import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../src/', import.meta.url);
const development = await readFile(new URL('development-view.ts', root), 'utf8');
const main = await readFile(new URL('main.ts', root), 'utf8');
const styles = await readFile(new URL('main.ts', root), 'utf8');

assert.match(development, /empty_result/);
assert.match(development, /role=\"status\" aria-live=\"polite\"/);
assert.match(development, /reasonText\(result\.reason\)/);
assert.match(development, /copyDiagnostic/);
assert.match(development, /retry/);
assert.match(main, /prefers-reduced-motion/);
assert.match(main, /aria-busy/);
assert.match(styles, /:focus-visible/);

console.log('frontend UX contracts: ok');
