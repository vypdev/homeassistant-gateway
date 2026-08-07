import { expect, test } from '@playwright/test';

const stories = [
  ['catalog', 'ui-home-assistant-control-matrix--light', 'tab', 'YAML'],
  ['button', 'ui-actions-button--primary', 'button', 'Add trigger'],
  ['tabs', 'ui-navigation-tabs--icon-tabs', 'tab', 'YAML'],
  ['tab-bar', 'ui-navigation-tabbar--dashboard', 'tab', 'Overview'],
  ['card', 'ui-containers-card--default', 'heading', 'Gateway readiness'],
  ['forms', 'ui-forms-fields-and-feedback--default', 'label', 'Display name'],
  ['settings', 'ui-home-assistant-settings-menu--landing', 'heading', 'Settings'],
  ['family-foundations', 'ui-home-assistant-component-families--foundations', 'heading', 'Foundations'],
  ['family', 'ui-home-assistant-component-families--icon-button', 'button', 'More options'],
  ['family-card', 'ui-home-assistant-component-families--card-section', 'heading', 'Actions'],
  ['family-rows', 'ui-home-assistant-component-families--rows-and-columns', 'button', 'Inspect'],
  ['family-toolbar', 'ui-home-assistant-component-families--toolbar-and-metrics', 'heading', 'Gateway readiness'],
  ['family-tags', 'ui-home-assistant-component-families--tags-and-form-actions', 'button', 'Save'],
  ['family-dialog', 'ui-home-assistant-component-families--dialog', 'dialog', 'Revoke client?'],
] as const;

test('leading icons stay vertically centered inside Home Assistant controls', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-home-assistant-control-matrix--light&viewMode=story');
  const button = page.getByRole('button', { name: 'Add trigger' });
  const icon = button.locator('.button-leading-icon');
  const [buttonBox, iconBox] = await Promise.all([button.boundingBox(), icon.boundingBox()]);
  expect(buttonBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(Math.abs((iconBox!.y + iconBox!.height / 2) - (buttonBox!.y + buttonBox!.height / 2))).toBeLessThanOrEqual(0.5);
  await expect(button).toHaveCSS('display', /flex/);
  await expect(button).toHaveCSS('align-items', 'center');
});

test('buttons follow the official Home Assistant geometry contract', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-actions-button--primary&viewMode=story');
  const button = page.getByRole('button', { name: 'Add trigger' });
  await expect(button).toHaveCSS('min-height', '40px');
  await expect(button).toHaveCSS('height', '40px');
  await expect(button).toHaveCSS('border-radius', '9999px');
  await expect(button).toHaveCSS('padding-left', '16px');
  await expect(button).toHaveCSS('padding-right', '16px');
  await expect(button).toHaveCSS('font-size', '14px');
  await expect(button).toHaveCSS('line-height', '14px');
});

test('tabs story changes the selected state through the public callback', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-navigation-tabs--icon-tabs&viewMode=story');
  await page.getByRole('tab', { name: 'Actions' }).click();
  await page.waitForFunction(() => (document.querySelector('gateway-story-tabs') as { selected?: string } | null)?.selected === 'actions');
});

for (const [name, storyId, role, expectedName] of stories) {
  test(`${name} story renders with its public semantic contract`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    const root = page.locator('#storybook-root');
    await expect(root).toBeVisible();
    if (role === 'label') {
      await expect(page.getByLabel(expectedName)).toBeVisible();
    } else {
      await expect(page.getByRole(role, { name: expectedName })).toBeVisible();
    }
  });
}
