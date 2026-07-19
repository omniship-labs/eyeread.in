import { test, expect } from '@playwright/test';
import { tours, tourStepKey } from '../../src/lib/tours.js';

// Every first-run tour step, pre-marked "seen" so the coach-mark tooltips
// (see src/hooks/useTour.js) never render over these screenshots — this
// spec is about layout/styling, not the tour UX.
const SEEN_TOUR_STEPS = tours.flatMap((tour) =>
  tour.steps.map((step) => tourStepKey(tour.id, step.id))
);

// Settings seeded into localStorage before every page load in a test,
// including popups (see the context.addInitScript below):
//   - voice off, so "Start reading" never opens the mic/speech permissions
//     modal (see usePermissionsGate.js) — a separate, non-visual concern.
//   - reduced motion, so a screenshot never lands mid-transition.
//   - every tour step marked seen (see above).
const SEEDED_SETTINGS = { voice: false, reduceMotion: true, seenTourSteps: SEEN_TOUR_STEPS };

test.beforeEach(async ({ context }) => {
  // context-level (not page-level) so the overlay's window.open() popup —
  // a separate page in the same browsing context — gets the same seed.
  await context.addInitScript((settings) => {
    localStorage.setItem('eyeread.settings.v1', JSON.stringify(settings));
  }, SEEDED_SETTINGS);
});

test.describe('main window', () => {
  test.use({ viewport: { width: 1180, height: 760 } }); // native window size, src-tauri/tauri.conf.json

  test('library + editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The seeded example scripts (src/lib/store.js's seedScripts) load
    // asynchronously; wait for the first one before shooting.
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-library.png');
  });

  test('settings pane', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tl-settings').click();
    await expect(page.locator('.settings-main')).toBeVisible();
    await expect(page).toHaveScreenshot('main-settings.png');
  });
});

test.describe('overlay', () => {
  test.use({ viewport: { width: 1180, height: 760 } });

  test('reading session popup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-tour="start-reading"]')).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await page.locator('[data-tour="start-reading"]').click();
    const overlay = await popupPromise;
    // The web-demo overlay opens via window.open() (src/lib/tauri.js's
    // showOverlay) rather than the native window, so it inherits the
    // context's viewport by default — size it to the native overlay
    // window instead (src-tauri/tauri.conf.json).
    await overlay.setViewportSize({ width: 700, height: 420 });
    await overlay.waitForLoadState('networkidle');
    await expect(overlay.locator('.overlay-panel')).toBeVisible();
    // Script text loads independently in the popup (its own fetchScripts()
    // call, see src/windows/OverlayWindow.jsx) — wait for real words before
    // shooting rather than a fixed timeout.
    await expect(overlay.locator('.ov-body')).toContainText('Good morning');
    // A fresh session starts playing (auto-scroll + a ticking elapsed timer,
    // see OverlayWindow.jsx) — pause it, then restart to reset the active
    // word/elapsed time to a fixed point. Otherwise the exact highlighted
    // word is a race against how much the auto-scroll advanced before the
    // pause click landed, making the screenshot flaky. Restart is the
    // first icon in the toolbar (no locale-independent data-tour hook).
    await overlay.locator('[data-tour="ov-play"]').click();
    await overlay.locator('.ov-foot .ic').first().click();
    await expect(overlay).toHaveScreenshot('overlay-panel.png');
  });
});

test.describe('about window', () => {
  // Native size (src-tauri/tauri.conf.json). Reached in-app only via a
  // native OS menu item (showAboutWindow() in src/lib/tauri.js is a no-op
  // outside Tauri) — the web demo has no in-UI path to it, so this
  // navigates straight to its query-param route (see src/App.jsx).
  test.use({ viewport: { width: 424, height: 664 } });

  test('about panel', async ({ page }) => {
    await page.goto('/?window=about');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.aw-root')).toBeVisible();
    await expect(page).toHaveScreenshot('about.png');
  });
});
