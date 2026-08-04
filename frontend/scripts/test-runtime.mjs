import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourceDir = new URL('../src/', import.meta.url);
const tempDir = await mkdtemp(join(tmpdir(), 'homeassistant-gateway-ui-'));

try {
  for (const name of ['locale', 'view-helpers', 'capability-policy', 'operator-policy']) {
    const source = await readFile(new URL(`${name}.ts`, sourceDir), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    }).outputText;
    await writeFile(join(tempDir, `${name}.mjs`), output);
  }

  const locale = await import(pathToFileURL(join(tempDir, 'locale.mjs')));
  const helpers = await import(pathToFileURL(join(tempDir, 'view-helpers.mjs')));
  const catalogs = { en: { hello: 'Hello' }, es: { hello: 'Hola' }, 'es-mx': { hello: 'Qué tal' } };

  assert.equal(locale.resolveLocale('es-MX', 'en', catalogs), 'es-mx');
  assert.equal(locale.resolveLocale('es-AR', 'en', catalogs), 'es');
  assert.equal(locale.resolveLocale('xx', 'fr', catalogs), 'en');
  assert.equal(locale.translate('hello', 'es', [catalogs], catalogs), 'Hola');
  assert.equal(locale.translate('missing', 'es', [catalogs], catalogs), 'missing');
  assert.equal(locale.resolveTheme('auto', true), 'light');
  assert.equal(locale.resolveTheme('auto', false), 'dark');
  assert.equal(locale.resolveTheme('light', false), 'light');

  const translate = (key) => ({ statusPartial: 'Partial', opInventoryLabel: 'Inventory' }[key] ?? key);
  assert.equal(helpers.statusText(translate, 'warning'), 'Partial');
  assert.equal(helpers.operationText(translate, 'inventory', 'Label', 'Fallback'), 'Inventory');
  assert.equal(helpers.operationText(translate, 'unknown', 'Label', 'Fallback'), 'Fallback');
  assert.equal(helpers.pageTitle((key) => key, 'overview'), 'overviewTitle');
  assert.equal(helpers.pageSubtitle((key) => key, 'unknown'), 'overviewSubtitle');

  const policy = await import(pathToFileURL(join(tempDir, 'capability-policy.mjs')));
  const definitions = [
    { name: 'ha.read.states', group: 'observer' },
    { name: 'ha.write.services', group: 'operator' },
  ];
  assert.deepEqual(policy.capabilitiesForProfile('observer', definitions), ['ha.read.states']);
  assert.deepEqual(policy.capabilitiesForProfile('operator', definitions), ['ha.read.states', 'ha.write.services']);
  assert.deepEqual(policy.capabilitiesAfterProfileChange('observer', ['ha.read.states', 'ha.write.services']), ['ha.read.states']);
  assert.deepEqual(policy.toggleCapability('observer', ['ha.read.states'], 'ha.write.services', true), ['ha.read.states']);
  assert.deepEqual(policy.toggleCapability('operator', ['ha.read.states'], 'ha.write.services', true), ['ha.read.states', 'ha.write.services']);
  assert.deepEqual(policy.toggleCapability('operator', ['ha.read.states', 'ha.write.services'], 'ha.write.services', false), ['ha.read.states']);

  const operatorPolicy = await import(pathToFileURL(join(tempDir, 'operator-policy.mjs')));
  assert.deepEqual(operatorPolicy.toggleOperatorServiceSelection(['light.turn_on'], 'switch.turn_on', true), ['light.turn_on', 'switch.turn_on']);
  assert.deepEqual(operatorPolicy.toggleOperatorServiceSelection(['light.turn_on', 'switch.turn_on'], 'light.turn_on', false), ['switch.turn_on']);
  assert.deepEqual(operatorPolicy.toggleOperatorServiceGroupSelection(['light.turn_on', 'switch.turn_on'], ['light.turn_on', 'fan.turn_on'], true), ['fan.turn_on', 'light.turn_on', 'switch.turn_on']);
  assert.deepEqual(operatorPolicy.toggleOperatorServiceGroupSelection(['light.turn_on', 'switch.turn_on'], ['light.turn_on', 'fan.turn_on'], false), ['switch.turn_on']);
  const samplePolicy = { services: [{ id: 'light.turn_on' }, { id: 'switch.turn_on' }], selected: ['switch.turn_on'] };
  assert.deepEqual(operatorPolicy.selectedOperatorServices(samplePolicy), [{ id: 'switch.turn_on' }]);
  assert.deepEqual(operatorPolicy.selectedOperatorServices(null), []);

  console.log('frontend runtime helpers: ok');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
