#!/usr/bin/env node
// Regenerates tauri.glimpse.conf.json's `app.windows` from tauri.conf.json's,
// so the glimpse channel always inherits every window property (sizing,
// titleBarStyle, hiddenTitle, transparency, etc.) automatically. Tauri's
// config merge fully REPLACES arrays rather than merging them — a
// hand-maintained partial override (e.g. just {label, title}) silently
// drops everything else the base config set for that window the moment
// tauri.conf.json's array changes and this one isn't updated to match. Run
// before every build that uses the glimpse config (see build-app.yml) so
// committed drift is impossible: this always regenerates from the current
// base, right before it's used.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseConfigPath = resolve(ROOT, 'src-tauri/tauri.conf.json');
const glimpseConfigPath = resolve(ROOT, 'src-tauri/tauri.glimpse.conf.json');

const base = JSON.parse(readFileSync(baseConfigPath, 'utf8'));
const glimpse = JSON.parse(readFileSync(glimpseConfigPath, 'utf8'));

// Only the visible/identifying strings change per window; every structural
// property (size, chrome, transparency...) is inherited verbatim. Lowercase
// "glimpse" matches the brand's own lowercase "eyeread.in" styling.
const TITLE_OVERRIDES = {
  main: 'eyeread.in glimpse',
  about: 'About eyeread.in glimpse',
  overlay: 'eyeread.in glimpse overlay',
};

glimpse.app = glimpse.app ?? {};
glimpse.app.windows = base.app.windows.map((win) => ({
  ...win,
  ...(TITLE_OVERRIDES[win.label] ? { title: TITLE_OVERRIDES[win.label] } : {}),
}));

writeFileSync(glimpseConfigPath, JSON.stringify(glimpse, null, 2) + '\n');
console.log('[sync-glimpse-windows] regenerated app.windows in tauri.glimpse.conf.json');
