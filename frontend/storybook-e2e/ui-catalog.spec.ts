import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const stories = [
  ['button', 'ui-actions-button--primary', 'button', 'Continue'],
  ['tabs', 'ui-navigation-tabs--icon-tabs', 'tab', 'Overview'],
  ['card', 'ui-containers-card--default', 'heading', 'Gateway readiness'],
  ['forms', 'ui-forms-fields-and-feedback--default', 'label', 'Display name'],
] as const;

test('tabs story changes the selected state through the public callback', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-navigation-tabs--icon-tabs&viewMode=story');
  await page.getByRole('tab', { name: 'Clients' }).click();
  await page.waitForFunction(() => (document.querySelector('gateway-story-tabs') as { selected?: string } | null)?.selected === 'clients');
});

for (const [name, storyId, role, expectedName] of stories) {
  test(`${name} story renders and has no accessibility violations`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    const root = page.locator('#storybook-root');
    await expect(root).toBeVisible();
    if (role === 'label') {
      await expect(page.getByLabel(expectedName)).toBeVisible();
    } else {
      await expect(page.getByRole(role, { name: expectedName })).toBeVisible();
    }

    const results = await new AxeBuilder({ page })
      .include('#storybook-root')
      .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
      .analyze();
    expect(results.violations, results.violations.map((violation) => violation.id).join(', ')).toEqual([]);
  });
}
