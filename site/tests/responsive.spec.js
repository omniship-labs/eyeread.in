import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mockExternalData } from './mock-external-data.mjs';

// Full-page screenshots land here (git-ignored) so they can be eyeballed or
// uploaded as CI artifacts. One file per viewport, named after the project.
const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), 'screenshots');

test.beforeEach(async ({ page }) => {
  await mockExternalData(page);
  await page.goto('/');
  // Fonts/images settle before we measure or shoot.
  await page.waitForLoadState('networkidle');
});

test('captures a full-page screenshot', async ({ page }, testInfo) => {
  await page.screenshot({
    path: resolve(SHOTS, `home-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test('page does not scroll horizontally', async ({ page }) => {
  // The bug we guard against: secondary controls pushing content wider than
  // the viewport, producing a horizontal scrollbar / clipped CTA.
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  // Allow 1px for sub-pixel rounding.
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});

test('the download CTA is fully within the viewport', async ({ page }) => {
  const cta = page.locator('nav .btn-accent');
  await expect(cta).toBeVisible();

  const box = await cta.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
});

test('the language switcher lives in the footer, not the nav', async ({ page }) => {
  await expect(page.locator('footer .lang-switch')).toHaveCount(1);
  await expect(page.locator('nav .lang-switch')).toHaveCount(0);
});
