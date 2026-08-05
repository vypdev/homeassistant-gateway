import { expect, test } from '@playwright/test';
import { assertResponsivePage, expectVisibleContentWithinViewport } from './assertions/layout-assertions';
import { installGatewayMock, MULTI_OPERATOR_SERVICES_STATE, POPULATED_STATE, READY_STATE } from './fixtures/gateway-api';
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
        if (viewport.width <= 900) {
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

  test('operator profile offers a generic select-all capabilities action', async ({ page }) => {
    await installGatewayMock(page, POPULATED_STATE);
    await openClients(page);
    await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
    await page.getByRole('tab', { name: 'Capabilities' }).click();

    const selectAll = page.getByRole('button', { name: 'Select all', exact: true });
    await expect(selectAll).toBeVisible();
    await selectAll.click();
    const enabledCapabilities = page.locator('.capability-option input:not(:disabled)');
    await expect(page.locator('.capability-option input:not(:disabled):checked')).toHaveCount(await enabledCapabilities.count());
  });

  test('globally enabled services are the only services shown to clients', async ({ page }) => {
    await installGatewayMock(page, POPULATED_STATE);
    await openClients(page);
    await page.getByRole('tab', { name: 'Operator Services' }).click();

    await expect(page.getByText('Turn on', { exact: true })).toBeVisible();
    await expect(page.getByText('Turn off', { exact: true })).toHaveCount(0);
    await expect(page.locator('input[name="operator_services"]')).toHaveCount(1);
  });

  test('operator services remain actionable when globally enabled services exist', async ({ page }) => {
    await installGatewayMock(page, MULTI_OPERATOR_SERVICES_STATE);
    await openClients(page);
    await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
    await page.getByRole('tab', { name: 'Operator Services' }).click();

    const options = page.locator('.operator-service-option');
    await expect(options).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Select all', exact: true })).toBeVisible();
  });

  test('operator service selection supports all, clear and individual changes', async ({ page }) => {
    await installGatewayMock(page, MULTI_OPERATOR_SERVICES_STATE);
    await openClients(page);
    await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
    await page.getByRole('tab', { name: 'Operator Services' }).click();

    const options = page.locator('.operator-service-option');
    await expect(options).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Select all', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear selection', exact: true })).toBeVisible();
    await expectVisibleContentWithinViewport(page, '.operator-service-option');

    const first = await options.nth(0).boundingBox();
    const second = await options.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);

    await page.getByRole('button', { name: 'Select all', exact: true }).click();
    await expect(page.locator('input[name="operator_services"]:checked')).toHaveCount(2);
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await expect(page.locator('input[name="operator_services"]:checked')).toHaveCount(0);
    await page.locator('input[name="operator_services"]').nth(0).check();
    await expect(page.locator('input[name="operator_services"]:checked')).toHaveCount(1);
    await assertResponsivePage(page);
  });
  test('operator services explain how to enable availability when the global list is empty', async ({ page }) => {
    await installGatewayMock(page, READY_STATE);
    await openClients(page);
    await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
    await page.getByRole('tab', { name: 'Operator Services' }).click();

    await expect(page.getByRole('note')).toContainText('No Operator services are enabled globally.');
    await expect(page.getByRole('button', { name: /open operator services policy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select all', exact: true })).toHaveCount(0);
  });
});
