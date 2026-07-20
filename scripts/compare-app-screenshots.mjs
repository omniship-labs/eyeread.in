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
 * Usage: node scripts/compare-app-screenshots.mjs <baselineDir> <headDir> <outDir> [imageBaseUrl]
 *
 * A file present in headDir but not baselineDir (a screenshot this PR adds)
 * is reported as NEW, not a failure — there is nothing to compare it
 * against yet. Likewise a file only in baselineDir is REMOVED, not a
 * failure. Only files present in both, whose pixel diff exceeds
 * MAX_DIFF_PIXEL_RATIO, count as a FAIL. Exits non-zero iff any FAIL.
 *
 * For each FAIL, the expected/actual/diff PNGs are written to
 * <outDir>/images/. `imageBaseUrl`, if given, is the URL prefix those files
 * will be reachable at once published (see app-e2e.yml's "Publish diff
 * images" step) — the PR comment embeds/links them from there. It's safe to
 * reference a URL before the images are actually pushed: nothing reads it
 * until the PR comment is posted, by which point they exist.
 */
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { MAX_DIFF_PIXEL_RATIO } from '../tests/app/screenshot-diff-tolerance.mjs';

const [, , baselineDir, headDir, outDir, imageBaseUrl] = process.argv;
if (!headDir || !outDir) {
  console.error(
    'Usage: node scripts/compare-app-screenshots.mjs <baselineDir> <headDir> <outDir> [imageBaseUrl]'
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

function table(rows) {
  const header = '| | Screenshot | Detail |\n| --- | --- | --- |';
  const body = rows.map((r) => `| ${r.icon} | \`${r.name}\` | ${r.detail} |`).join('\n');
  return `${header}\n${body}`;
}

// The PR comment leads with what needs a look (fail/new/removed) as a
// table, then tucks everything that matched behind a <details> fold —
// unchanged screenshots outnumber the rest by a lot on a normal run, and
// nobody needs to scroll past dozens of "unchanged" rows to find the one
// that failed. Failed entries additionally get their diff image embedded
// directly below the table (not collapsed — real failures should be rare,
// unlike new/unchanged, so there's no long list to hide them behind). New
// and removed entries link to a preview of the actual/former screenshot —
// there's no diff to show (nothing to compare against), but a bare
// filename with no visual isn't enough to review a new baseline by.
function buildMarkdown({ fails, news, removed, passes }) {
  const parts = [
    `**${passes.length} unchanged · ${fails.length} failed · ${news.length} new · ${removed.length} removed**`,
    '',
  ];

  const attention = [
    ...fails.map((r) => {
      if (!imageBaseUrl) return { icon: '❌', name: r.name, detail: r.detail };
      const links = [`[expected](${imageBaseUrl}/${r.name}-expected.png)`];
      links.push(`[actual](${imageBaseUrl}/${r.name}-actual.png)`);
      if (r.hasDiffImage) links.push(`[diff](${imageBaseUrl}/${r.name}-diff.png)`);
      return { icon: '❌', name: r.name, detail: `${r.detail} — ${links.join(' · ')}` };
    }),
    ...news.map((r) => ({
      icon: '🆕',
      name: r.name,
      detail: imageBaseUrl
        ? `first run for this screenshot — [preview](${imageBaseUrl}/${r.name}-actual.png)`
        : 'first run for this screenshot — nothing to compare against yet',
    })),
    ...removed.map((r) => ({
      icon: '🗑️',
      name: r.name,
      detail: imageBaseUrl
        ? `no longer produced — [last seen](${imageBaseUrl}/${r.name}-expected.png)`
        : 'no longer produced',
    })),
  ];
  parts.push(attention.length > 0 ? table(attention) : '_Nothing changed._');

  const failsWithDiffImage = fails.filter((r) => r.hasDiffImage);
  if (failsWithDiffImage.length > 0 && imageBaseUrl) {
    parts.push('', '**Diffs:**');
    for (const r of failsWithDiffImage) {
      parts.push('', `\`${r.name}\``, `![diff](${imageBaseUrl}/${r.name}-diff.png)`);
    }
  }

  if ((news.length > 0 || removed.length > 0) && imageBaseUrl) {
    const count = news.length + removed.length;
    const plural = count === 1 ? '' : 's';
    parts.push(
      '',
      `<details>`,
      `<summary>${count} new/removed screenshot${plural} — previews</summary>`
    );
    for (const r of news) {
      parts.push('', `🆕 \`${r.name}\``, `![preview](${imageBaseUrl}/${r.name}-actual.png)`);
    }
    for (const r of removed) {
      parts.push(
        '',
        `🗑️ \`${r.name}\` (last seen)`,
        `![preview](${imageBaseUrl}/${r.name}-expected.png)`
      );
    }
    parts.push('', `</details>`);
  }

  if (passes.length > 0) {
    const plural = passes.length === 1 ? '' : 's';
    parts.push(
      '',
      `<details>`,
      `<summary>${passes.length} unchanged screenshot${plural}</summary>`,
      '',
      table(passes.map((r) => ({ icon: '✅', name: r.name, detail: 'unchanged' }))),
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
