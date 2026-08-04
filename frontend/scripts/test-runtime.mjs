import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const sourceDir = new URL('../src/', import.meta.url);
const tempDir = await mkdtemp(join(tmpdir(), 'homeassistant-gateway-ui-'));

try {
  await writeFile(join(tempDir, 'api.mjs'), 'export const api = async () => { throw new Error("unexpected default api call"); };\n');
  for (const name of ['locale', 'view-helpers', 'capability-policy', 'operator-policy', 'gateway-errors', 'operator-policy-service', 'gateway-contracts', 'gateway-api', 'gateway-controller']) {
    const source = await readFile(new URL(`${name}.ts`, sourceDir), 'utf8');
    let output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    }).outputText;
    if (name === 'gateway-api') {
      output = output.replace("from './api'", "from './api.mjs'");
      output = output.replace("from './gateway-contracts'", "from './gateway-contracts.mjs'");
    }
    if (name === 'gateway-controller') output = output.replace("from './operator-policy-service'", "from './operator-policy-service.mjs'");
    if (name === 'gateway-contracts') output = output.replace("from './gateway-errors'", "from './gateway-errors.mjs'");
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

  const errors = await import(pathToFileURL(join(tempDir, 'gateway-errors.mjs')));
  assert.equal(errors.gatewayErrorFromResponse(422, { code: 'operator_service_policy_invalid', detail: 'invalid policy' }).code, 'operator_service_policy_invalid');
  assert.equal(errors.gatewayErrorFromResponse(401, {}).code, 'unauthorized');
  assert.equal(errors.gatewayErrorFromResponse(500, {}).code, 'server_error');
  assert.equal(errors.gatewayErrorFromUnknown(new Error('offline')).code, 'network_error');

  const policyServiceModule = await import(pathToFileURL(join(tempDir, 'operator-policy-service.mjs')));
  const policyCalls = [];
  const policyService = policyServiceModule.createOperatorPolicyService(async (selected) => {
    policyCalls.push([...selected]);
    if (selected[0] === 'fail') throw new Error('failed');
  });
  const first = ['first'];
  const firstSave = policyService.save(first);
  first.push('mutated');
  const secondSave = policyService.save(['second']);
  await Promise.all([firstSave, secondSave]);
  assert.deepEqual(policyCalls, [['first'], ['second']]);
  await assert.rejects(() => policyService.save(['fail']));
  await policyService.save(['after-failure']);
  assert.deepEqual(policyCalls.at(-1), ['after-failure']);

  const gatewayApiModule = await import(pathToFileURL(join(tempDir, 'gateway-api.mjs')));
  const calls = [];
  const fakeRequest = async (path, init) => {
    calls.push({ path, init });
    if (path === '/../ready') return { status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready' };
    if (path === '/clients') return init?.method === 'POST' ? { client_id: 'id', token: 'token' } : [];
    if (path === '/audit') return [];
    if (path === '/development/catalog') return { enabled: true, upstream: 'fake', operations: [], packs: [], mutations: { status: 'blocked', reason: 'test', approval_required: true } };
    if (path === '/development/reports') return [];
    if (path === '/ui/context') return { locale: 'en', theme: 'auto' };
    if (path === '/health/details') return { status: 'healthy', checks: [] };
    if (path === '/operator/status') return { operator_enabled: true, execution: 'enabled', registered_mutation_tools: [], capabilities: [], reason: 'ready' };
    if (path === '/operator/service-policy') return init?.method === 'PUT' ? undefined : { services: [], selected: [] };
    if (path === '/mcp/discovery') return { tools: [] };
    if (path === '/policy/evaluate') return { decision: 'allowed', reason: 'ok' };
    return undefined;
  };
  const gatewayApi = gatewayApiModule.createGatewayApi(fakeRequest);
  const bootstrap = await gatewayApi.loadBootstrap();
  assert.equal(bootstrap.operatorStatus.operator_enabled, true);
  assert.equal(calls.length, 9);
  await gatewayApi.createClient({ client_id: 'id', display_name: 'name', profile: 'observer', capabilities: [], operator_services: [] });
  await gatewayApi.loadDiscovery('secret-token');
  await gatewayApi.loadAudit('deny reason');
  await gatewayApi.saveOperatorPolicy(['light.turn_on']);
  await gatewayApi.evaluatePolicy({ client_id: 'id', capability: 'ha.read.states', mutation: false });
  assert.equal(calls.at(-4).init.headers.Authorization, 'Bearer secret-token');
  assert.match(calls.at(-3).path, /decision=deny%20reason/);
  assert.equal(JSON.parse(calls.at(-2).init.body).selected[0], 'light.turn_on');
  assert.equal(JSON.parse(calls.at(-1).init.body).mutation, false);

  const contractsModule = await import(pathToFileURL(join(tempDir, 'gateway-contracts.mjs')));
  assert.doesNotThrow(() => contractsModule.assertGatewayBootstrap(bootstrap));
  assert.throws(() => contractsModule.assertGatewayBootstrap({ ...bootstrap, ready: { status: 'ready' } }), /Invalid gateway bootstrap response/);
  assert.throws(() => contractsModule.assertGatewayBootstrap({ ...bootstrap, clients: [{ client_id: 'broken' }] }), /Invalid gateway bootstrap response/);
  assert.throws(() => contractsModule.assertOperatorPolicy({ services: [{ id: 'broken' }], selected: [] }), /Invalid operator policy response/);
  assert.throws(() => contractsModule.assertIssuedClient({ client_id: 'id' }), /Invalid issued client response/);
  assert.throws(() => contractsModule.assertPolicyEvaluation({ decision: 'allowed' }), /Invalid policy evaluation response/);

  const controllerModule = await import(pathToFileURL(join(tempDir, 'gateway-controller.mjs')));
  const controllerCalls = [];
  const controllerBootstrap = { ready: { status: 'ready' }, clients: [], audit: [], development: { operations: [] }, developmentReports: [], uiContext: { locale: 'en', theme: 'auto' }, healthDetails: { status: 'healthy', checks: [] }, operatorStatus: { operator_enabled: true, execution: 'enabled', registered_mutation_tools: [], capabilities: [], reason: 'ready' }, operatorPolicy: { services: [], selected: [] } };
  const fakeGatewayApi = {
    loadBootstrap: async () => { controllerCalls.push('loadBootstrap'); return controllerBootstrap; },
    createClient: async () => { controllerCalls.push('createClient'); return { token: 'token' }; },
    revokeClient: async () => { controllerCalls.push('revokeClient'); },
    rotateClient: async () => { controllerCalls.push('rotateClient'); return { token: 'rotated' }; },
    loadDiscovery: async () => { controllerCalls.push('loadDiscovery'); return { tools: [] }; },
    loadAudit: async () => { controllerCalls.push('loadAudit'); return []; },
    saveOperatorPolicy: async () => { controllerCalls.push('saveOperatorPolicy'); },
    evaluatePolicy: async () => { controllerCalls.push('evaluatePolicy'); return { decision: 'allowed', reason: 'ok' }; },
  };
  const controller = controllerModule.createGatewayController(fakeGatewayApi);
  await controller.createClient({ client_id: 'id', display_name: 'name', profile: 'observer', capabilities: [], operator_services: [] });
  await controller.revokeClient('id');
  await controller.rotateClient('id');
  await controller.loadDiscovery('token');
  await controller.loadAudit('');
  await controller.saveOperatorPolicy([]);
  await controller.evaluatePolicy({ client_id: 'id', capability: 'ha.read.states', mutation: false });
  assert.deepEqual(controllerCalls, ['createClient', 'loadBootstrap', 'revokeClient', 'loadBootstrap', 'rotateClient', 'loadBootstrap', 'loadDiscovery', 'loadAudit', 'saveOperatorPolicy', 'evaluatePolicy']);

  console.log('frontend runtime helpers: ok');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
