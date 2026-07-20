#!/usr/bin/env node
/**
 * compare-app-screenshots.mjs
 *
 * Diffs two directories of already-captured PNGs (matched by filename) — the
 * app visual-regression suite's base-commit and head-commit screenshot sets,
 * each produced by its own CI job (see .github/workflows/app-e2e.yml). This
 * exists because Playwright's toHaveScreenshot() always captures fresh at
 * assertion time; it has no built-in way to compare two PNGs that already
 * exist on disk from separate runs.
 *
 * Usage: node scripts/compare-app-screenshots.mjs <baselineDir> <headDir> <outDir>
 *
 * A file present in headDir but not baselineDir (a screenshot this PR adds)
 * is reported as NEW, not a failure — there is nothing to compare it
 * against yet. Likewise a file only in baselineDir is REMOVED, not a
 * failure. Only files present in both, whose pixel diff exceeds
 * MAX_DIFF_PIXEL_RATIO, count as a FAIL. Exits non-zero iff any FAIL.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { MAX_DIFF_PIXEL_RATIO } from '../tests/app/screenshot-diff-tolerance.mjs';

const [, , baselineDir, headDir, outDir] = process.argv;
if (!headDir || !outDir) {
  console.error(
    'Usage: node scripts/compare-app-screenshots.mjs <baselineDir> <headDir> <outDir>'
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

async function main() {
  const baselineNames = new Set(await pngNames(baselineDir));
  const headNames = new Set(await pngNames(headDir));
  await mkdir(outDir, { recursive: true });

  const results = [];

  for (const name of [...headNames].sort()) {
    if (!baselineNames.has(name)) {
      results.push({ name, status: 'new' });
      continue;
    }
    const a = await readPng(join(baselineDir, name));
    const b = await readPng(join(headDir, name));
    if (a.width !== b.width || a.height !== b.height) {
      results.push({
        name,
        status: 'fail',
        detail: `size changed ${a.width}×${a.height} → ${b.width}×${b.height}`,
      });
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const diffPixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
      threshold: 0.2,
    });
    const ratio = diffPixels / (a.width * a.height);
    if (ratio > MAX_DIFF_PIXEL_RATIO) {
      const diffPath = join(outDir, name.replace(/\.png$/, '-diff.png'));
      await writeFile(diffPath, PNG.sync.write(diff));
      results.push({
        name,
        status: 'fail',
        detail: `${diffPixels} px differ (${(ratio * 100).toFixed(2)}%, tolerance ${(MAX_DIFF_PIXEL_RATIO * 100).toFixed(2)}%)`,
        diffPath,
      });
    } else {
      results.push({ name, status: 'pass' });
    }
  }

  for (const name of [...baselineNames].sort()) {
    if (!headNames.has(name)) results.push({ name, status: 'removed' });
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

  const md = [
    `**${passes.length} unchanged · ${fails.length} failed · ${news.length} new · ${removed.length} removed**`,
    '',
    ...fails.map((r) => `- ❌ \`${r.name}\` — ${r.detail}`),
    ...news.map(
      (r) =>
        `- 🆕 \`${r.name}\` (first run for this screenshot — nothing to compare against yet)`
    ),
    ...removed.map((r) => `- 🗑️ \`${r.name}\` (no longer produced)`),
  ].join('\n');
  await writeFile(join(outDir, 'summary.md'), md + '\n');

  process.exit(fails.length > 0 ? 1 : 0);
}

main();
