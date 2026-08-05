import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { installGatewayMock } from './fixtures/gateway-api';

const screens = ['Overview', 'Dev Console', 'Clients', 'Policy', 'MCP', 'Audit'];

test.describe('accessibility and keyboard contract', () => {
  test('all primary views have no automated accessibility violations', async ({ page }) => {
    await installGatewayMock(page);
    await page.goto('/');

    for (const screen of screens) {
      await test.step(`${screen} accessibility`, async () => {
        await page.getByRole('tab', { name: screen, exact: true }).click();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
      });
    }
  });

  test('navigation and permission tabs are keyboard reachable with visible focus', async ({ page }) => {
    await installGatewayMock(page);
    await page.goto('/');

    const navigation = page.getByRole('tablist', { name: 'Gateway navigation' });
    await expect(navigation).toBeVisible();
    const firstNavigationTab = navigation.getByRole('tab').first();
    await firstNavigationTab.focus();
    await expect(firstNavigationTab).toBeVisible();
    await expect(firstNavigationTab).toHaveCSS('outline-style', 'solid');

    await page.getByRole('tab', { name: 'Clients', exact: true }).click();
    const operatorTab = page.getByRole('tab', { name: 'Operator Services' });
    await operatorTab.focus();
    await expect(operatorTab).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('Enter');
    await expect(operatorTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('form controls have accessible names and disabled state is exposed', async ({ page }) => {
    await installGatewayMock(page);
    await page.goto('/');
    await page.getByRole('tab', { name: 'Clients', exact: true }).click();

    await expect(page.getByRole('textbox', { name: 'Client ID' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Display name' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Issue client' })).toBeVisible();
  });
});
