#!/usr/bin/env node
/**
 * sync-tokens.mjs
 *
 * The marketing site is a self-contained static bundle (it deploys on its own,
 * separate from the Tauri app), so it needs its design tokens vendored locally.
 * To avoid drift, we never hand-edit those tokens — we generate them straight
 * from the design system's source of truth in `design/tokens/`.
 *
 * Run `npm run site:tokens` (or let the deploy workflow run it) whenever the
 * design tokens change. The output `site/css/tokens.css` is committed so the
 * site stays serveable as-is without a build step.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TOKENS_DIR = resolve(ROOT, 'design', 'tokens');
const OUT = resolve(ROOT, 'site', 'css', 'tokens.css');

// Order matters: fonts (with the Google Fonts @import) first, then the variable
// layers. We deliberately skip base.css — the site ships its own reset/base.
const SOURCES = ['fonts.css', 'colors.css', 'typography.css', 'spacing.css', 'effects.css'];

const header = `/* ============================================================
   eyeread.in · marketing site — design tokens
   GENERATED — do not edit by hand.
   Source: design/tokens/{${SOURCES.join(', ')}}
   Regenerate: npm run site:tokens
   ============================================================ */\n\n`;

const parts = [];
for (const file of SOURCES) {
  const css = await readFile(resolve(TOKENS_DIR, file), 'utf8');
  parts.push(`/* ---- from design/tokens/${file} ---- */\n${css.trim()}\n`);
}

await writeFile(OUT, header + parts.join('\n') + '\n');
console.log(`[site:tokens] wrote ${OUT} from ${SOURCES.length} token file(s)`);
