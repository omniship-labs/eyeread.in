import { describe, it, expect } from 'vitest';
import { matchPath } from 'react-router-dom';
import en from './content.en.js';
import {
  DOCS_NS,
  DOCS_ROUTE,
  DOCS_SLUG_ROUTE,
  docsPages,
  docsPath,
  docsMeta,
  docsResources,
} from './registry.js';

// Array fields each page component iterates (via t(..., { returnObjects: true }))
// or renders directly. If a future translation drops or renames one of these,
// the page would render blank or throw — this keeps that contract honest.
const REQUIRED_ARRAYS = {
  index: ['intro', 'cards'],
  build: ['prereqs', 'platforms'],
  architecture: ['windows', 'designBody', 'dataBody'],
  contributing: ['looking', 'askFirst', 'checklist'],
  tauriApi: ['plugins'],
  packs: ['whatBody', 'permissions', 'agentBody', 'connectedBody'],
};

describe('docs registry', () => {
  it('keeps the docs in their own i18next namespace', () => {
    expect(DOCS_NS).toBe('docs');
    // English resources are the bundle the prerender + components read.
    expect(docsResources.en).toBe(en);
  });

  it('has unique slugs and keys, with exactly one index page', () => {
    const slugs = docsPages.map((p) => p.slug);
    const keys = docsPages.map((p) => p.key);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect(slugs.filter((s) => s === '')).toHaveLength(1);
  });

  it('serves the index at the docs root and pages in a subdirectory', () => {
    expect(docsPath('')).toBe('/docs/');
    expect(docsPath('architecture')).toBe('/docs/architecture/');
  });

  describe.each(docsPages)('page "$key" ($slug)', ({ key }) => {
    const page = en[key];

    it('exists in the English bundle with the strings the chrome needs', () => {
      expect(page, `en.${key}`).toBeDefined();
      // nav label (sidebar), title + description (head/prerender + H1/lead).
      expect(page.nav, `${key}.nav`).toBeTruthy();
      expect(page.title, `${key}.title`).toBeTruthy();
      expect(page.description, `${key}.description`).toBeTruthy();
    });

    it('exposes a head title/description via docsMeta', () => {
      const { title, description } = docsMeta(key);
      expect(title).toBe(`${page.title} · eyeread.in`);
      expect(description).toBe(page.description);
    });

    it('has the non-empty arrays its component renders', () => {
      for (const field of REQUIRED_ARRAYS[key] || []) {
        expect(Array.isArray(page[field]), `${key}.${field} is an array`).toBe(true);
        expect(page[field].length, `${key}.${field} is non-empty`).toBeGreaterThan(0);
      }
    });
  });

  it('links every overview card to a real docs page', () => {
    const keys = new Set(docsPages.map((p) => p.key));
    for (const card of en.index.cards) {
      expect(keys.has(card.key), `card → ${card.key}`).toBe(true);
      expect(card.title).toBeTruthy();
      expect(card.body).toBeTruthy();
    }
  });
});

// Every translated locale is partial by design (page by page — see
// content.en.js's header comment), but whatever a locale DOES translate must
// shadow the English shape exactly: same keys, same array lengths. A missing
// or renamed field would silently fall back to English mid-page instead of
// failing loudly, so this is the thing that actually catches that.
describe('translated docs bundles match the English shape', () => {
  const locales = Object.keys(docsResources).filter((code) => code !== 'en');

  describe.each(locales)('%s', (code) => {
    const bundle = docsResources[code];

    it.each(Object.keys(bundle))('page "%s" has the same keys as English, in order', (key) => {
      expect(en[key], `en.${key} exists`).toBeDefined();
      expect(Object.keys(bundle[key])).toEqual(Object.keys(en[key]));
    });

    it.each(Object.keys(bundle).filter((key) => Array.isArray(bundle[key]?.permissions)))(
      'page "%s": permission names are untranslated technical literals',
      (key) => {
        expect(bundle[key].permissions.map((p) => p.name)).toEqual(
          en[key].permissions.map((p) => p.name)
        );
      }
    );

    it.each(
      Object.keys(bundle).flatMap((key) =>
        Object.keys(bundle[key])
          .filter((field) => Array.isArray(bundle[key][field]))
          .map((field) => [key, field])
      )
    )('page "%s": array field "%s" has the same length as English', (key, field) => {
      expect(bundle[key][field]).toHaveLength(en[key][field].length);
    });
  });
});

// The prerender writes pages at trailing-slash URLs (/docs/, /docs/build/);
// the router must match those exact paths or direct loads render nothing.
describe('docs routing', () => {
  it('matches the index at the prerendered docs root', () => {
    expect(matchPath(DOCS_ROUTE, docsPath(''))).not.toBeNull();
  });

  it('resolves every page slug from its prerendered URL', () => {
    for (const { slug } of docsPages.filter((p) => p.slug)) {
      const match = matchPath(DOCS_SLUG_ROUTE, docsPath(slug));
      expect(match, `match ${docsPath(slug)}`).not.toBeNull();
      expect(match.params.slug).toBe(slug);
    }
  });

  it('does not match a sub-page against the index route', () => {
    // …so the more specific /docs/:slug route is what handles pages.
    expect(matchPath(DOCS_ROUTE, docsPath('build'))).toBeNull();
  });
});
