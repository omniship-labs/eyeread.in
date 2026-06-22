import React from 'react';
import ReactDOM from 'react-dom/client';

// Self-hosted fonts (exact family names the design tokens expect)
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/hanken-grotesk/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
// Optional dyslexia-friendly reading face (off by default; toggled in Settings)
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';

// Design-system tokens (single source of truth), minus its CDN fonts.css —
// src/styles/fonts.css declares the same variables for the local faces.
import './styles/fonts.css';
import '../design/tokens/colors.css';
import '../design/tokens/typography.css';
import '../design/tokens/spacing.css';
import '../design/tokens/effects.css';
import '../design/tokens/base.css';

import './styles/app.css';
import './windows/main/main-window.css';
import './windows/overlay/overlay.css';
import './windows/settings/settings-window.css';

// Initialise i18next (language detection + resources) before the app mounts.
import './i18n/index.js';
import { App } from './App';
import { initPlatform } from './lib/tauri';

// Resolve the real OS via Tauri before any component reads the platform flags.
// In the web demo initPlatform() is a no-op and returns immediately.
initPlatform().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
