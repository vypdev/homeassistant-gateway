import { expect, test } from '@playwright/test';
import { assertResponsivePage } from './assertions/layout-assertions';
import { installGatewayMock } from './fixtures/gateway-api';

const developmentState = {
  '/ready': { status: 'ready', version: 'test' },
  '/api/clients': [],
  '/api/audit': [],
  '/api/development/catalog': {
    enabled: true,
    upstream: 'ready',
    operations: [{ name: 'diagnostics', label: 'Gateway diagnostics', description: 'Read gateway diagnostics.', kind: 'observer', supports_entity_id: false, supports_start_time: false }],
    packs: [{ name: 'basic', label: 'Basic inventory', description: 'Core read model and registries.', operations: ['diagnostics'] }],
    mutations: { status: 'blocked', reason: 'disabled', approval_required: true },
  },
  '/api/development/reports': [],
  '/api/ui/context': { locale: 'en', theme: 'dark' },
  '/api/health/details': { status: 'ok', checks: [] },
  '/api/operator/status': { operator_enabled: false, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: 'disabled' },
  '/api/operator/service-policy': { services: [], selected: [] },
  '/api/discovery': { tools: [], resources: [], prompts: [] },
  '/api/development/run': { job_id: 'job-1' },
  '/api/development/jobs/job-1': {
    status: 'completed',
    results: [{ status: 'ok', operation: 'diagnostics', duration_ms: 12, count: 1, data: { status: 'ready' }, trace: [{ phase: 'application', transport: 'rest', status: 'ok', duration_ms: 12, command: 'GET', path: '/ready', attempt: 1 }] }],
    progress: 1,
    completed: 1,
    total: 1,
  },
};

test.describe('development console flows', () => {
  test('catalog and observer probe remain usable on mobile', async ({ page }) => {
    await installGatewayMock(page, developmentState);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Dev Console', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Run all' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Run all' }).locator('.button-leading-icon')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: 'Run all' })).toHaveCSS('background-color', 'rgb(3, 169, 244)');
    await expect(page.getByRole('button', { name: 'Run all' }).locator('.button-leading-icon')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(page.getByRole('button', { name: 'Basic inventory' })).toBeEnabled();
    await expect(page.locator('.pack-grid > button.secondary').first()).toHaveCSS('border-radius', '8px');
    await expect(page.locator('.evidence-actions')).toHaveCSS('gap', '10px');
    await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeEnabled();
    await expect(page.getByRole('textbox', { name: 'Entity filter' })).toBeVisible();
    await assertResponsivePage(page);
  });

  test('running an operation displays completed evidence and traceability', async ({ page }) => {
    await installGatewayMock(page, developmentState);
    await page.goto('/');
    await page.getByRole('button', { name: 'Dev Console', exact: true }).click();
    await page.getByRole('button', { name: 'Run', exact: true }).click();

    await expect(page.getByText('Gateway diagnostics', { exact: true }).last()).toBeVisible();
    await expect(page.locator('.result-row .ok').last()).toBeVisible();
    await expect(page.getByText(/Traceability \(1\)/)).toBeVisible();
    await page.getByText(/Traceability \(1\)/).click();
    await expect(page.getByText('/ready', { exact: true })).toBeVisible();
  });
});
