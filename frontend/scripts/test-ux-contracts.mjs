import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../src/', import.meta.url);
const development = await readFile(new URL('development-view.ts', root), 'utf8');
const main = await readFile(new URL('main.ts', root), 'utf8');
const overview = await readFile(new URL('overview-view.ts', root), 'utf8');
const styles = main;

assert.match(development, /empty_result/);
assert.match(development, /role=\"status\" aria-live=\"polite\"/);
assert.match(development, /reasonText\(result\.reason\)/);
assert.match(development, /copyDiagnostic/);
assert.match(development, /retry/);
assert.match(main, /prefers-reduced-motion/);
assert.match(main, /aria-busy/);
assert.match(overview, /topology-grid/);
assert.match(styles, /:focus-visible/);
assert.match(styles, /\.split, \.dev-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.cards, \.topology-grid, \.split, \.dev-grid, \.pack-grid \{ grid-template-columns: 1fr; \}/);
assert.match(styles, /\.result-row \{ flex-direction: column; \}/);

console.log('frontend UX contracts: ok');
