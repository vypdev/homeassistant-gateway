import { expect, type Page } from '@playwright/test';

export async function expectNoUnexpectedHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

export async function expectNoVisibleElementOutsideViewport(
  page: Page,
  options: { root?: string; allowSelectors?: string[] } = {},
): Promise<void> {
  const root = options.root ?? '.layout';
  const allowSelectors = options.allowSelectors ?? ['.table-wrap', '.dev-output'];
  const offenders = await page.locator(`${root} *`).evaluateAll((elements, allowed) => {
    const isAllowed = (element: Element) => allowed.some((selector) => element.closest(selector));
    return elements.flatMap((element) => {
      if (isAllowed(element)) return [];
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || rect.width === 0 || rect.height === 0) return [];
      return rect.left < -1 || rect.right > window.innerWidth + 1
        ? [{ tag: element.tagName, className: String(element.className), left: rect.left, right: rect.right, width: rect.width }]
        : [];
    });
  }, allowSelectors);
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

export async function expectNoUnexpectedClipping(page: Page, selectors: string[] = ['.card', '.permission-panel', '.operator-service-option', '.result-row']): Promise<void> {
  const clipped = await page.locator(selectors.join(',')).evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element);
    if (style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowX === 'auto' || style.overflowY === 'auto') return [];
    return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
      ? [{ tag: element.tagName, className: String(element.className), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }]
      : [];
  }));
  expect(clipped, JSON.stringify(clipped, null, 2)).toEqual([]);
}

export async function expectVisibleHeading(page: Page, name: RegExp): Promise<void> {
  await expect(page.getByRole('heading', { name })).toBeVisible();
}

export async function expectNoUnexpectedPageErrors(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.waitForTimeout(50);
  expect(errors).toEqual([]);
}

export async function expectVisibleContentWithinViewport(page: Page, selector: string): Promise<void> {
  const offenders = await page.locator(selector).evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || rect.width === 0 || rect.height === 0) return [];
    return rect.left < -1 || rect.right > window.innerWidth + 1 || rect.top < -1 || rect.bottom > document.documentElement.scrollHeight + 1
      ? [{ tag: element.tagName, className: String(element.className), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }]
      : [];
  }));
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

export async function expectNoInternalScrollContainers(page: Page): Promise<void> {
  const offenders = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
    const tag = element.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'select') return [];
    const style = getComputedStyle(element);
    const scrollable = ['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflowY);
    if (!scrollable || element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1) return [];
    return [{ tag: element.tagName, className: String(element.className), overflowX: style.overflowX, overflowY: style.overflowY, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }];
  }));
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
}

export async function assertResponsivePage(page: Page): Promise<void> {
  await expectNoInternalScrollContainers(page);
  await expectNoUnexpectedHorizontalOverflow(page);
  await expectNoVisibleElementOutsideViewport(page);
  await expectNoUnexpectedClipping(page);
}
