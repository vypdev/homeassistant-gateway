import { expect, test } from '@playwright/test';

async function mockGatewayApi(page: import('@playwright/test').Page) {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path !== '/ready' && !path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const payload: Record<string, unknown> = {
      '/ready': { status: 'ready', version: 'test' },
      '/api/clients': [],
      '/api/audit': [],
      '/api/development/catalog': { operations: [], packs: [] },
      '/api/development/reports': [],
      '/api/ui/context': { locale: 'en', theme: 'dark' },
      '/api/health/details': { status: 'ok', checks: [] },
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload[path] ?? {}),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockGatewayApi(page);
});

test('renders the Ingress shell and navigates with keyboard focus', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /secure gateway control plane/i })).toBeVisible();

  const development = page.getByRole('button', { name: /dev console|development|desarrollo|développement/i });
  await development.focus();
  await expect(development).toBeFocused();
  await development.press('Enter');
  await expect(page.getByRole('heading', { name: /development console|consola de desarrollo/i })).toBeVisible();
});

test('keeps the ambient shell motion reduced when requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /secure gateway control plane/i })).toBeVisible();

  const animationNames = await page.locator('.shell').evaluate((element) => {
    const before = getComputedStyle(element, '::before').animationName;
    const neural = element.querySelector('.neural');
    const neuralBefore = neural ? getComputedStyle(neural, '::before').animationName : '';
    return `${before},${neuralBefore}`;
  });
  expect(animationNames).toMatch(/none/);
});

test('supports a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /secure gateway control plane/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
