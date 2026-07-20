// Human-readable label for each screenshot's base name — the exact string
// passed to toHaveScreenshot() in visual.spec.js, before Playwright appends
// -{locale}-{platform}. scripts/compare-screenshots.mjs uses this for the PR
// comment table's Screenshot column; the raw filename on its own conveys
// nothing to a reviewer.
export const APP_SCREENSHOT_DESCRIPTIONS = {
  'main-library': 'Main window — library + editor',
  'lib-search-row': 'Main window — library search row',
  'main-settings': 'Main window — settings pane',
  'settings-head': 'Main window — settings header',
  'main-dyslexic-font': 'Main window — dyslexic-friendly font',
  'main-ui-scale-130': 'Main window — 130% UI scale',
  'main-min-size': 'Main window — minimum size',
  'main-large-size': 'Main window — maximized size',
  'overlay-panel': 'Reading overlay — popup',
  'overlay-dyslexic-font': 'Reading overlay — dyslexic-friendly font',
  'overlay-high-contrast': 'Reading overlay — high contrast',
  about: 'About window',
};
