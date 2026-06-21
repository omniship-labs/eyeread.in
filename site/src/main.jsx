import React from 'react';
import { createRoot } from 'react-dom/client';

// Design tokens come straight from the design system's blessed entry point
// (AGENTS.md: "design/styles.css is imported directly … don't duplicate tokens").
import '../../design/styles.css';
// Marketing-specific styling layered on top of the tokens.
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

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
    <App />
  </React.StrictMode>
);
