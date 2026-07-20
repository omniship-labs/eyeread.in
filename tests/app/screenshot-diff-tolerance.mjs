// Shared between playwright.app.config.js (live toHaveScreenshot() runs) and
// scripts/compare-app-screenshots.mjs (the CI job that diffs two already-
// captured screenshot sets against each other) so both paths tolerate the
// exact same amount of pixel drift — see playwright.app.config.js's doc
// comment for why a nonzero tolerance is needed at all.
export const MAX_DIFF_PIXEL_RATIO = 0.005;
