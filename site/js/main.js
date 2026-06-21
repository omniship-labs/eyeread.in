/* ============================================================
   eyeread.in · marketing site — entry point
   ------------------------------------------------------------
   Wires config → render → interactions → live sponsors.
   ============================================================ */

import { config } from './config.js';
import { renderPage } from './render.js';
import { initDemoSlider } from './demo.js';
import { renderSponsors } from './sponsors.js';

function applyMeta(c) {
  const m = c.meta;
  document.title = m.title;
  const set = (sel, attr, val) => {
    const el = document.head.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', m.description);
  set('meta[property="og:title"]', 'content', m.title);
  set('meta[property="og:description"]', 'content', m.description);
  set('meta[property="og:image"]', 'content', m.ogImage);
  set('meta[property="og:url"]', 'content', m.url);
  set('meta[name="twitter:site"]', 'content', m.twitter);
}

function main() {
  const root = document.getElementById('app');
  if (!root) return;

  applyMeta(config);
  renderPage(root, config);
  initDemoSlider();

  const mount = document.getElementById('sponsorsMount');
  if (mount) renderSponsors(mount, config.sponsors);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
