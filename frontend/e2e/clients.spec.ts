import { expect, test } from '@playwright/test';
import { assertResponsivePage, expectVisibleContentWithinViewport } from './assertions/layout-assertions';
import { installGatewayMock, POPULATED_STATE } from './fixtures/gateway-api';
import { VIEWPORTS } from './viewports';

async function openClients(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('heading', { name: /clients & tokens/i })).toBeVisible();
}

test.describe('clients permission flows', () => {
  test('populated clients remain usable on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installGatewayMock(page, POPULATED_STATE);
    await openClients(page);

    const records = page.getByTestId('clients-responsive-records');
    await expect(records.getByText('Observer client', { exact: true })).toBeVisible();
    await expect(records.getByText('Operator client', { exact: true })).toBeVisible();
    await expect(records.getByRole('button', { name: 'Revoke' })).toHaveCount(2);
    await expect(page.getByTestId('clients-responsive-records')).toBeVisible();
    await expect(page.getByTestId('client-record')).toHaveCount(2);
    await expectVisibleContentWithinViewport(page, '[data-testid="client-record"]');
    await assertResponsivePage(page);
  });

  test('dense client content uses a contained presentation across the full viewport matrix', async ({ page }) => {
    await installGatewayMock(page, POPULATED_STATE);
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await test.step(name, async () => {
        await page.setViewportSize(viewport);
        await openClients(page);
        await assertResponsivePage(page);
        await expectVisibleContentWithinViewport(page, '.card');
        if (viewport.width <= 1600) {
          await expect(page.getByTestId('clients-responsive-records')).toBeVisible();
          await expect(page.locator('.desktop-only')).toBeHidden();
          await expect(page.getByTestId('client-record')).toHaveCount(2);
          await expectVisibleContentWithinViewport(page, '[data-testid="client-record"]');
        } else {
          await expect(page.locator('.desktop-only')).toBeVisible();
          await expect(page.getByTestId('clients-responsive-records')).toBeHidden();
        }
      });
    }
  });

  test('observer profile keeps write capabilities disabled and tabs accessible', async ({ page }) => {
    await installGatewayMock(page, POPULATED_STATE);
    await openClients(page);

    await expect(page.getByRole('note')).toContainText(/write capabilities are unavailable/i);
    await expect(page.getByRole('tab', { name: 'Capabilities' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();

    await page.getByRole('tab', { name: 'Operator Services' }).click();
    await expect(page.getByRole('tab', { name: 'Operator Services' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('Turn on');

    await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
    await expect(page.getByRole('tabpanel')).toContainText(/grant only the globally enabled services/i);
    await expect(page.locator('input[name="operator_services"]').first()).toBeEnabled();
  });

  test('globally enabled services are the only services shown to clients', async ({ page }) => {
    await installGatewayMock(page, POPULATED_STATE);
    await openClients(page);
    await page.getByRole('tab', { name: 'Operator Services' }).click();

    await expect(page.getByText('Turn on', { exact: true })).toBeVisible();
    await expect(page.getByText('Turn off', { exact: true })).toHaveCount(0);
    await expect(page.locator('input[name="operator_services"]')).toHaveCount(1);
  });
});
