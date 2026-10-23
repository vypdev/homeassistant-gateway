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

  const development = page.getByRole('tab', { name: /dev console|development|desarrollo|développement/i });
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

test('updates capabilities for an existing client without rotating its token', async ({ page }) => {
  await page.unroute('**/*');
  let capabilities = ['ha.read.automations'];
  let patchPayload: unknown = null;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path !== '/ready' && !path.startsWith('/api/')) return route.continue();
    if (path === '/api/clients/existing-observer/capabilities' && route.request().method() === 'PATCH') {
      patchPayload = route.request().postDataJSON();
      capabilities = (patchPayload as { capabilities: string[] }).capabilities;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ client_id: 'existing-observer', display_name: 'Existing observer', profile: 'observer', capabilities, operator_services: [], created_at: '2026-01-01T00:00:00Z', status: 'active', revoked_at: null }) });
      return;
    }
    const payload: Record<string, unknown> = {
      '/ready': { status: 'ready', storage: 'ready', mcp: 'ready', home_assistant: 'ready', version: 'test' },
      '/api/clients': [{ client_id: 'existing-observer', display_name: 'Existing observer', profile: 'observer', capabilities, operator_services: [], created_at: '2026-01-01T00:00:00Z', status: 'active', revoked_at: null }],
      '/api/audit': [],
      '/api/development/catalog': { operations: [], packs: [] },
      '/api/development/reports': [],
      '/api/ui/context': { locale: 'en', theme: 'dark' },
      '/api/health/details': { status: 'ok', checks: [] },
      '/api/operator/status': { operator_enabled: false, execution: 'disabled', registered_mutation_tools: [], capabilities: [], reason: '' },
      '/api/operator/service-policy': { services: [], selected: [] },
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload[path] ?? {}) });
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Clients', exact: true }).click();
  const creation = page.locator('.client-form-card');
  await expect(creation.locator('input[value="ha.read.diagnostics"]')).toBeChecked();
  await page.getByRole('button', { name: 'Edit capabilities' }).first().click();
  await expect(creation.locator('input[value="ha.read.diagnostics"]')).toBeChecked();
  await page.locator('.client-capabilities-edit-card').getByRole('checkbox', { name: 'Automation configuration' }).check();
  await expect(creation.locator('input[value="ha.read.automation_config"]')).not.toBeChecked();
  await page.getByRole('button', { name: 'Save capabilities' }).click();

  await expect.poll(() => patchPayload).toEqual({ capabilities: ['ha.read.automations', 'ha.read.automation_config'] });
  await expect(page.locator('.tag', { hasText: 'ha.read.automation_config' }).filter({ visible: true }).first()).toBeVisible();
  await expect(creation.locator('input[value="ha.read.diagnostics"]')).toBeChecked();
});

test('matches the Home Assistant navigation states and uses MDI leading icons', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page, 'light');
  await page.goto('/');

  const navigation = page.getByRole('tablist', { name: 'Gateway navigation' });
  const buttons = navigation.getByRole('tab');
  await expect(buttons).toHaveCount(6);
  await expect(navigation.locator('svg.navigation-icon')).toHaveCount(6);
  await expect(buttons.first()).toHaveCSS('border-radius', '0px');
  await expect(buttons.first()).toHaveAttribute('aria-selected', 'true');
  await expect(buttons.first()).toHaveCSS('border-bottom-width', '2px');
  await expect(buttons.first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(buttons.first()).toHaveCSS('color', 'rgb(36, 52, 71)');
  await expect(buttons.first().locator('svg')).toHaveCSS('fill', 'rgb(36, 52, 71)');

  await buttons.nth(1).hover();
  await expect(buttons.nth(1)).toHaveCSS('background-color', 'rgb(241, 243, 244)');
});

test('keeps the navigation bar flush with the viewport and removes shell side controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.brand')).toHaveCount(0);
  await expect(page.locator('.header-language')).toHaveCount(0);

  const geometry = await page.locator('.shell > .tab-navigation').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const contentStatus = element.parentElement?.querySelector('.content-status');
    const statusRect = contentStatus?.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      viewportWidth: window.innerWidth,
      statusInsideMain: Boolean(contentStatus?.closest('main')),
      statusTop: statusRect?.top ?? -1,
      mainTop: element.parentElement?.querySelector('main')?.getBoundingClientRect().top ?? -1,
    };
  });

  expect(geometry.left).toBe(0);
  expect(geometry.top).toBe(0);
  expect(geometry.width).toBe(geometry.viewportWidth);
  expect(geometry.statusInsideMain).toBe(true);
  expect(geometry.statusTop).toBeGreaterThanOrEqual(geometry.mainTop);
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

test('aligns topology items to the logical reading edge on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /system topology|topología del sistema/i })).toBeVisible();

  const measure = () => page.locator('.topology-grid > .topology-card').evaluateAll((cards) => cards.map((card) => {
    const node = card.querySelector('.topology-node');
    if (!node) return null;
    const cardRect = card.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return {
      textAlign: getComputedStyle(card).textAlign,
      leftInset: nodeRect.left - cardRect.left,
      rightInset: cardRect.right - nodeRect.right,
    };
  }));

  const ltr = await measure();
  expect(ltr.every((item) => item && item.textAlign === 'start' && item.leftInset < item.rightInset), JSON.stringify(ltr)).toBe(true);

  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
  const rtl = await measure();
  expect(rtl.every((item) => item && item.textAlign === 'start' && item.rightInset < item.leftInset), JSON.stringify(rtl)).toBe(true);
});

test('keeps the Clients view contained and links to the global service policy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Clients & tokens', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Capabilities', exact: true }).click();
  await expect(page.locator('input[type="checkbox"][value^="ha.write."]')).toHaveCount(3);
  await expect(page.locator('input[type="checkbox"][value^="ha.write."]').nth(0)).toBeDisabled();
  await page.getByRole('tab', { name: 'Operator Services', exact: true }).click();
  await expect(page.getByRole('button', { name: /open operator services policy/i })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const offenders = await page.locator('.layout *').evaluateAll((elements) => elements.flatMap((element) => {
    if (element.closest('.tab-navigation')) return [];
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.right > window.innerWidth + 1 ? [{ tag: element.tagName, className: String(element.className), right: rect.right, width: rect.width }] : [];
  }));
  expect(offenders).toEqual([]);
});

test('runs a non-mutating capability probe from the responsive client card', async ({ page }) => {
  await page.unroute('**/*');
  await mockGatewayApi(page);
  await page.route('**/api/clients', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { client_id: 'probe-client', display_name: 'Probe client', profile: 'observer', capabilities: ['ha.read.automations', 'ha.read.automation_config'], operator_services: [], created_at: '2026-08-09T00:00:00Z', status: 'active', revoked_at: null },
      ]) });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });
  let method = '';
  await page.route('**/api/clients/probe-client/capability-probe*', async (route) => {
    method = route.request().method();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      client_id: 'probe-client',
      generated_for: 'Probe client',
      results: [
        { capability: 'ha.read.automations', group: 'observer', tool: 'ha_automations', decision: 'allow', status: 'ok', reason: 'read_succeeded', implemented: true, sample_entity_id: 'automation.test', count: 1, details: { shape: 'list' } },
        { capability: 'ha.read.automation_config', group: 'observer', tool: 'ha_automation_config', decision: 'allow', status: 'ok', reason: 'read_succeeded', implemented: true, sample_entity_id: 'automation.test', count: 1, details: { shape: 'object' } },
      ],
    }) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Clients', exact: true }).click();
  await page.getByRole('button', { name: 'Test capabilities', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Capability test results', exact: true })).toBeVisible();
  await expect(page.locator('.capability-probe-panel').getByText('ha.read.automation_config', { exact: true })).toBeVisible();
  expect(method).toBe('POST');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
  await page.getByRole('tab', { name: 'Clients', exact: true }).click();
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
  await page.getByRole('tab', { name: 'Clients', exact: true }).click();
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
