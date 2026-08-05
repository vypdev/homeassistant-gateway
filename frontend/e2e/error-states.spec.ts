import { expect, test } from '@playwright/test';
import { installGatewayMock } from './fixtures/gateway-api';

test('stale bootstrap refresh is canceled before it can overwrite a successful retry', async ({ page }) => {
  await installGatewayMock(page);
  let readinessAttempts = 0;
  let abortedReadyRequests = 0;
  let releaseFirstRequest: (() => void) | undefined;
  page.on('requestfailed', (request) => {
    if (request.url().endsWith('/ready')) abortedReadyRequests += 1;
  });
  await page.route('**/ready', async (route) => {
    readinessAttempts += 1;
    if (readinessAttempts === 1) {
      await new Promise<void>((resolve) => { releaseFirstRequest = resolve; });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', storage: 'stale-storage', mcp: 'stale-mcp', home_assistant: 'degraded' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready' }) });
  });

  await page.goto('/');
  await expect.poll(() => readinessAttempts).toBe(1);
  const retry = page.evaluate(() => (document.querySelector('gateway-app') as unknown as { refresh: () => Promise<void> }).refresh());
  await expect.poll(() => readinessAttempts).toBe(2);
  await expect(page.getByRole('heading', { name: 'Secure gateway control plane.' })).toBeVisible();
  await expect.poll(() => abortedReadyRequests).toBe(1);
  releaseFirstRequest?.();
  await retry;
  await expect(page.locator('.card').filter({ hasText: 'Storage' }).locator('.metric')).toHaveText('Ready');
  await expect(page.locator('.card').filter({ hasText: 'Home Assistant' }).locator('.metric')).toHaveText('Ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('older mutation is canceled when a newer mutation starts', async ({ page }) => {
  await installGatewayMock(page);
  let revokeAttempts = 0;
  let abortedFirstRevoke = 0;
  let releaseFirstRevoke: (() => void) | undefined;
  page.on('requestfailed', (request) => {
    if (request.url().endsWith('/clients/first/revoke')) abortedFirstRevoke += 1;
  });
  await page.route('**/clients/*/revoke', async (route) => {
    revokeAttempts += 1;
    if (revokeAttempts === 1) {
      await new Promise<void>((resolve) => { releaseFirstRevoke = resolve; });
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Secure gateway control plane.' })).toBeVisible();
  await page.evaluate(() => { window.confirm = () => true; void (document.querySelector('gateway-app') as unknown as { revoke: (id: string) => Promise<void> }).revoke('first'); });
  await expect.poll(() => revokeAttempts).toBe(1);
  const secondMutation = page.evaluate(() => (document.querySelector('gateway-app') as unknown as { revoke: (id: string) => Promise<void> }).revoke('second'));
  await expect.poll(() => revokeAttempts).toBe(2);
  await expect.poll(() => abortedFirstRevoke).toBe(1);
  releaseFirstRevoke?.();
  await secondMutation;
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('stale mutation bootstrap is ignored even when the transport delivers it late', async ({ page }) => {
  await installGatewayMock(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Secure gateway control plane.' })).toBeVisible();
  const finalClientId = await page.evaluate(async () => {
    const app = document.querySelector('gateway-app') as unknown as Record<string, unknown> & {
      revoke: (id: string) => Promise<void>;
      clients: Array<Record<string, unknown>>;
    };
    window.confirm = () => true;
    let firstResolve: ((value: unknown) => void) | undefined;
    let secondResolve: ((value: unknown) => void) | undefined;
    const snapshot = (clientId: string) => ({
      ready: app.ready,
      clients: [{ client_id: clientId, display_name: clientId, profile: 'observer', capabilities: [], operator_services: [] }],
      audit: app.audit,
      development: app.development,
      developmentReports: app.developmentReports,
      uiContext: app.uiContext,
      healthDetails: app.healthDetails,
      operatorStatus: app.operatorStatus,
      operatorPolicy: app.operatorPolicy,
    });
    app.gatewayController = {
      revokeClient: (clientId: string) => new Promise((resolve) => {
        if (clientId === 'first') firstResolve = resolve;
        else secondResolve = resolve;
      }),
    };
    const first = app.revoke('first');
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = app.revoke('second');
    await new Promise((resolve) => setTimeout(resolve, 0));
    secondResolve?.(snapshot('second'));
    await second;
    firstResolve?.(snapshot('first'));
    await first;
    return app.clients[0].client_id;
  });
  expect(finalClientId).toBe('second');
});
test('boot error exposes a retry action and recovers when readiness returns', async ({ page }) => {
  await installGatewayMock(page);
  let readinessAttempts = 0;
  await page.route('**/ready', async (route) => {
    readinessAttempts += 1;
    if (readinessAttempts === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'unavailable' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready', version: 'test' }) });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Unable to load gateway state' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Request failed (503)');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByRole('heading', { name: 'Secure gateway control plane.' })).toBeVisible();
  expect(readinessAttempts).toBeGreaterThanOrEqual(2);
});
