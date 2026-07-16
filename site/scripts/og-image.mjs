#!/usr/bin/env node
/**
 * og-image.mjs — rasterize the social share card.
 *
 * Social scrapers (Twitter/X, Facebook, LinkedIn, Discord, Slack) don't render
 * SVG og:images, so we generate a PNG from the design system's
 * design/assets/brand/og-image.svg at build time.
 *
 * The SVG's text runs are pre-shaped to <path> outlines here (via
 * opentype.js) rather than left as live <text> for resvg to render. resvg-js
 * 2.6.2's Linux binary has a font-matching bug: a buffered custom font
 * silently falls back to a generic placeholder face there, even though the
 * identical script/font renders correctly on macOS (confirmed by reproducing
 * in a linux/amd64 container — same input, wrong glyphs, no error thrown).
 * Baking glyphs to paths removes resvg's runtime font matching from the
 * picture entirely, so rasterization is deterministic on every platform.
 *
 * Output: site/public/og-image.png (git-ignored), copied to the site root by
 * Vite → https://get.eyeread.in/og-image.png.
 */
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SVG = resolve(ROOT, 'design', 'assets', 'brand', 'og-image.svg');
const OUT = resolve(ROOT, 'site', 'public', 'og-image.png');

// Resolved through the package's exports so this works regardless of cwd or
// whether node_modules is hoisted (monorepo) — not a hard-coded node_modules
// path. Plain .woff, not .woff2 — opentype.js doesn't need brotli either way,
// but .woff keeps this independent of that decoder entirely.
const FONT_SPECS = {
  700: '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff',
  500: '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff',
};

const fontBuffers = Object.fromEntries(
  await Promise.all(
    Object.entries(FONT_SPECS).map(async ([weight, spec]) => [
      weight,
      await readFile(fileURLToPath(import.meta.resolve(spec))),
    ])
  )
);
const fonts = Object.fromEntries(
  Object.entries(fontBuffers).map(([weight, buf]) => [
    weight,
    opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
  ])
);

// Shapes `text` starting at (x, y) in `font` at `fontSizePx`, applying
// `letterSpacing` between glyphs (opentype.js has no built-in equivalent to
// CSS letter-spacing) — returns the path's `d` data and the x position right
// after the last glyph, so a caller can chain another run onto the same line.
function shape(font, text, x, y, fontSizePx, letterSpacing = 0) {
  const scale = fontSizePx / font.unitsPerEm;
  let curX = x;
  let d = '';
  for (const glyph of font.stringToGlyphs(text)) {
    d += glyph.getPath(curX, y, fontSizePx).toPathData(2);
    curX += glyph.advanceWidth * scale + letterSpacing;
  }
  return { d, endX: curX };
}

const wordmark1 = shape(fonts[700], 'eyeread', 660, 290, 72, -2);
const wordmark2 = shape(fonts[700], '.in', wordmark1.endX, 290, 72, -2);
const subtitle1 = shape(fonts[500], 'Invisible teleprompter.', 660, 344, 22);
const subtitle2 = shape(fonts[500], 'Voice tracking built in.', 660, 374, 22);

let svg = await readFile(SVG, 'utf8');
svg = svg
  .replace(
    /<g data-og-text="wordmark"[^>]*>[\s\S]*?<\/g>/,
    `<path d="${wordmark1.d}" fill="#f2f2f7"></path><path d="${wordmark2.d}" fill="#6e56f7"></path>`
  )
  .replace(
    /<g data-og-text="subtitle1"[^>]*>[\s\S]*?<\/g>/,
    `<path d="${subtitle1.d}" fill="#7a7a92"></path>`
  )
  .replace(
    /<g data-og-text="subtitle2"[^>]*>[\s\S]*?<\/g>/,
    `<path d="${subtitle2.d}" fill="#7a7a92"></path>`
  );

const resvg = new Resvg(svg, { font: { loadSystemFonts: false } });
const png = resvg.render().asPng();

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, png);
console.log(`[site:og] wrote og-image.png (${(png.length / 1024).toFixed(1)} kB) ← ${SVG}`);
