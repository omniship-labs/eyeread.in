/* ============================================================
   eyeread.in · marketing site — developer-docs registry
   ------------------------------------------------------------
   Pure data: page order, slugs, URL helpers, and the English
   docs resource bundle. No browser/JSX deps, so the build-time
   prerender script (Node) can import it to emit a static page
   per docs route with the right <title>/description.

   Docs are English-only for now; other locales fall back to
   English via i18next `fallbackLng` (../i18n/index.js).
   ============================================================ */
import en from './content.en.js';

// i18next namespace the docs copy lives under (separate from the
// marketing `translation` namespace so it never affects its shape).
export const DOCS_NS = 'docs';

// Path prefix the docs are served at.
export const DOCS_BASE = '/docs';

// Sidebar order. `slug` is the URL segment ('' = the docs index);
// `key` indexes into the docs content bundle (content.en.js).
export const docsPages = [
  { slug: '', key: 'index' },
  { slug: 'build', key: 'build' },
  { slug: 'architecture', key: 'architecture' },
  { slug: 'contributing', key: 'contributing' },
  { slug: 'tauri-api', key: 'tauriApi' },
];

// URL a docs page is served at (index lives at the docs root).
export const docsPath = (slug) => (slug ? `${DOCS_BASE}/${slug}/` : `${DOCS_BASE}/`);

// English resources for the `docs` namespace. Add more locales here.
export const docsResources = { en };

// Resolve a URL path to a docs page (or null if it isn't a docs route).
// Tolerates an optional leading locale segment and trailing slashes.
export const matchDocsRoute = (pathname, localeCodes = []) => {
  const segs = pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  let rest = segs;
  if (rest[0] && localeCodes.includes(rest[0])) rest = rest.slice(1);
  if (rest[0] !== 'docs') return null;
  const slug = rest[1] || '';
  return docsPages.find((p) => p.slug === slug) || null;
};

// Head <title>/description for a page key, from the English bundle.
// The brand name stays constant; only the page label is localized.
export const docsMeta = (key) => {
  const page = en[key] || {};
  return {
    title: `${page.title} · eyeread.in`,
    description: page.description,
  };
};
