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
      '/api/operator/status': { operator_enabled: true, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: '' },
      '/api/operator/service-policy': { services: [{ id: 'light.turn_on', domain: 'light', service: 'turn_on', name: 'Turn on', description: 'Turn on a light.', fields: {} }], selected: [] },
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
    const dotField = element.querySelector('.dot-field');
    const dotFocus = dotField ? getComputedStyle(dotField, '::before').animationName : '';
    const neural = element.querySelector('.neural');
    const neuralBefore = neural ? getComputedStyle(neural, '::before').animationName : '';
    return `${before},${dotFocus},${neuralBefore}`;
  });
  expect(animationNames).toMatch(/none/);
});

test('keeps topology status chips separated from their labels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /system topology|topología del sistema/i })).toBeVisible();

  const spacing = await page.locator('.topology-grid .inline-chip').evaluateAll((chips) => chips.map((chip) => {
    const label = chip.parentElement?.querySelector('strong');
    if (!label) return { horizontal: -1, vertical: -1 };
    const chipRect = chip.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    return {
      horizontal: chipRect.left - labelRect.right,
      vertical: chipRect.top - labelRect.bottom,
    };
  }));
  expect(spacing.length).toBe(5);
  expect(spacing.every(({ horizontal, vertical }) => horizontal >= 7.5 || vertical >= 5.5), JSON.stringify(spacing)).toBe(true);
});

test('keeps the Clients view contained and links to the global service policy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clients & tokens', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Capabilities', exact: true }).click();
  await expect(page.locator('input[type="checkbox"][value^="ha.write."]')).toHaveCount(3);
  await expect(page.locator('input[type="checkbox"][value^="ha.write."]').nth(0)).toBeDisabled();
  await page.getByRole('tab', { name: 'Operator Services', exact: true }).click();
  await expect(page.getByRole('button', { name: /open operator services policy/i })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const offenders = await page.locator('.layout *').evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.right > window.innerWidth + 1 ? [{ tag: element.tagName, className: String(element.className), right: rect.right, width: rect.width }] : [];
  }));
  expect(offenders).toEqual([]);
});
test('supports a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /secure gateway control plane/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
