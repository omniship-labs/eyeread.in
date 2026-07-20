import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mockExternalData } from './mock-external-data.mjs';

// /download had zero test coverage, functional or visual, before this —
// unlike the home page, it entirely depends on the mocked release data
// (see mock-external-data.mjs) to render at all: without it, both channel
// sections sit in their loading/error state indefinitely in a test run.
const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), 'screenshots');

test.beforeEach(async ({ page }) => {
  await mockExternalData(page);
  await page.goto('/download');
  await page.waitForLoadState('networkidle');
});

test('shows the platform grid for both the stable and glimpse channels', async ({ page }) => {
  await expect(page.locator('.dl-channel-stable .dl-grid')).toBeVisible();
  await expect(page.locator('.dl-channel-glimpse .dl-grid')).toBeVisible();
});

test('lists the mocked release in the release history', async ({ page }) => {
  await expect(page.locator('.dl-history-item')).toHaveCount(1);
});

test('captures a full-page screenshot', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'screenshot captured once, at desktop only');
  await page.screenshot({ path: resolve(SHOTS, 'download.png'), fullPage: true });
});
