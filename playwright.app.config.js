import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the APP (src/) — visual regression, unlike
 * playwright.config.js (the marketing site's responsiveness checks, which
 * only capture artifacts for human review). This one uses toHaveScreenshot()
 * for real automated pixel diffing.
 *
 * No baseline snapshots are committed to the repo — a Chromium build
 * downloaded on one machine doesn't reliably render pixel-identical to one
 * downloaded on another (font hinting, subpixel AA, GPU vs. software
 * rendering all drift across versions/platforms), so a baseline generated
 * anywhere other than the CI runner that will diff against it is a source of
 * false failures, not a safety net. Instead, .github/workflows/app-e2e.yml
 * generates the baseline itself, in the same job, by running this suite
 * against the PR's base commit (or the previous commit, for a push) before
 * running it again against the commit under test — both on identical
 * hardware and an identical Chromium build. Locally, there's nothing to
 * diff against until you run `npm run app:test:update` yourself first.
 *
 * Playwright can't drive the native Tauri window directly, so this drives
 * the plain-browser "web demo" build instead — `npm run dev` on Tauri's
 * fixed dev port (1420, see vite.config.js). Everything works there via
 * BroadcastChannel + window.open fallbacks (see src/lib/tauri.js's header
 * comment), including the overlay, which opens as a real window.open()
 * popup that Playwright's page.waitForEvent('popup') handles natively.
 *
 * The browser binary is downloaded from cdn.playwright.dev; in sandboxed
 * environments that host must be on the network egress allowlist, and
 * `npx playwright install chromium` must have been run at least once.
 */
const PORT = Number(process.env.PLAYWRIGHT_APP_PORT) || 1420;

export default defineConfig({
  testDir: './tests/app',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  expect: {
    toHaveScreenshot: {
      // Small pixel deltas are expected here — subpixel antialiasing/font
      // hinting jitter between two renders of the exact same page state
      // (observed: ~0.006% drift on a language-selector's text label with
      // zero tolerance configured). A real UI change (moved, resized,
      // recolored, or removed element) affects far more of the image than
      // this, so it still gets caught.
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'en',
      use: { locale: 'en-US' },
    },
    {
      // A second locale exercises real translated copy instead of just en —
      // German's long compound words are a good stand-in for the
      // longest-text case (no RTL locale is shipped yet; see src/i18n/locales).
      name: 'de',
      use: { locale: 'de-DE' },
    },
  ],
  webServer: {
    command: `vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
