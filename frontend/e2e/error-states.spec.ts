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
  await expect(page.locator('.card').filter({ hasText: 'Storage' }).locator('.metric')).toHaveText('ready');
  await expect(page.locator('.card').filter({ hasText: 'Home Assistant' }).locator('.metric')).toHaveText('Ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
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
