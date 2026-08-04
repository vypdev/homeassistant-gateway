import type { Page, Request } from '@playwright/test';

export type GatewayMockOverrides = Partial<Record<string, unknown>>;

export const READY_STATE: Record<string, unknown> = {
  '/ready': { status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready', version: 'test' },
  '/api/clients': [],
  '/api/audit': [],
  '/api/development/catalog': { enabled: true, upstream: 'ready', operations: [], packs: [], mutations: { status: 'blocked', reason: 'disabled', approval_required: true } },
  '/api/development/reports': [],
  '/api/ui/context': { locale: 'en', theme: 'dark' },
  '/api/health/details': { status: 'ok', checks: [] },
  '/api/operator/status': { operator_enabled: true, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: '' },
  '/api/operator/service-policy': { services: [{ id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} }], selected: [] },
  '/api/discovery': { tools: [], resources: [], prompts: [] },
};

export const POPULATED_STATE: Record<string, unknown> = {
  ...READY_STATE,
  '/api/clients': [
    { client_id: 'observer-1', display_name: 'Observer client', profile: 'observer', capabilities: ['ha.read.diagnostics'], operator_services: [], created_at: '2026-08-04T09:00:00Z', status: 'active', revoked_at: null },
    { client_id: 'operator-1', display_name: 'Operator client', profile: 'operator', capabilities: ['ha.read.diagnostics'], operator_services: ['light.turn_on'], created_at: '2026-08-04T09:01:00Z', status: 'active', revoked_at: null },
  ],
  '/api/operator/service-policy': {
    services: [
      { id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} },
      { id: 'switch.turn_off', domain: 'switch', service: 'turn_off', name: 'Turn off', description: 'Turn off a switch.', fields: {} },
    ],
    selected: ['light.turn_on'],
  },
};

export const MULTI_OPERATOR_SERVICES_STATE: Record<string, unknown> = {
  ...POPULATED_STATE,
  '/api/operator/service-policy': {
    services: [
      { id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} },
      { id: 'switch.turn_off', domain: 'switch', service: 'turn_off', name: 'Turn off', description: 'Turn off a switch.', fields: {} },
    ],
    selected: ['light.turn_on', 'switch.turn_off'],
  },
};

export async function installGatewayMock(page: Page, overrides: GatewayMockOverrides = {}): Promise<{ requests: Request[] }> {
  const requests: Request[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path !== '/ready' && !path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    requests.push(request);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(overrides[path] ?? READY_STATE[path] ?? {}),
    });
  });
  return { requests };
}
