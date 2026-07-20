#!/usr/bin/env node
/**
 * compare-screenshots.mjs
 *
 * Diffs two directories of already-captured PNGs (matched by filename) — a
 * base-commit and head-commit screenshot set, each produced by its own CI
 * job. Shared by app-e2e.yml (tests/app/visual.spec.js) and site-e2e.yml
 * (site/tests/responsive.spec.js). This exists because neither Playwright's
 * toHaveScreenshot() nor a plain page.screenshot() has a built-in way to
 * compare two PNGs that already exist on disk from separate runs — they only
 * ever capture fresh at assertion time.
 *
 * Usage: node scripts/compare-screenshots.mjs <baselineDir> <headDir> <outDir> [imageBaseUrl]
 *
 * A file present in headDir but not baselineDir (a screenshot this PR adds)
 * is reported as NEW, not a failure — there is nothing to compare it
 * against yet. Likewise a file only in baselineDir is REMOVED, not a
 * failure. Only files present in both, whose pixel diff exceeds
 * MAX_DIFF_PIXEL_RATIO, count as a FAIL. Exits non-zero iff any FAIL.
 *
 * Every screenshot's relevant PNG(s) — expected/actual/diff for a FAIL, just
 * actual for NEW/PASS, just expected for REMOVED — are written to
 * <outDir>/images/, so the PR comment can show a thumbnail for every row,
 * not just the ones that changed. `imageBaseUrl`, if given, is the URL
 * prefix those files will be reachable at once published (see the caller
 * workflow's "Publish diff images" step) — the PR comment embeds/links them
 * from there. It's safe to reference a URL before the images are actually
 * pushed: nothing reads it until the PR comment is posted, by which point
 * they exist.
 */
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { MAX_DIFF_PIXEL_RATIO } from '../tests/app/screenshot-diff-tolerance.mjs';
import { APP_SCREENSHOT_DESCRIPTIONS } from '../tests/app/screenshot-descriptions.mjs';
import { SITE_SCREENSHOT_DESCRIPTIONS } from '../site/tests/screenshot-descriptions.mjs';

const SCREENSHOT_DESCRIPTIONS = {
  ...APP_SCREENSHOT_DESCRIPTIONS,
  ...SITE_SCREENSHOT_DESCRIPTIONS,
};

const [, , baselineDir, headDir, outDir, imageBaseUrl] = process.argv;
if (!headDir || !outDir) {
  console.error(
    'Usage: node scripts/compare-screenshots.mjs <baselineDir> <headDir> <outDir> [imageBaseUrl]'
  );
  process.exit(2);
}

async function pngNames(dir) {
  if (!dir || !existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith('.png')).sort();
}

async function readPng(path) {
  return PNG.sync.read(await readFile(path));
}

// GitHub's markdown tables render raw HTML in cells, which plain
// ![](url) syntax can't do anything useful with here — that would embed
// the image at full native size (a screenshot is up to 1600×1000) and blow
// out every row. An <img width> tag gives an actual thumbnail, wrapped in
// a link to the full-size original.
const THUMB_WIDTH = 200;
function thumbnail(url) {
  return `<a href="${url}"><img src="${url}" width="${THUMB_WIDTH}"></a>`;
}

// Strips the -{locale}/-{project} and -{platform} suffixes Playwright (app)
// or the test itself (site) appends after the base name, so the remainder
// can be looked up in SCREENSHOT_DESCRIPTIONS — e.g. `about-de-linux` ->
// `about`, `home-desktop` -> `home`. Only ever strips known, fixed tokens
// (the current locale/project/platform values used across both suites), so
// it can't silently mis-strip an unrelated screenshot name — checked only
// after an exact match on the full name fails, so a name that happens to
// end in one of these tokens on purpose (e.g. `hero-macos`, its own direct
// key) isn't stripped down to something no longer in the map.
const KNOWN_SUFFIXES = ['linux', 'macos', 'windows', 'en', 'de', 'desktop', 'tablet', 'mobile'];
const PLATFORM_SUFFIXES = new Set(['linux', 'macos', 'windows']);
function describeScreenshot(pngName) {
  let base = pngName.replace(/\.png$/, '');
  if (SCREENSHOT_DESCRIPTIONS[base]) return SCREENSHOT_DESCRIPTIONS[base];

  const tags = [];
  for (;;) {
    const suffix = KNOWN_SUFFIXES.find((s) => base.endsWith(`-${s}`));
    if (!suffix) break;
    base = base.slice(0, -(suffix.length + 1));
    if (!PLATFORM_SUFFIXES.has(suffix)) tags.unshift(suffix);
  }
  const description = SCREENSHOT_DESCRIPTIONS[base];
  if (!description) return null; // unrecognized — caller falls back to the raw filename
  return tags.length ? `${description} (${tags.join(', ')})` : description;
}

function table(rows, { showPreview = false } = {}) {
  const header = showPreview
    ? '| | Screenshot | Preview | Detail |\n| --- | --- | --- | --- |'
    : '| | Screenshot | Detail |\n| --- | --- | --- |';
  const body = rows
    .map((r) => {
      const description = describeScreenshot(r.name);
      const screenshotCell = description
        ? `${description}<br><sub><code>${r.name}</code></sub>`
        : `\`${r.name}\``;
      const cells = [r.icon, screenshotCell];
      if (showPreview) cells.push(r.previewUrl ? thumbnail(r.previewUrl) : '—');
      cells.push(r.detail);
      return `| ${cells.join(' | ')} |`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

// What a row's thumbnail (and its detail-column links) should point at —
// the diff for a real mismatch (falls back to the actual/head screenshot
// when there's no diff to show, e.g. a size change), the head screenshot
// for a new or unchanged entry, the baseline's for a removed one. null only
// when imageBaseUrl itself is unset (no image host to link to at all).
function previewUrl(r) {
  if (!imageBaseUrl) return null;
  if (r.status === 'fail') {
    return `${imageBaseUrl}/${r.name}-${r.hasDiffImage ? 'diff' : 'actual'}.png`;
  }
  if (r.status === 'new' || r.status === 'pass') return `${imageBaseUrl}/${r.name}-actual.png`;
  if (r.status === 'removed') return `${imageBaseUrl}/${r.name}-expected.png`;
  return null;
}

// The PR comment leads with a one-line count, then the fail/new/removed
// table — each row's own thumbnail right there, no separate image section
// to scroll to — folded behind a <details> like the unchanged section
// below, EXCEPT it opens automatically the moment there's an actual
// failure: a clean run (only new/removed, or nothing at all) shouldn't
// dump a wall of thumbnails into the comment by default, but a real
// regression should never be one click away from being missed.
function buildMarkdown({ fails, news, removed, passes }) {
  const parts = [
    `**${passes.length} unchanged · ${fails.length} failed · ${news.length} new · ${removed.length} removed**`,
    '',
  ];

  const attention = [
    ...fails.map((r) => {
      const detail = imageBaseUrl
        ? `${r.detail} — [expected](${imageBaseUrl}/${r.name}-expected.png) · [actual](${imageBaseUrl}/${r.name}-actual.png)${r.hasDiffImage ? ` · [diff](${imageBaseUrl}/${r.name}-diff.png)` : ''}`
        : r.detail;
      return { icon: '❌', name: r.name, detail, previewUrl: previewUrl(r) };
    }),
    ...news.map((r) => ({
      icon: '🆕',
      name: r.name,
      detail: 'first run for this screenshot',
      previewUrl: previewUrl(r),
    })),
    ...removed.map((r) => ({
      icon: '🗑️',
      name: r.name,
      detail: 'no longer produced',
      previewUrl: previewUrl(r),
    })),
  ];
  if (attention.length > 0) {
    const plural = attention.length === 1 ? '' : 's';
    const summary =
      fails.length > 0
        ? `${fails.length} failed, ${attention.length} row${plural} total — click to collapse`
        : `${attention.length} row${plural} (no failures) — click to expand`;
    parts.push(
      '',
      `<details${fails.length > 0 ? ' open' : ''}>`,
      `<summary>${summary}</summary>`,
      '',
      table(attention, { showPreview: !!imageBaseUrl }),
      '',
      `</details>`
    );
  } else {
    parts.push('_Nothing changed._');
  }

  if (passes.length > 0) {
    const plural = passes.length === 1 ? '' : 's';
    parts.push(
      '',
      `<details>`,
      `<summary>${passes.length} unchanged screenshot${plural}</summary>`,
      '',
      table(
        passes.map((r) => ({
          icon: '✅',
          name: r.name,
          detail: 'unchanged',
          previewUrl: previewUrl(r),
        })),
        { showPreview: !!imageBaseUrl }
      ),
      '',
      `</details>`
    );
  }

  return parts.join('\n');
}

async function main() {
  const baselineNames = new Set(await pngNames(baselineDir));
  const headNames = new Set(await pngNames(headDir));
  const imagesDir = join(outDir, 'images');
  await mkdir(imagesDir, { recursive: true });

  const results = [];

  for (const name of [...headNames].sort()) {
    if (!baselineNames.has(name)) {
      await copyFile(join(headDir, name), join(imagesDir, `${name}-actual.png`));
      results.push({ name, status: 'new' });
      continue;
    }
    const baselinePath = join(baselineDir, name);
    const headPath = join(headDir, name);
    const a = await readPng(baselinePath);
    const b = await readPng(headPath);
    if (a.width !== b.width || a.height !== b.height) {
      // No pixel diff possible between mismatched dimensions — pixelmatch
      // requires identical width/height. expected/actual are still saved
      // side by side so the size change is at least visible.
      results.push({
        name,
        status: 'fail',
        detail: `size changed ${a.width}×${a.height} → ${b.width}×${b.height}`,
        hasDiffImage: false,
      });
      await copyFile(baselinePath, join(imagesDir, `${name}-expected.png`));
      await copyFile(headPath, join(imagesDir, `${name}-actual.png`));
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.2,
    });
    const ratio = diffPixels / (a.width * a.height);
    if (ratio > MAX_DIFF_PIXEL_RATIO) {
      await writeFile(join(imagesDir, `${name}-diff.png`), PNG.sync.write(diff));
      await copyFile(baselinePath, join(imagesDir, `${name}-expected.png`));
      await copyFile(headPath, join(imagesDir, `${name}-actual.png`));
      results.push({
        name,
        status: 'fail',
        detail: `${diffPixels} px differ (${(ratio * 100).toFixed(2)}%, tolerance ${(MAX_DIFF_PIXEL_RATIO * 100).toFixed(2)}%)`,
        hasDiffImage: true,
      });
    } else {
      // Saved even though nothing changed — the unchanged table shows a
      // collapsed thumbnail per row too, not just a checkmark, so
      // reviewers can spot-check what's actually being asserted without
      // downloading the artifact.
      await copyFile(headPath, join(imagesDir, `${name}-actual.png`));
      results.push({ name, status: 'pass' });
    }
  }

  for (const name of [...baselineNames].sort()) {
    if (!headNames.has(name)) {
      await copyFile(join(baselineDir, name), join(imagesDir, `${name}-expected.png`));
      results.push({ name, status: 'removed' });
    }
  }

  const fails = results.filter((r) => r.status === 'fail');
  const news = results.filter((r) => r.status === 'new');
  const removed = results.filter((r) => r.status === 'removed');
  const passes = results.filter((r) => r.status === 'pass');

  const lines = [
    `${passes.length} unchanged, ${fails.length} failed, ${news.length} new, ${removed.length} removed`,
    '',
  ];
  for (const r of fails) lines.push(`FAIL    ${r.name} — ${r.detail}`);
  for (const r of news) lines.push(`NEW     ${r.name} (no baseline to compare against yet)`);
  for (const r of removed) lines.push(`REMOVED ${r.name}`);
  console.log(lines.join('\n'));

  await writeFile(join(outDir, 'summary.json'), JSON.stringify(results, null, 2));
  await writeFile(
    join(outDir, 'summary.md'),
    buildMarkdown({ fails, news, removed, passes }) + '\n'
  );

  process.exit(fails.length > 0 ? 1 : 0);
}

main();
