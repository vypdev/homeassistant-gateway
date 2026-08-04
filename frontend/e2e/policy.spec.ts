import { expect, test } from '@playwright/test';
import { assertResponsivePage } from './assertions/layout-assertions';
import { installGatewayMock, POPULATED_STATE } from './fixtures/gateway-api';

const policyState = {
  ...POPULATED_STATE,
  '/api/operator/service-policy': {
    services: [
      { id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} },
      { id: 'switch.turn_off', domain: 'switch', service: 'turn_off', name: 'Turn off', description: 'Turn off a switch.', fields: {} },
    ],
    selected: ['light.turn_on'],
  },
};

test.describe('global operator services policy', () => {
  test('summarizes the global ceiling and service grant counts', async ({ page }) => {
    await installGatewayMock(page, policyState);
    await page.goto('/');
    await page.getByRole('button', { name: 'Policy', exact: true }).click();

    await expect(page.getByRole('heading', { name: /operator services/i })).toBeVisible();
    await expect(page.getByRole('note')).toContainText(/does not grant/i);
    await expect(page.getByRole('heading', { name: 'light', exact: true })).toBeVisible();
    await expect(page.getByText(/Turn on · light\.turn_on/)).toBeVisible();
    await expect(page.getByText(/Granted to 1 active operator credentials/)).toBeVisible();
    await assertResponsivePage(page);
  });

  test('changing a service makes save available and submits only the selected IDs', async ({ page }) => {
    const { requests } = await installGatewayMock(page, policyState);
    await page.goto('/');
    await page.getByRole('button', { name: 'Policy', exact: true }).click();

    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();
    await page.locator('.operator-service-option input').nth(1).check();
    await expect(save).toBeEnabled();
    await save.click();

    const policyRequest = requests.find((request) => request.method() === 'PUT' && request.url().endsWith('/api/operator/service-policy'));
    expect(policyRequest).toBeTruthy();
    expect(JSON.parse(policyRequest!.postData() ?? '{}')).toEqual({ selected: ['light.turn_on', 'switch.turn_off'] });
  });
});
