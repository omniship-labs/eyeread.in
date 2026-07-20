import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the marketing site (site/).
 *
 * These are responsiveness / visual checks: every project renders the same
 * pages at a different viewport, captures a full-page screenshot (plain
 * page.screenshot(), no toHaveScreenshot() — the layout has no baseline
 * committed to compare against locally), and asserts the layout never
 * overflows horizontally — the class of bug that pushed the download CTA
 * off-screen on phones.
 *
 * In CI, .github/workflows/site-e2e.yml diffs the resulting screenshots
 * against a same-run capture of the PR's base commit — see that workflow's
 * doc comment (and playwright.app.config.js's, which does the equivalent for
 * the app) for why the diffing happens out-of-process instead of via
 * toHaveScreenshot() directly.
 *
 * The browser binary is downloaded from cdn.playwright.dev; in sandboxed
 * environments that host must be on the network egress allowlist, and
 * `npx playwright install chromium` must have been run at least once.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT) || 4321;

export default defineConfig({
  testDir: './site/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  // One project per viewport. All use the bundled Chromium so no extra
  // browser channels or system installs are required.
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `npm run site:og && npx vite --config site/vite.config.js --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
