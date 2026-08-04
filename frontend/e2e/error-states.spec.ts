import { expect, test } from '@playwright/test';
import { installGatewayMock } from './fixtures/gateway-api';

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
