import { test, expect } from '@playwright/test';
import { tours, tourStepKey } from '../../src/lib/tours.js';

// Every first-run tour step, pre-marked "seen" so the coach-mark tooltips
// (see src/hooks/useTour.js) never render over these screenshots — this
// spec is about layout/styling, not the tour UX.
const SEEN_TOUR_STEPS = tours.flatMap((tour) =>
  tour.steps.map((step) => tourStepKey(tour.id, step.id))
);

// Baseline settings seeded before every page load in a test, including
// popups (see seedSettings below):
//   - voice off, so "Start reading" never opens the mic/speech permissions
//     modal (see usePermissionsGate.js) — a separate, non-visual concern.
//   - reduced motion, so a screenshot never lands mid-transition.
//   - every tour step marked seen (see above).
const BASE_SETTINGS = { voice: false, reduceMotion: true, seenTourSteps: SEEN_TOUR_STEPS };

// Seeds localStorage settings for every page this context creates from now
// on (context-level, not page-level, so the overlay's window.open() popup —
// a separate page in the same browsing context — gets them too). Call again
// with overrides inside a test, before navigating, to layer a11y-setting
// variations (dyslexic font, high contrast, UI scale) on top of the baseline.
async function seedSettings(context, overrides = {}) {
  const settings = { ...BASE_SETTINGS, ...overrides };
  await context.addInitScript((s) => {
    localStorage.setItem('eyeread.settings.v1', JSON.stringify(s));
  }, settings);
}

test.beforeEach(async ({ context }) => {
  await seedSettings(context);
});

// Opens the overlay as a real window.open() popup (see src/lib/tauri.js's
// showOverlay) and settles it into a stable, screenshot-ready state.
async function openOverlay(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-tour="start-reading"]')).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-tour="start-reading"]').click();
  const overlay = await popupPromise;
  // The web-demo overlay inherits the context's viewport by default rather
  // than the size window.open() requested — set it to roughly the native
  // overlay window's proportions instead (src-tauri/tauri.conf.json).
  await overlay.setViewportSize({ width: 700, height: 420 });
  await overlay.waitForLoadState('networkidle');
  await expect(overlay.locator('.overlay-panel')).toBeVisible();
  // Script text loads independently in the popup (its own fetchScripts()
  // call, see src/windows/OverlayWindow.jsx) — wait for real words before
  // touching anything else.
  await expect(overlay.locator('.ov-body')).toContainText('Good morning');

  // The web demo's overlay:load (showOverlay's window.open() branch in
  // src/lib/tauri.js) lands on a deliberate 600ms setTimeout, independent of
  // — and slower than — the popup's own script fetch above. That event is
  // what sets `playing` true, so `playing` is a real race until it lands: a
  // single blind click on the play/pause button could land BEFORE it (and
  // accidentally start playback instead of stopping it) only to have
  // overlay:load re-set it true a moment later anyway, leaving the session
  // playing — and the screenshot racing a moving highlight/timer — either
  // way. Wait for the confirmed true state via aria-pressed first, then
  // pause from there, so the outcome doesn't depend on which side of the
  // 600ms line the click happened to land.
  // Timeout padded well past the 600ms delay above — under load (parallel
  // workers, a busy CI runner) scheduling jitter on top of it can otherwise
  // exceed Playwright's default 5s assertion timeout.
  const playBtn = overlay.locator('[data-tour="ov-play"]');
  await expect(playBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  await playBtn.click();
  await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
  // Now that playback is stopped, reset the active word/elapsed time to a
  // fixed point. Restart is the first icon in the toolbar (no
  // locale-independent data-tour hook for it).
  await overlay.locator('.ov-foot .ic').first().click();
  return overlay;
}

test.describe('main window', () => {
  test.use({ viewport: { width: 1180, height: 760 } }); // native window size, src-tauri/tauri.conf.json

  test('library + editor', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The seeded example scripts (src/lib/store.js's seedScripts) load
    // asynchronously; wait for the first one before shooting.
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-library.png');
    // Close-up of the search + new-script row — the highest-risk spot for
    // clipped translated button/placeholder text. Caught a real bug here in
    // de: the search placeholder overruns its input with no ellipsis.
    await expect(page.locator('.lib-search-row')).toHaveScreenshot('lib-search-row.png');
  });

  test('library, narrow panel', async ({ context, page }) => {
    // useListResize's saved width (src/hooks/useListResize.js) — 270px sits
    // in what used to be a dead zone: above the @container lib breakpoint
    // that hides .lib-btn-label (previously 260px), so "New script" still
    // rendered, but below the width the row's content actually needs, so it
    // clipped mid-word with no ellipsis. Raised to 280px specifically so
    // this width now falls on the icon-only side instead.
    await context.addInitScript(() => {
      localStorage.setItem('eyeread:list-width', '270');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page.locator('.lib-search-row')).toHaveScreenshot('lib-search-row-narrow.png');
  });

  test('settings pane', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('.tl-settings').click();
    await expect(page.locator('.settings-main')).toBeVisible();
    await expect(page).toHaveScreenshot('main-settings.png');
    // Close-up of the back button + title + Simple/Advanced toggle — another
    // button-label-dense row worth its own tight diff surface.
    await expect(page.locator('.settings-head')).toHaveScreenshot('settings-head.png');
  });

  test('dyslexic font', async ({ context, page }) => {
    // Swaps --font-sans app-wide (buttons, labels, body text) and gives the
    // prompter roomier spacing — see useDyslexicFont's doc comment.
    await seedSettings(context, { dyslexicFont: true });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-dyslexic-font.png');
  });

  test('show icon labels', async ({ context, page }) => {
    // Accessibility setting (src/lib/store.js's showIconLabels) that forces
    // text labels next to every icon-only control — titlebar shield/
    // shortcuts/settings here, the overlay toolbar/passthru in the overlay
    // suite below. Caught real bugs during development: the titlebar shield
    // button's icon collapsing to 0-width when its width didn't expand to
    // fit the label, and the overlay's tour tip becoming fully unclickable
    // from an inherited pointer-events: none on its measurement wrapper.
    await seedSettings(context, { showIconLabels: true });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page.locator('.titlebar')).toHaveScreenshot('main-titlebar-icon-labels.png');
  });

  test('ui scale 130%', async ({ context, page }) => {
    // useUiScale applies CSS `zoom` to the document element (main/settings/
    // about only — the overlay opts out, see its doc comment), so a fixed
    // viewport at 130% zoom would clip content that fit at 100%. Grow the
    // viewport by the same factor so the zoomed layout still fits, same as
    // a real resizable OS window would.
    await page.setViewportSize({ width: 1534, height: 988 });
    await seedSettings(context, { uiScale: 130 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-ui-scale-130.png');
  });

  test('minimum window size', async ({ page }) => {
    // src-tauri/tauri.conf.json's minWidth/minHeight for the "main" window —
    // the smallest a user can actually resize it to. Catches cramped-layout
    // bugs (overlapping controls, clipped labels) the roomy default can't.
    await page.setViewportSize({ width: 940, height: 620 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-min-size.png');
  });

  test('large window size', async ({ page }) => {
    // No maxWidth/maxHeight is set in tauri.conf.json, so this checks the
    // other direction — a generously stretched window, where fixed-width
    // panels (Library sidebar, the reading-defaults card) should stay put
    // rather than looking sparse or misaligned against the extra space.
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ed-title')).toHaveValue('Q3 All-Hands');
    await expect(page).toHaveScreenshot('main-large-size.png');
  });
});

test.describe('overlay', () => {
  test.use({ viewport: { width: 1180, height: 760 } });

  test('reading session popup', async ({ page }) => {
    const overlay = await openOverlay(page);
    await expect(overlay).toHaveScreenshot('overlay-panel.png');
  });

  test('dyslexic font', async ({ context, page }) => {
    // See the main-window dyslexic-font test — here it also drives
    // ScriptViewer's own `--dyslexic` roomier letter/word-spacing.
    await seedSettings(context, { dyslexicFont: true });
    const overlay = await openOverlay(page);
    await expect(overlay).toHaveScreenshot('overlay-dyslexic-font.png');
  });

  test('high contrast', async ({ context, page }) => {
    // Only affects ScriptViewer's word-opacity bell curve (see its
    // bellOpacity helper) — the overlay is the only surface it touches.
    await seedSettings(context, { highContrast: true });
    const overlay = await openOverlay(page);
    await expect(overlay).toHaveScreenshot('overlay-high-contrast.png');
  });

  test('show icon labels', async ({ context, page }) => {
    // See the main-window "show icon labels" test — this is the overlay
    // side: shield/close in the head row, restart/back/play/skip/text-size/
    // settings/click-through in the foot toolbar, all normally icon-only.
    await seedSettings(context, { showIconLabels: true });
    const overlay = await openOverlay(page);
    await expect(overlay).toHaveScreenshot('overlay-icon-labels.png');
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
