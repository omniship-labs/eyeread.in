import React from 'react';
import { createRoot } from 'react-dom/client';

// Design tokens come straight from the design system's blessed entry point
// (AGENTS.md: "design/styles.css is imported directly … don't duplicate tokens"),
// except fonts.less: that one pulls the Google Fonts CDN, which we don't want
// on a site whose CSP and privacy story are meant to hold up under scrutiny.
// Self-hosted @fontsource packages + ./styles/fonts.less substitute for it,
// same pattern the Tauri app uses in src/main.jsx.
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
import './styles/fonts.less';
import '../../design/tokens/colors.less';
import '../../design/tokens/typography.less';
import '../../design/tokens/spacing.less';
import '../../design/tokens/effects.less';
import '../../design/tokens/base.less';
// Marketing-specific styling layered on top of the tokens.
import './styles/base.less';
import './styles/layout.less';
import './styles/components.less';
import './styles/docs.less';
import './styles/download.less';

// Initialise i18next (language detection + resources) before the app mounts.
import { BrowserRouter } from 'react-router-dom';
import './i18n/index.js';
import App from './App.jsx';
import { logoMark } from './assets.js';

// Favicon from the bundled brand mark — no copied favicon file.
const link = document.querySelector("link[rel='icon']") || document.createElement('link');
link.rel = 'icon';
link.type = 'image/svg+xml';
link.href = logoMark;
document.head.appendChild(link);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
