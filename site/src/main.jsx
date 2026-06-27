import React from 'react';
import { createRoot } from 'react-dom/client';

// Design tokens come straight from the design system's blessed entry point
// (AGENTS.md: "design/styles.css is imported directly … don't duplicate tokens").
import '../../design/styles.less';
// Marketing-specific styling layered on top of the tokens.
import './styles/base.less';
import './styles/layout.less';
import './styles/components.less';
import './styles/docs.less';

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
