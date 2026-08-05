import { expect, test } from '@playwright/test';
import { installGatewayMock, MULTI_OPERATOR_SERVICES_STATE, POPULATED_STATE } from './fixtures/gateway-api';

const cases = [
  { name: 'overview', nav: 'Overview', heading: /secure gateway control plane/i },
  { name: 'clients', nav: 'Clients', heading: /clients & tokens/i },
  { name: 'policy', nav: 'Policy', heading: /profiles & policy/i },
  { name: 'development', nav: 'Dev Console', heading: /development console/i },
];

for (const theme of ['dark', 'light']) {
  for (const viewport of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
    for (const screen of cases) {
      test(`visual ${screen.name} ${theme} ${viewport.name}`, async ({ page, browserName }) => {
        test.skip(browserName !== 'chromium', 'Visual baselines are canonicalized on Chromium.');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await installGatewayMock(page, { ...POPULATED_STATE, '/api/ui/context': { locale: 'en', theme } });
        await page.goto('/');
        await page.getByRole('tab', { name: screen.nav, exact: true }).click();
        await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
        await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; font-family: Arial, sans-serif !important; }' });
        await expect(page).toHaveScreenshot(`${screen.name}-${theme}-${viewport.name}.png`, {
          // Keep visual baselines bounded to the viewport; full-page reachability is covered by responsive geometry assertions.
          fullPage: false,
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          maxDiffPixelRatio: 0.05,
        });
      });
    }
  }
}

for (const theme of ['dark', 'light']) {
  for (const viewport of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
    test(`visual clients operator services ${theme} ${viewport.name}`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Visual baselines are canonicalized on Chromium.');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installGatewayMock(page, { ...MULTI_OPERATOR_SERVICES_STATE, '/api/ui/context': { locale: 'en', theme } });
      await page.goto('/');
      await page.getByRole('tab', { name: 'Clients', exact: true }).click();
      await expect(page.getByRole('heading', { name: /clients & tokens/i })).toBeVisible();
      await page.getByRole('combobox', { name: 'Profile' }).selectOption('operator');
      await page.getByRole('tab', { name: 'Operator Services' }).click();
      await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; font-family: Arial, sans-serif !important; }' });
      await expect(page).toHaveScreenshot(`clients-operator-services-${theme}-${viewport.name}.png`, {
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        // The dense operator-service list has runner-dependent text wrapping at phone width.
        maxDiffPixelRatio: theme === 'dark' && viewport.name === 'phone' ? 0.08 : 0.05,
      });
    });
  }
}
