import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mockExternalData } from './mock-external-data.mjs';

const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), 'screenshots');

// Real UA strings for each OS branch.
const UA = {
  macos:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

// Each case: [os, expected hero CTA label, whether the Linux compatibility
// warning shows]. Linux gets a real CTA same as the others — the warning is
// an additional note above it (compositor-dependent invisibility), not a
// substitute for a working download button.
const cases = [
  { os: 'macos', heroText: 'Download for macOS', linux: false },
  { os: 'windows', heroText: 'Download for Windows', linux: false },
  { os: 'linux', heroText: 'Download for Linux', linux: true },
];

for (const { os, heroText, linux } of cases) {
  test.describe(`OS: ${os}`, () => {
    test.use({ userAgent: UA[os] });

    test.beforeEach(async ({ page }) => {
      await mockExternalData(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('shows the correct hero CTA label', async ({ page }) => {
      const heroCta = page.locator('.cta-row .btn-accent');
      await expect(heroCta).toBeVisible();
      await expect(heroCta).toContainText(heroText);
    });

    test('nav CTA is visible and has the correct platform icon', async ({ page }) => {
      const navCta = page.locator('nav .btn-accent');
      await expect(navCta).toBeVisible();
      // The icon renders as an inline SVG — confirm one is present.
      await expect(navCta.locator('svg')).toHaveCount(1);
    });

    if (linux) {
      test('shows the Linux warning banner alongside the download CTA', async ({ page }) => {
        await expect(page.locator('.linux-warning')).toBeVisible();
        await expect(page.locator('.cta-row')).toBeVisible();
      });

      test('Linux warning contains expected text', async ({ page }) => {
        await expect(page.locator('.linux-warning')).toContainText('Linux');
      });
    } else {
      test('does not show the Linux warning banner', async ({ page }) => {
        await expect(page.locator('.linux-warning')).not.toBeVisible();
      });
    }

    test('hero CTA does not overflow the viewport horizontally', async ({ page }) => {
      const viewport = page.viewportSize();
      const box = await page.locator('.cta-row .btn-accent').boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    });

    // Screenshot, once per OS — the home page's OS-detected hero variant
    // (Linux uniquely renders a compatibility warning banner) had zero
    // visual coverage before this; the plain responsive.spec.js capture
    // only ever exercises whichever OS the CI runner reports as (always
    // Linux). Desktop-only: the hero variation itself is what's under test,
    // not per-viewport layout (already covered by responsive.spec.js).
    test('captures a full-page screenshot of the hero for this OS', async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'desktop',
        'screenshot captured once, at desktop only'
      );
      await page.screenshot({ path: resolve(SHOTS, `hero-${os}.png`), fullPage: true });
    });
  });
}
