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
  for (const name of ['api', 'locale', 'view-helpers', 'capability-policy', 'operator-policy', 'gateway-errors', 'operator-policy-service', 'gateway-contracts', 'gateway-api', 'gateway-controller']) {
    const source = await readFile(new URL(`${name}.ts`, sourceDir), 'utf8');
    let output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: `${name}.ts`,
    }).outputText;
    if (name === 'api') output = output.replace("from './gateway-errors'", "from './gateway-errors.mjs'");
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
  assert.equal(errors.isAbortError({ name: 'AbortError' }), true);
  assert.equal(errors.isAbortError(new Error('offline')), false);

  const apiModule = await import(pathToFileURL(join(tempDir, 'api.mjs')));
  globalThis.document = { baseURI: 'http://gateway.test/' };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{invalid', { status: 200 });
  await assert.rejects(() => apiModule.api('/malformed'), (error) => error.code === 'invalid_response');
  globalThis.fetch = async () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error; };
  await assert.rejects(() => apiModule.api('/aborted'), (error) => error.name === 'AbortError');
  globalThis.fetch = originalFetch;

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
    if (path === '/health/details') return { status: 'healthy', checks: [{ name: 'core', status: 'ok', latency_ms: 4, http_status: 200, code: null }] };
    if (path === '/operator/status') return { operator_enabled: true, execution: 'enabled', registered_mutation_tools: [], capabilities: [], reason: 'ready' };
    if (path === '/operator/service-policy') return init?.method === 'PUT' ? { selected: JSON.parse(init.body).selected } : { services: [], selected: [] };
    if (path === '/mcp/discovery') return { tools: [] };
    if (path === '/policy/evaluate') return { decision: 'allowed', reason: 'ok' };
    return undefined;
  };
  const gatewayApi = gatewayApiModule.createGatewayApi(fakeRequest);
  const bootstrap = await gatewayApi.loadBootstrap();
  assert.equal(bootstrap.operatorStatus.operator_enabled, true);
  assert.equal(calls.length, 9);
  calls.length = 0;
  const refreshAbortController = new AbortController();
  await gatewayApi.loadBootstrap(refreshAbortController.signal);
  assert.equal(calls.length, 9);
  assert.ok(calls.every(({ init }) => init?.signal === refreshAbortController.signal));
  refreshAbortController.abort();
  await gatewayApi.createClient({ client_id: 'id', display_name: 'name', profile: 'observer', capabilities: [], operator_services: [] });
  await gatewayApi.loadClients();
  await gatewayApi.loadDiscovery('secret-token');
  await gatewayApi.loadAudit('deny reason');
  await gatewayApi.saveOperatorPolicy(['light.turn_on']);
  await assert.rejects(() => gatewayApiModule.createGatewayApi(async (path, init) => path === '/operator/service-policy' && init?.method === 'PUT' ? {} : fakeRequest(path, init)).saveOperatorPolicy(['light.turn_on']), /Invalid operator policy save response/);
  await gatewayApi.evaluatePolicy({ client_id: 'id', capability: 'ha.read.states', mutation: false });
  const discoveryCall = calls.find(({ path }) => path === '/mcp/discovery');
  const auditCall = calls.find(({ path }) => path.includes('decision=deny%20reason'));
  const policyCall = calls.find(({ path, init }) => path === '/operator/service-policy' && init?.method === 'PUT');
  const evaluationCall = calls.find(({ path }) => path === '/policy/evaluate');
  assert.equal(discoveryCall.init.headers.Authorization, 'Bearer secret-token');
  assert.match(auditCall.path, /decision=deny%20reason/);
  assert.equal(JSON.parse(policyCall.init.body).selected[0], 'light.turn_on');
  assert.equal(JSON.parse(evaluationCall.init.body).mutation, false);

  const contractsModule = await import(pathToFileURL(join(tempDir, 'gateway-contracts.mjs')));
  assert.doesNotThrow(() => contractsModule.assertGatewayBootstrap(bootstrap));
  assert.throws(() => contractsModule.assertGatewayBootstrap({ ...bootstrap, ready: { status: 'ready' } }), /Invalid gateway bootstrap response/);
  assert.throws(() => contractsModule.assertGatewayBootstrap({ ...bootstrap, clients: [{ client_id: 'broken' }] }), /Invalid gateway bootstrap response/);
  assert.throws(() => contractsModule.assertOperatorPolicy({ services: [{ id: 'broken' }], selected: [] }), /Invalid operator policy response/);
  assert.doesNotThrow(() => contractsModule.assertOperatorPolicySaveResponse({ selected: ['light.turn_on'] }));
  assert.throws(() => contractsModule.assertOperatorPolicySaveResponse({ selected: [42] }), /Invalid operator policy save response/);
  assert.throws(() => contractsModule.assertOperatorPolicySaveResponse({}), /Invalid operator policy save response/);
  assert.throws(() => contractsModule.assertIssuedClient({ client_id: 'id' }), /Invalid issued client response/);
  assert.doesNotThrow(() => contractsModule.assertPolicyEvaluation({ decision: 'allowed', reason: 'ok' }));
  assert.doesNotThrow(() => contractsModule.assertPolicyEvaluation({ decision: 'denied', reason: 'blocked' }));
  assert.doesNotThrow(() => contractsModule.assertPolicyEvaluation({ decision: 'approval_required', reason: 'approval' }));
  assert.throws(() => contractsModule.assertPolicyEvaluation({ decision: 'allowed' }), /Invalid policy evaluation response/);
  assert.throws(() => contractsModule.assertPolicyEvaluation({ decision: 'unknown', reason: 'unexpected' }), /Invalid policy evaluation response/);

  const controllerModule = await import(pathToFileURL(join(tempDir, 'gateway-controller.mjs')));
  const controllerCalls = [];
  const controllerBootstrap = { ready: { status: 'ready' }, clients: [], audit: [], development: { operations: [] }, developmentReports: [], uiContext: { locale: 'en', theme: 'auto' }, healthDetails: { status: 'healthy', checks: [] }, operatorStatus: { operator_enabled: true, execution: 'enabled', registered_mutation_tools: [], capabilities: [], reason: 'ready' }, operatorPolicy: { services: [], selected: [] } };
  const fakeGatewayApi = {
    loadBootstrap: async () => { controllerCalls.push('loadBootstrap'); return controllerBootstrap; },
    loadClients: async () => { controllerCalls.push('loadClients'); return []; },
    createClient: async () => { controllerCalls.push('createClient'); return { token: 'token' }; },
    revokeClient: async () => { controllerCalls.push('revokeClient'); },
    rotateClient: async () => { controllerCalls.push('rotateClient'); return { token: 'rotated' }; },
    loadDiscovery: async () => { controllerCalls.push('loadDiscovery'); return { tools: [] }; },
    loadAudit: async () => { controllerCalls.push('loadAudit'); return []; },
    saveOperatorPolicy: async () => { controllerCalls.push('saveOperatorPolicy'); return { selected: [] }; },
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
  assert.deepEqual(controllerCalls, ['createClient', 'revokeClient', 'rotateClient', 'loadDiscovery', 'loadAudit', 'saveOperatorPolicy', 'evaluatePolicy']);

  let observedSignal;
  const mutationSignalController = new AbortController();
  const observedMutationSignals = [];
  fakeGatewayApi.createClient = async (_input, signal) => { observedMutationSignals.push(signal); return { token: 'token' }; };
  await controller.createClient({ client_id: 'id', display_name: 'name', profile: 'observer', capabilities: [], operator_services: [] }, mutationSignalController.signal);
  assert.deepEqual(observedMutationSignals, [mutationSignalController.signal]);

  observedSignal = undefined;
  fakeGatewayApi.loadBootstrap = async (signal) => new Promise((resolve, reject) => {
    observedSignal = signal;
    signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  const abortController = new AbortController();
  const pendingRefresh = controller.refresh(abortController.signal);
  assert.equal(observedSignal, abortController.signal);
  abortController.abort();
  await assert.rejects(pendingRefresh, /aborted/);

  fakeGatewayApi.loadBootstrap = async () => controllerBootstrap;
  fakeGatewayApi.createClient = async () => { throw new Error('create failed'); };
  await assert.rejects(() => controller.createClient({ client_id: 'id', display_name: 'name', profile: 'observer', capabilities: [], operator_services: [] }), /create failed/);

  console.log('frontend runtime helpers: ok');
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
