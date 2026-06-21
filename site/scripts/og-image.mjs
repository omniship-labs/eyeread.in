#!/usr/bin/env node
/**
 * og-image.mjs — rasterize the social share card.
 *
 * Social scrapers (Twitter/X, Facebook, LinkedIn, Discord, Slack) don't render
 * SVG og:images, so we generate a PNG from the design system's
 * design/assets/brand/og-image.svg at build time. The SVG has live <text> in
 * Space Grotesk, so we feed resvg the actual font (from @fontsource, already a
 * dependency) for a faithful, deterministic render — no system fonts, no
 * network, reproducible in CI.
 *
 * Output: site/public/og-image.png (git-ignored), copied to the site root by
 * Vite → https://get.eyeread.in/og-image.png.
 */
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SVG = resolve(ROOT, 'design', 'assets', 'brand', 'og-image.svg');
const OUT = resolve(ROOT, 'site', 'public', 'og-image.png');

// Weights the og card actually uses (700 wordmark, 500 subtitle).
const FONT_FILES = [
  'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2',
  'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2',
];

const svg = await readFile(SVG, 'utf8');
const fontBuffers = await Promise.all(FONT_FILES.map((p) => readFile(resolve(ROOT, p))));

const resvg = new Resvg(svg, {
  font: { fontBuffers, loadSystemFonts: false, defaultFontFamily: 'Space Grotesk' },
});
const png = resvg.render().asPng();

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, png);
console.log(`[site:og] wrote og-image.png (${(png.length / 1024).toFixed(1)} kB) ← ${SVG}`);
