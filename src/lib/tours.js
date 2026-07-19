// Tour tips registry — single source of truth for first-run coach-mark
// tours. Each tour targets exactly one Tauri window (this is a multi-window
// app; `main` and `overlay` are separate React roots, see
// src/windows/MainWindow.jsx and src/windows/OverlayWindow.jsx).
//
// Every step's `id` must be a stable string, unique within its tour, and
// must NOT be derived from its position in the array. useTour tracks "seen"
// state per step (as `${tourId}:${stepId}` in settings.seenTourSteps), so a
// stable id is what lets a step be inserted or appended to an already-shipped
// tour later and show up just for that one new step, in place, for users who
// already finished the rest of the tour — instead of replaying everything.
//
// Adding a new tour is just appending another { id, window, steps } entry.

export const tours = [
  {
    id: 'welcome-main-v1',
    window: 'main',
    steps: [
      {
        id: 'library',
        target: '[data-tour="library"]',
        titleKey: 'tour.welcomeMain.library.title',
        bodyKey: 'tour.welcomeMain.library.body',
        placement: 'right',
      },
      {
        id: 'new-script',
        target: '[data-tour="new-script"]',
        titleKey: 'tour.welcomeMain.newScript.title',
        bodyKey: 'tour.welcomeMain.newScript.body',
        placement: 'bottom',
      },
      {
        id: 'shield-toggle',
        target: '[data-tour="shield-toggle"]',
        titleKey: 'tour.welcomeMain.shield.title',
        bodyKey: 'tour.welcomeMain.shield.body',
        placement: 'bottom',
      },
      {
        id: 'start-reading',
        target: '[data-tour="start-reading"]',
        titleKey: 'tour.welcomeMain.start.title',
        bodyKey: 'tour.welcomeMain.start.body',
        placement: 'top',
      },
    ],
  },
  {
    id: 'welcome-overlay-v1',
    window: 'overlay',
    steps: [
      {
        id: 'ov-shield',
        target: '[data-tour="ov-shield"]',
        titleKey: 'tour.welcomeOverlay.shield.title',
        bodyKey: 'tour.welcomeOverlay.shield.body',
        placement: 'bottom',
      },
      {
        id: 'ov-play',
        target: '[data-tour="ov-play"]',
        titleKey: 'tour.welcomeOverlay.play.title',
        bodyKey: 'tour.welcomeOverlay.play.body',
        placement: 'top',
      },
      {
        id: 'ov-settings',
        target: '[data-tour="ov-settings"]',
        titleKey: 'tour.welcomeOverlay.settings.title',
        bodyKey: 'tour.welcomeOverlay.settings.body',
        placement: 'top',
      },
      {
        id: 'ov-resize',
        target: '[data-tour="ov-resize"]',
        titleKey: 'tour.welcomeOverlay.resize.title',
        bodyKey: 'tour.welcomeOverlay.resize.body',
        placement: 'left',
      },
    ],
  },
  // Per-script settings, inline in the Editor pane (main window). Runs after
  // welcome-main-v1 is fully seen — see useTour's "one auto-start per mount"
  // rule, so this shows up on a later launch rather than immediately
  // chaining off the first tour.
  {
    id: 'welcome-script-settings-editor-v1',
    window: 'main',
    steps: [
      {
        id: 'tracking',
        target: '[data-tour="script-tracking"]',
        titleKey: 'tour.scriptSettingsEditor.tracking.title',
        bodyKey: 'tour.scriptSettingsEditor.tracking.body',
        placement: 'left',
      },
      {
        id: 'appearance',
        target: '[data-tour="script-appearance"]',
        titleKey: 'tour.scriptSettingsEditor.appearance.title',
        bodyKey: 'tour.scriptSettingsEditor.appearance.body',
        placement: 'left',
      },
      {
        id: 'timer',
        target: '[data-tour="script-timer"]',
        titleKey: 'tour.scriptSettingsEditor.timer.title',
        bodyKey: 'tour.scriptSettingsEditor.timer.body',
        placement: 'left',
      },
    ],
  },
  // The same per-script settings, in the independent floating Settings
  // window opened from the overlay's gear icon during a live session.
  {
    id: 'welcome-script-settings-floating-v1',
    window: 'settings',
    steps: [
      {
        id: 'tracking',
        target: '[data-tour="sw-tracking"]',
        titleKey: 'tour.scriptSettingsFloating.tracking.title',
        bodyKey: 'tour.scriptSettingsFloating.tracking.body',
        placement: 'bottom',
      },
      {
        id: 'appearance',
        target: '[data-tour="sw-appearance"]',
        titleKey: 'tour.scriptSettingsFloating.appearance.title',
        bodyKey: 'tour.scriptSettingsFloating.appearance.body',
        placement: 'bottom',
      },
      {
        id: 'timer',
        target: '[data-tour="sw-timer"]',
        titleKey: 'tour.scriptSettingsFloating.timer.title',
        bodyKey: 'tour.scriptSettingsFloating.timer.body',
        placement: 'top',
      },
    ],
  },
];

export const toursForWindow = (windowName) => tours.filter((t) => t.window === windowName);

export const tourStepKey = (tourId, stepId) => `${tourId}:${stepId}`;
