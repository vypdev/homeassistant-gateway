import { expect, test } from '@playwright/test';

async function mockGatewayApi(page: import('@playwright/test').Page, theme: 'light' | 'dark' = 'dark', locale = 'en') {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path !== '/ready' && !path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const payload: Record<string, unknown> = {
      '/ready': { status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready', version: 'test' },
      '/api/clients': [],
      '/api/audit': [],
      '/api/development/catalog': { operations: [], packs: [] },
      '/api/development/reports': [],
      '/api/ui/context': { locale, theme },
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

test('translates the initial storage readiness status', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page, 'dark', 'es');
  await page.goto('/');

  await expect(page.locator('.cards .card').first().locator('.metric')).toHaveText('Listo');
});

test('matches the Home Assistant navigation states and uses MDI leading icons', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page, 'light');
  await page.goto('/');

  const navigation = page.getByRole('navigation');
  const buttons = navigation.getByRole('button');
  await expect(buttons).toHaveCount(6);
  await expect(navigation.locator('svg.navigation-icon')).toHaveCount(6);
  await expect(buttons.first()).toHaveCSS('border-radius', '8px');
  await expect(buttons.first()).toHaveCSS('background-color', 'rgb(227, 242, 253)');
  await expect(buttons.first()).toHaveCSS('color', 'rgb(3, 169, 244)');
  await expect(buttons.first().locator('svg')).toHaveCSS('fill', 'rgb(3, 169, 244)');

  await buttons.nth(1).hover();
  await expect(buttons.nth(1)).toHaveCSS('background-color', 'rgb(241, 243, 244)');
});

test('keeps the static shell and local motion reduced when requested', async ({ page }) => {
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
test('separates token revocation from permanent client deletion', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page);
  await page.route('**/api/clients', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { client_id: 'active-client', display_name: 'Active client', profile: 'observer', capabilities: ['ha.read.states'], operator_services: [], created_at: '2026-08-05T00:00:00Z', status: 'active', revoked_at: null },
        { client_id: 'revoked-client', display_name: 'Revoked client', profile: 'observer', capabilities: ['ha.read.states'], operator_services: [], created_at: '2026-08-05T00:00:00Z', status: 'revoked', revoked_at: '2026-08-05T00:01:00Z' },
      ]) });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
  let deleteMethod = '';
  await page.route('**/api/clients/revoked-client', async (route) => {
    deleteMethod = route.request().method();
    await route.fulfill({ status: 204, body: '' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Revoke', exact: true })).toBeVisible();
  const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
  await expect(deleteButton).toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await deleteButton.click();
  expect(deleteMethod).toBe('');
  page.once('dialog', (dialog) => dialog.accept());
  await deleteButton.click();
  await expect.poll(() => deleteMethod).toBe('DELETE');
});


test('does not wait for the global bootstrap after creating a client', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page);
  let mutationAccepted = false;
  let healthRequests = 0;
  const clients: Array<Record<string, unknown>> = [];
  await page.route('**/api/health/details', async (route) => {
    healthRequests += 1;
    if (mutationAccepted) await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fallback();
  });
  await page.route('**/api/clients', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(clients) });
      return;
    }
    mutationAccepted = true;
    clients.push({ client_id: 'created-client', display_name: 'Created client', profile: 'observer', capabilities: ['ha.read.diagnostics'], operator_services: [], created_at: '2026-08-05T00:00:00Z', status: 'active', revoked_at: null });
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...clients[0], token: 'issued-token' }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  const healthRequestsBeforeMutation = healthRequests;
  await page.locator('input[name="client_id"]').fill('created-client');
  await page.locator('input[name="display_name"]').fill('Created client');
  await page.getByRole('button', { name: 'Issue client', exact: true }).click();
  await expect(page.getByText('issued-token', { exact: true })).toBeVisible({ timeout: 1000 });
  await expect(page.locator('.mono:visible, code:visible').filter({ hasText: /^created-client$/ })).toBeVisible({ timeout: 1000 });
  expect(healthRequests).toBe(healthRequestsBeforeMutation);
});
test('supports a narrow viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /secure gateway control plane/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
