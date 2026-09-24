import { defineConfig, devices } from '@playwright/test';

/**
 * Pack sandbox isolation tests (tests/packs-host). They serve the app's own
 * sandbox bootstrap and CSP from a small stand-in for the `packhost:`
 * protocol and check what real engines let a sandbox do: WebKit is the engine
 * of the macOS and Linux webviews, Chromium of WebView2 on Windows.
 */
export default defineConfig({
  testDir: './tests/packs-host',
  reporter: process.env.CI ? [['list']] : 'list',
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'chromium',
      // PW_CHROME_CHANNEL=chrome runs against an installed Chrome instead of
      // Playwright's own Chromium download.
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PW_CHROME_CHANNEL || undefined,
      },
    },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
