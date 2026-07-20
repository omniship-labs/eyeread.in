import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Full-page screenshots land here (git-ignored) so they can be eyeballed or
// uploaded as CI artifacts. One file per viewport, named after the project.
const SHOTS = resolve(dirname(fileURLToPath(import.meta.url)), 'screenshots');

// The home page fetches live GitHub data at runtime — OpenSource.jsx's star
// count and useLatestReleases' release manifest — and only renders parts of
// its layout once those fetches resolve (e.g. the "★ N" badge is entirely
// absent until the star-count fetch succeeds). That's genuinely
// non-deterministic across two captures a few seconds apart in CI: this
// exact thing once produced a ~19px page-height diff between a base and
// head capture with zero site code changed, because the unauthenticated
// api.github.com rate limit (60/hr, shared across every worker/viewport/leg
// in one run) got hit on one capture but not the other. Stub every external
// call the page makes so its rendered content — and thus the screenshot —
// is identical every run, in CI or locally.
const FIXTURE_RELEASE = {
  tag_name: 'v0.1.0',
  name: 'eyeread.in (0.1.0)',
  published_at: '2026-01-01T00:00:00Z',
  assets: [
    {
      name: 'eyeread.in_0.1.0_x64-setup.exe',
      browser_download_url: 'https://example.com/x64-setup.exe',
    },
    {
      name: 'eyeread.in_0.1.0_arm64-setup.exe',
      browser_download_url: 'https://example.com/arm64-setup.exe',
    },
    {
      name: 'eyeread.in_0.1.0_amd64.AppImage',
      browser_download_url: 'https://example.com/app.AppImage',
    },
    { name: 'eyeread.in_0.1.0.dmg', browser_download_url: 'https://example.com/app.dmg' },
  ],
};
const SHIELDS_BADGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#555"/></svg>';

async function mockExternalData(page) {
  await page.route('https://api.github.com/repos/omniship-labs/eyeread.in**', (route) => {
    const url = route.request().url();
    if (url.includes('/releases')) {
      return route.fulfill({
        json: url.includes('/latest') ? FIXTURE_RELEASE : [FIXTURE_RELEASE],
      });
    }
    return route.fulfill({ json: { stargazers_count: 1234 } });
  });
  await page.route('https://img.shields.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SHIELDS_BADGE_SVG })
  );
}

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
