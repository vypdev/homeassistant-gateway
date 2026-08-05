import { expect, test } from '@playwright/test';
import { assertResponsivePage, expectNoVisibleElementOutsideViewport, expectVisibleHeading } from './assertions/layout-assertions';
import { installGatewayMock } from './fixtures/gateway-api';
import { VIEWPORTS } from './viewports';

const screens = [
  { nav: 'Overview', heading: /secure gateway control plane/i },
  { nav: 'Dev Console', heading: /development console/i },
  { nav: 'Clients', heading: /clients & tokens/i },
  { nav: 'Policy', heading: /profiles & policy/i },
  { nav: 'MCP', heading: /mcp transport/i },
  { nav: 'Audit', heading: /sanitized audit trail/i },
];

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  test(`all screens remain visible and contained at ${viewportName}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installGatewayMock(page);
    await page.goto('/');
    await expectVisibleHeading(page, screens[0].heading);

    for (const screen of screens) {
      await test.step(`${screen.nav} is visible and responsive`, async () => {
        await page.getByRole('tab', { name: screen.nav, exact: true }).click();
        await expectVisibleHeading(page, screen.heading);
        await expect(page.getByRole('tab', { name: screen.nav, exact: true })).toHaveAttribute('aria-selected', 'true');
        await assertResponsivePage(page);
        await expectNoVisibleElementOutsideViewport(page);
      });
    }
  });
}
