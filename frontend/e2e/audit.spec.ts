import { expect, test } from '@playwright/test';
import { assertResponsivePage, expectVisibleContentWithinViewport } from './assertions/layout-assertions';
import { installGatewayMock } from './fixtures/gateway-api';
import { VIEWPORTS } from './viewports';

const auditState = {
  '/ready': { status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready', version: 'test' },
  '/api/clients': [],
  '/api/audit': [
    { event_id: 'event-1', occurred_at: '2026-08-04T09:00:00Z', request_id: 'request-allowed', remote_user_id: 'user-1', action: 'read', target: '/api/ready', decision: 'allowed', outcome: 'ok', status_code: 200 },
    { event_id: 'event-2', occurred_at: '2026-08-04T09:01:00Z', request_id: 'request-denied', remote_user_id: 'user-1', action: 'write', target: '/api/operator', decision: 'denied', outcome: 'blocked', status_code: 403 },
  ],
  '/api/development/catalog': { enabled: true, upstream: 'ready', operations: [], packs: [], mutations: { status: 'blocked', reason: 'disabled', approval_required: true } },
  '/api/development/reports': [],
  '/api/ui/context': { locale: 'en', theme: 'dark' },
  '/api/health/details': { status: 'ok', checks: [] },
  '/api/operator/status': { operator_enabled: false, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: 'disabled' },
  '/api/operator/service-policy': { services: [], selected: [] },
  '/api/discovery': { tools: [], resources: [], prompts: [] },
};

test('audit filtering remains named, sanitized and contained', async ({ page }) => {
  const { requests } = await installGatewayMock(page, auditState);
  await page.goto('/');
  await page.getByRole('button', { name: 'Audit', exact: true }).click();

  await expect(page.getByRole('combobox', { name: 'Decision' })).toBeVisible();
  const visibleAudit = page.viewportSize()!.width <= 1600
    ? page.getByTestId('audit-responsive-records')
    : page.locator('.desktop-only');
  await expect(visibleAudit.getByText('request-allowed', { exact: true })).toBeVisible();
  await expect(visibleAudit.getByText('request-denied', { exact: true })).toBeVisible();

  await page.getByRole('combobox', { name: 'Decision' }).selectOption('denied');
  await expect.poll(() => requests.filter((request) => request.url().includes('/api/audit?limit=100&decision=denied')).length).toBe(1);
});

test('audit dense content remains reachable without page overflow across the full viewport matrix', async ({ page }) => {
  await installGatewayMock(page, auditState);
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    await test.step(name, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.getByRole('button', { name: 'Audit', exact: true }).click();
      await assertResponsivePage(page);
      await expectVisibleContentWithinViewport(page, '.card');
      if (viewport.width <= 1600) {
        await expect(page.getByTestId('audit-responsive-records')).toBeVisible();
        await expect(page.locator('.desktop-only')).toBeHidden();
        await expect(page.getByTestId('audit-record')).toHaveCount(2);
        await expectVisibleContentWithinViewport(page, '[data-testid="audit-record"]');
        const records = page.getByTestId('audit-responsive-records');
        await expect(records.getByText('request-allowed', { exact: true })).toBeVisible();
        await expect(records.getByText('request-denied', { exact: true })).toBeVisible();
      } else {
        await expect(page.locator('.desktop-only')).toBeVisible();
        await expect(page.getByTestId('audit-responsive-records')).toBeHidden();
      }
    });
  }
});
