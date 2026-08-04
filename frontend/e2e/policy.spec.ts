import { expect, test } from '@playwright/test';
import { assertResponsivePage } from './assertions/layout-assertions';
import { installGatewayMock, POPULATED_STATE } from './fixtures/gateway-api';

const policyState = {
  ...POPULATED_STATE,
  '/api/operator/service-policy': {
    services: [
      { id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} },
      { id: 'light.turn_off', domain: 'light', service: 'turn_off', name: 'Turn off', description: 'Turn off a light.', fields: {} },
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

  test('supports select-all and clear-all actions scoped to each domain group', async ({ page }) => {
    const { requests } = await installGatewayMock(page, policyState);
    await page.goto('/');
    await page.getByRole('button', { name: 'Policy', exact: true }).click();

    const lightGroup = page.locator('.operator-service-group').filter({ has: page.getByRole('heading', { name: 'light', exact: true }) });
    const switchGroup = page.locator('.operator-service-group').filter({ has: page.getByRole('heading', { name: 'switch', exact: true }) });
    await expect(lightGroup.getByRole('button', { name: 'Clear selection', exact: true })).toBeVisible();
    await expect(switchGroup.getByRole('button', { name: 'Select all', exact: true })).toBeVisible();

    await switchGroup.getByRole('button', { name: 'Select all', exact: true }).click();
    await expect.poll(() => requests.filter((request) => request.method() === 'PUT').length).toBe(1);
    expect(JSON.parse(requests.find((request) => request.method() === 'PUT')!.postData() ?? '{}')).toEqual({ selected: ['light.turn_on', 'switch.turn_off'] });
    await expect(switchGroup.locator('input[type="checkbox"]')).toBeChecked();

    await lightGroup.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await expect.poll(() => requests.filter((request) => request.method() === 'PUT').length).toBe(2);
    expect(JSON.parse(requests.filter((request) => request.method() === 'PUT')[1].postData() ?? '{}')).toEqual({ selected: ['switch.turn_off'] });
    await expect(lightGroup.locator('input[type="checkbox"]').nth(0)).not.toBeChecked();
    await expect(lightGroup.locator('input[type="checkbox"]').nth(1)).not.toBeChecked();
  });

  test('changing a service persists immediately and submits only the selected IDs', async ({ page }) => {
    const { requests } = await installGatewayMock(page, policyState);
    await page.goto('/');
    await page.getByRole('button', { name: 'Policy', exact: true }).click();

    await expect(page.getByRole('button', { name: /save global ceiling/i })).toHaveCount(0);
    await page.locator('.operator-service-option input').nth(2).check();

    await expect.poll(() => requests.filter((request) => request.method() === 'PUT' && request.url().endsWith('/api/operator/service-policy')).length).toBe(1);
    const policyRequest = requests.find((request) => request.method() === 'PUT' && request.url().endsWith('/api/operator/service-policy'));
    expect(policyRequest).toBeTruthy();
    expect(JSON.parse(policyRequest!.postData() ?? '{}')).toEqual({ selected: ['light.turn_on', 'switch.turn_off'] });
  });
});
