import { defineConfig } from '@playwright/test';
import { MAX_DIFF_PIXEL_RATIO } from './tests/app/screenshot-diff-tolerance.mjs';

/**
 * Playwright config for the APP (src/) — visual regression. Unlike
 * playwright.config.js (the marketing site's responsiveness checks, which
 * capture plain page.screenshot()s), this one uses toHaveScreenshot() for
 * real automated pixel diffing.
 *
 * No baseline snapshots are committed to the repo — a Chromium build
 * downloaded on one machine doesn't reliably render pixel-identical to one
 * downloaded on another (font hinting, subpixel AA, GPU vs. software
 * rendering all drift across versions/platforms), so a baseline generated
 * anywhere other than the CI runner that will diff against it is a source of
 * false failures, not a safety net.
 *
 * Instead, .github/workflows/app-e2e.yml runs THIS config twice, in two
 * independent, parallel jobs — once against the PR's base commit (or the
 * previous commit, for a push), once against the commit under test — each
 * just capturing screenshots (`--update-snapshots`) with no comparison
 * happening yet. A third job then diffs the two resulting screenshot sets
 * with scripts/compare-screenshots.mjs, which shares this file's
 * tolerance (MAX_DIFF_PIXEL_RATIO) so both paths agree on what counts as a
 * real change. Playwright's own toHaveScreenshot() can't do this cross-job
 * comparison itself — it always captures fresh at assertion time, it can't
 * diff two already-existing PNGs from separate runs.
 *
 * Locally, there's nothing to diff against until you run
 * `npm run app:test:update` yourself first — that still goes through
 * Playwright's normal toHaveScreenshot() compare-on-repeat-run flow.
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
      // this, so it still gets caught. Shared with the CI compare script —
      // see MAX_DIFF_PIXEL_RATIO's own doc comment.
      maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO,
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
