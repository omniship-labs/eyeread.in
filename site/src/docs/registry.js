/* ============================================================
   eyeread.in · marketing site — developer-docs registry
   ------------------------------------------------------------
   Pure data: page order, slugs, URL helpers, and the docs
   resource bundles. No browser/JSX deps, so the build-time
   prerender script (Node) can import it to emit a static page
   per docs route with the right <title>/description.

   Docs pages are English-only by default; a page's bundle can
   hold just the keys that page uses (see content.en.js's own
   header comment) — anything a locale doesn't have falls back to
   English via i18next `fallbackLng` (../i18n/index.js), key by
   key, not bundle by bundle. So far only `packs` is translated,
   into every locale the marketing site supports.

   Prerendered <title>/description (docsMeta, and scripts/prerender.mjs)
   stay English-only regardless — docs pages aren't prerendered
   per locale yet, so there's nothing locale-specific to read there.
   ============================================================ */
import en from './content.en.js';
import fr from './content.fr.js';
import de from './content.de.js';
import es from './content.es.js';
import ru from './content.ru.js';
import zh from './content.zh.js';
import ja from './content.ja.js';
import hi from './content.hi.js';
import mr from './content.mr.js';
import ta from './content.ta.js';
import te from './content.te.js';
import kn from './content.kn.js';
import ml from './content.ml.js';

// i18next namespace the docs copy lives under (separate from the
// marketing `translation` namespace so it never affects its shape).
export const DOCS_NS = 'docs';

// Path prefix the docs are served at.
export const DOCS_BASE = '/docs';

// React-router patterns for the docs routes — the single source of truth shared
// by App.jsx's <Routes> and the routing test.
export const DOCS_ROUTE = DOCS_BASE; // '/docs' → index
export const DOCS_SLUG_ROUTE = `${DOCS_BASE}/:slug`; // '/docs/:slug' → a page

// Sidebar order. `slug` is the URL segment ('' = the docs index);
// `key` indexes into the docs content bundle (content.en.js).
export const docsPages = [
  { slug: '', key: 'index' },
  { slug: 'build', key: 'build' },
  { slug: 'architecture', key: 'architecture' },
  { slug: 'contributing', key: 'contributing' },
  { slug: 'tauri-api', key: 'tauriApi' },
  { slug: 'packs', key: 'packs' },
];

// URL a docs page is served at (index lives at the docs root).
export const docsPath = (slug) => (slug ? `${DOCS_BASE}/${slug}/` : `${DOCS_BASE}/`);

// Resources for the `docs` namespace, one entry per locale that has any
// translated docs content. A bundle need not cover every page/key — missing
// ones fall back to English. Add a new language's file here.
export const docsResources = { en, fr, de, es, ru, zh, ja, hi, mr, ta, te, kn, ml };

// Head <title>/description for a page key, from the English bundle.
// The brand name stays constant; only the page label is localized.
export const docsMeta = (key) => {
  const page = en[key] || {};
  return {
    title: `${page.title} · eyeread.in`,
    description: page.description,
  };
};
