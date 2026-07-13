#!/usr/bin/env node
// Regenerates tauri.nightly.conf.json's `app.windows` from tauri.conf.json's,
// so nightly always inherits every window property (sizing, titleBarStyle,
// hiddenTitle, transparency, etc.) automatically. Tauri's config merge fully
// REPLACES arrays rather than merging them — a hand-maintained partial
// override (e.g. just {label, title}) silently drops everything else the
// base config set for that window the moment tauri.conf.json's array
// changes and this one isn't updated to match. Run before every build that
// uses the nightly config (see build-app.yml) so committed drift is
// impossible: this always regenerates from the current base, right before
// it's used.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baseConfigPath = resolve(ROOT, 'src-tauri/tauri.conf.json');
const nightlyConfigPath = resolve(ROOT, 'src-tauri/tauri.nightly.conf.json');

const base = JSON.parse(readFileSync(baseConfigPath, 'utf8'));
const nightly = JSON.parse(readFileSync(nightlyConfigPath, 'utf8'));

// Only the visible/identifying strings change per window; every structural
// property (size, chrome, transparency...) is inherited verbatim.
const TITLE_OVERRIDES = {
  main: 'eyeread.in Nightly',
  about: 'About eyeread.in Nightly',
  overlay: 'eyeread.in Nightly overlay',
};

nightly.app = nightly.app ?? {};
nightly.app.windows = base.app.windows.map((win) => ({
  ...win,
  ...(TITLE_OVERRIDES[win.label] ? { title: TITLE_OVERRIDES[win.label] } : {}),
}));

writeFileSync(nightlyConfigPath, JSON.stringify(nightly, null, 2) + '\n');
console.log('[sync-nightly-windows] regenerated app.windows in tauri.nightly.conf.json');
