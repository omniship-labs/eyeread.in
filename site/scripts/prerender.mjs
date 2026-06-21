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
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  locales,
  localePath,
  resources,
  SITE_URL,
  DEFAULT_LOCALE,
} from '../src/i18n/registry.js';

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

function renderLocale(template, locale) {
  const { code, og } = locale;
  const { title, description } = resources[code].translation.meta;
  const url = abs(localePath(code));

  let html = template;

  // Non-default locales live in a subdirectory (/es/…); make the bundle's
  // relative "./assets/…" references root-absolute so they still resolve.
  if (code !== DEFAULT_LOCALE) html = html.replace(/(src|href)="\.\//g, '$1="/');

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
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
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

await writeFile(resolve(DIST, 'sitemap.xml'), sitemap());
await writeFile(
  resolve(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`
);

console.log(`[site:prerender] wrote ${locales.length} locale pages + sitemap.xml + robots.txt`);
