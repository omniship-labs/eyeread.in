#!/usr/bin/env node
/**
 * prerender.mjs — emit per-locale static HTML for SEO + social.
 *
 * The site is a client-rendered SPA on a single bundle, so out of the box
 * crawlers and link scrapers only ever see the English <head>. This runs AFTER
 * `vite build` and, for every locale, writes a static page with:
 *   - <html lang> set (so the i18next htmlTag detector boots that language),
 *   - a localized <title>/description and og:/twitter: tags,
 *   - a canonical URL and full hreflang alternates (+ x-default),
 *   - og:locale (+ og:locale:alternate for the others).
 * Default locale stays at dist/index.html; others go to dist/<code>/index.html.
 * Also writes sitemap.xml and robots.txt.
 *
 * The brand name "eyeread.in" is part of each localized title and is never
 * translated — only the tagline around it changes.
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  locales,
  localePath,
  resources,
  SITE_URL,
  DEFAULT_LOCALE,
} from '../src/i18n/registry.js';
import { docsPages, docsPath, docsMeta } from '../src/docs/registry.js';

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const abs = (path) => `${SITE_URL}${path}`;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Replace the content="…" of a specific <meta>, matched by its name/property attr.
const setMeta = (html, attrSel, value) =>
  html.replace(new RegExp(`(<meta\\s+${attrSel}\\s+content=")[^"]*(")`), `$1${esc(value)}$2`);

// The bundle ships with relative ("./assets/…") references for the site root.
// Pages that live in a subdirectory (/es/…, /docs/…) need them root-absolute
// so they still resolve.
const rootAbsolute = (html) => html.replace(/(src|href)="\.\//g, '$1="/');

function renderLocale(template, locale) {
  const { code, og } = locale;
  const { title, description } = resources[code].translation.meta;
  const url = abs(localePath(code));

  let html = template;

  // Non-default locales live in a subdirectory (/es/…); make the bundle's
  // relative "./assets/…" references root-absolute so they still resolve.
  if (code !== DEFAULT_LOCALE) html = rootAbsolute(html);

  html = html.replace('<html lang="en">', `<html lang="${code}">`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name="description"', description);
  html = setMeta(html, 'property="og:title"', title);
  html = setMeta(html, 'property="og:description"', description);
  html = setMeta(html, 'property="og:url"', url);
  html = setMeta(html, 'property="og:locale"', og);
  html = setMeta(html, 'name="twitter:title"', title);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  // hreflang alternates (+ x-default) and og:locale:alternate, before </head>.
  const hreflangs = [
    ...locales.map(
      (l) => `<link rel="alternate" hreflang="${l.code}" href="${abs(localePath(l.code))}" />`
    ),
    `<link rel="alternate" hreflang="x-default" href="${abs('/')}" />`,
  ];
  const ogAlternates = locales
    .filter((l) => l.code !== code)
    .map((l) => `<meta property="og:locale:alternate" content="${l.og}" />`);
  const injected = [...hreflangs, ...ogAlternates].join('\n    ');
  html = html.replace('</head>', `    ${injected}\n  </head>`);

  return html;
}

// Developer docs are English-only and live under /docs/. Each route gets a
// static page (root-absolute assets) with its own title/description/canonical,
// so deep links and crawlers resolve before the client router ever runs.
function renderDocs(template, page) {
  const { title, description } = docsMeta(page.key);
  const url = abs(docsPath(page.slug));

  let html = rootAbsolute(template);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name="description"', description);
  html = setMeta(html, 'property="og:title"', title);
  html = setMeta(html, 'property="og:description"', description);
  html = setMeta(html, 'property="og:url"', url);
  html = setMeta(html, 'name="twitter:title"', title);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  return html;
}

// /download is English-only for now (like docs) — the release data itself
// is always English regardless of locale, so a translated shell around it
// isn't worth the upkeep yet.
function renderDownload(template) {
  const { title, description } = resources[DEFAULT_LOCALE].translation.download.meta;
  const url = abs('/download/');

  let html = rootAbsolute(template);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name="description"', description);
  html = setMeta(html, 'property="og:title"', title);
  html = setMeta(html, 'property="og:description"', description);
  html = setMeta(html, 'property="og:url"', url);
  html = setMeta(html, 'name="twitter:title"', title);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  return html;
}

function sitemap() {
  const urls = locales
    .map((l) => {
      const alts = locales
        .map(
          (a) =>
            `    <xhtml:link rel="alternate" hreflang="${a.code}" href="${abs(localePath(a.code))}"/>`
        )
        .join('\n');
      return `  <url>\n    <loc>${abs(localePath(l.code))}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${abs('/')}"/>\n  </url>`;
    })
    .join('\n');
  // Docs (and /download) are English-only — a plain <loc>, no hreflang alternates.
  const docs = docsPages
    .map((p) => `  <url>\n    <loc>${abs(docsPath(p.slug))}</loc>\n  </url>`)
    .join('\n');
  const download = `  <url>\n    <loc>${abs('/download/')}</loc>\n  </url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n${docs}\n${download}\n</urlset>\n`;
}

const template = await readFile(resolve(DIST, 'index.html'), 'utf8');

for (const locale of locales) {
  const html = renderLocale(template, locale);
  const out =
    locale.code === DEFAULT_LOCALE
      ? resolve(DIST, 'index.html')
      : resolve(DIST, locale.code, 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html);
}

// Static page per docs route (dist/docs/index.html, dist/docs/<slug>/index.html).
for (const page of docsPages) {
  const html = renderDocs(template, page);
  const out = page.slug
    ? resolve(DIST, 'docs', page.slug, 'index.html')
    : resolve(DIST, 'docs', 'index.html');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, html);
}

// Static page for /download (dist/download/index.html).
await mkdir(resolve(DIST, 'download'), { recursive: true });
await writeFile(resolve(DIST, 'download', 'index.html'), renderDownload(template));

// SPA fallback: GitHub Pages serves 404.html for any unmatched path. Ship the
// bundle (root-absolute assets) so a deep link still boots the client router.
await writeFile(resolve(DIST, '404.html'), rootAbsolute(template));

// Expose the brand mark at a stable public URL (get.eyeread.in/eyeread-mark.svg
// and /favicon.svg). Canonical file is repo-root public/favicon.svg — copied at
// build time, never vendored, so consumers (e.g. omniship.dev) can hotlink it.
const MARK = resolve(DIST, '..', '..', 'public', 'favicon.svg');
await copyFile(MARK, resolve(DIST, 'eyeread-mark.svg'));
await copyFile(MARK, resolve(DIST, 'favicon.svg'));

// Project manifest for the OmniShip Labs homepage build (and anyone else
// listing this project) — this repo is the source of truth for its own
// metadata, so the homepage fetches this instead of hand-copying fields.
await writeFile(
  resolve(DIST, 'omniship-project.json'),
  JSON.stringify(
    {
      repo: 'eyeread.in',
      name: 'eyeread.in',
      category: 'Teleprompter',
      description:
        'Open-source teleprompter that floats your script over any screen — invisible to every recorder, with voice tracking built in. Live at get.eyeread.in.',
      language: 'JavaScript',
      accent: '#6E56F7',
      href: SITE_URL,
      mark: abs('/eyeread-mark.svg'),
    },
    null,
    2
  )
);

await writeFile(resolve(DIST, 'sitemap.xml'), sitemap());
await writeFile(
  resolve(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`
);

console.log(
  `[site:prerender] wrote ${locales.length} locale pages + ${docsPages.length} docs pages + 1 download page + 404.html + sitemap.xml + robots.txt`
);
