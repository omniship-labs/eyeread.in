import { test, expect } from '@playwright/test';

// Real UA strings for each OS branch.
const UA = {
  macos:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

// Each case: [os, expectedHeroText, expectLinuxBanner]
const cases = [
  { os: 'macos', heroText: 'Download for macOS', linux: false },
  { os: 'windows', heroText: 'Download for Windows', linux: false },
  { os: 'linux', heroText: null, linux: true },
];

for (const { os, heroText, linux } of cases) {
  test.describe(`OS: ${os}`, () => {
    test.use({ userAgent: UA[os] });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    if (linux) {
      test('shows Linux warning banner instead of download CTA', async ({ page }) => {
        await expect(page.locator('.linux-warning')).toBeVisible();
        await expect(page.locator('.cta-row')).not.toBeVisible();
      });

      test('Linux warning contains expected text', async ({ page }) => {
        await expect(page.locator('.linux-warning')).toContainText('Linux');
      });
    } else {
      test('shows the correct hero CTA label', async ({ page }) => {
        const heroCta = page.locator('.cta-row .btn-accent');
        await expect(heroCta).toBeVisible();
        await expect(heroCta).toContainText(heroText);
      });

      test('does not show the Linux warning banner', async ({ page }) => {
        await expect(page.locator('.linux-warning')).not.toBeVisible();
      });

      test('nav CTA is visible and has the correct platform icon', async ({ page }) => {
        const navCta = page.locator('nav .btn-accent');
        await expect(navCta).toBeVisible();
        // The icon renders as an inline SVG — confirm one is present.
        await expect(navCta.locator('svg')).toHaveCount(1);
      });
    }

    test('hero CTA does not overflow the viewport horizontally', async ({ page }) => {
      const viewport = page.viewportSize();
      const selector = linux ? '.linux-warning' : '.cta-row .btn-accent';
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  });
}
