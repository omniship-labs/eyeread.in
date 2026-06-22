#!/usr/bin/env node
/**
 * apply-compat-report.mjs
 *
 * Turns ONE community compatibility report (a parsed GitHub issue form) into a
 * validated change to site/src/data/compat.data.json, and writes a PR body
 * summarising it for the human reviewer.
 *
 * This script is the SECURITY BOUNDARY for the compat pipeline. Everything it
 * reads is untrusted issue input, so it:
 *   • maps free-text/dropdown values onto fixed allowlists (anything off the
 *     list is dropped, never trusted),
 *   • sanitises the two free-text fields (version/environment) to a safe
 *     charset and a hard length cap,
 *   • credits the GitHub *issue author* — a server-verified identity — and
 *     CONSTRUCTS the profile URL from it, so a report can never credit (or
 *     smear) someone else or smuggle a `javascript:` link,
 *   • writes the result back as JSON via JSON.stringify, so no tester input is
 *     ever interpolated into executable code.
 *
 * Inputs (env):
 *   ISSUE_JSON     JSON string of the parsed form, keyed by field id
 *   ISSUE_AUTHOR   GitHub login of the issue author (the verifier credited)
 *   ISSUE_NUMBER   issue number, for the PR's "Closes #N"
 *   ISSUE_TITLE    issue title, for context in the PR body (optional)
 *
 * Outputs:
 *   - rewrites compat.data.json in place
 *   - writes pr-body.md (CWD)
 *   - appends pr_title / pr_branch / changed to $GITHUB_OUTPUT when present
 *
 * Exits non-zero (with a clear message) if the report is invalid, so the
 * workflow fails loudly rather than committing garbage.
 */
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = resolve(ROOT, 'site/src/data/compat.data.json');

// ── Allowlists ────────────────────────────────────────────────────────────
const PLATFORMS = ['macOS', 'Windows', 'Linux'];

// Map the dropdown's leading word → our internal result code. "Not sure" maps
// to null: it must never overwrite a known result.
const RESULTS = { hidden: 'hidden', partial: 'partial', visible: 'visible' };

// Canonical capture-tool names. Keys are matched case-insensitively against the
// selected option text; anything unmatched (incl. "Other") is dropped — the
// reviewer can read the free-text notes and add it by hand if it's legit.
const TOOLS = {
  zoom: 'Zoom',
  'google meet': 'Google Meet',
  'microsoft teams': 'Microsoft Teams',
  teams: 'Microsoft Teams',
  'obs studio': 'OBS Studio',
  obs: 'OBS Studio',
  quicktime: 'QuickTime',
  discord: 'Discord',
};

const GH_LOGIN = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

// ── Helpers ─────────────────────────────────────────────────────────────────
const fail = (msg) => {
  console.error(`[compat] ${msg}`);
  process.exit(1);
};

/** Strip to a safe charset, collapse whitespace, hard-cap length. */
function clean(s, max = 60) {
  return String(s ?? '')
    .replace(/[^A-Za-z0-9 .,!()_/:+·–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** First word of a dropdown label, lowercased ("Hidden — …" → "hidden"). */
const firstWord = (s) =>
  String(s ?? '')
    .trim()
    .split(/[\s—–-]/)[0]
    .toLowerCase();

/** Normalise a multi-select value (array, or comma/newline-joined string). */
function toList(v) {
  if (Array.isArray(v)) return v;
  return String(v ?? '')
    .split(/[\n,]/)
    .map((x) => x.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean);
}

const eq = (a, b) => a.toLowerCase() === b.toLowerCase();

async function main() {
  const author = String(process.env.ISSUE_AUTHOR || '').trim();
  if (!GH_LOGIN.test(author)) fail(`refusing to credit invalid author login: "${author}"`);

  let form;
  try {
    form = JSON.parse(process.env.ISSUE_JSON || '{}');
  } catch {
    fail('ISSUE_JSON was not valid JSON');
  }

  // platform — must be exactly one of the allowed values
  const platform = PLATFORMS.find((p) => eq(p, String(form.platform ?? '').trim()));
  if (!platform) fail(`unknown platform: "${form.platform}"`);

  const version = clean(form.os_version);
  const env = clean(form.environment);
  if (!version) fail('missing OS version');
  if (!env) fail('missing environment');

  // result — "Not sure" / unknown → don't change the existing result
  const result = RESULTS[firstWord(form.result)] || null;

  // capture tools — allowlist only
  const tools = [];
  for (const raw of toList(form.tools)) {
    const name = TOOLS[raw.toLowerCase()];
    if (name && !tools.includes(name)) tools.push(name);
  }

  const verifier = { name: author, profile: `https://github.com/${author}` };

  // ── Merge into the dataset ────────────────────────────────────────────────
  const db = JSON.parse(await readFile(DATA, 'utf8'));
  const rows = db.rows;

  let row = rows.find(
    (r) => r.platform === platform && eq(r.version, version) && eq(r.env, env)
  );
  const isNew = !row;
  if (isNew) {
    row = {
      platform,
      version,
      env,
      result: 'untested',
      captureTools: [],
      date: '',
      verifiers: [],
      notes: '',
    };
    rows.push(row);
  }

  // result: apply the reported one if any; never downgrade to "untested"
  if (result) row.result = result;

  // union capture tools + verifiers (dedup by canonical name / login)
  row.captureTools = Array.from(new Set([...(row.captureTools || []), ...tools]));
  if (!row.verifiers.some((v) => eq(v.name, verifier.name))) row.verifiers.push(verifier);

  // keep platform groups together and stable for a clean diff
  const order = { macOS: 0, Windows: 1, Linux: 2 };
  rows.sort((a, b) => order[a.platform] - order[b.platform]);

  await writeFile(DATA, JSON.stringify(db, null, 2) + '\n');

  // ── PR body (rich context for the reviewer; NOT shown on the site) ─────────
  const num = String(process.env.ISSUE_NUMBER || '').replace(/\D/g, '');
  const appVersion = clean(form.app_version, 24);
  const scope = clean(form.scope, 40);
  const notes = clean(form.notes, 600);

  const body = [
    `Automated from #${num} — community screen-share compatibility report.`,
    '',
    `> Verified by @${author}. Credit and profile link are derived from the`,
    `> issue author, not from any free-text field.`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Platform | ${platform} |`,
    `| OS version | ${version} |`,
    `| Environment | ${env} |`,
    `| Result | ${result || '_unchanged (reporter unsure)_'} |`,
    `| Capture tools | ${tools.join(', ') || '—'} |`,
    `| Share scope | ${scope || '—'} |`,
    `| eyeread.in version | ${appVersion || '—'} |`,
    `| Row | ${isNew ? 'NEW row added' : 'existing row updated'} |`,
    '',
    notes ? `**Reporter notes:** ${notes}` : '',
    '',
    '---',
    `Review the diff, sanity-check against the report, then merge. Merging`,
    `closes #${num}.`,
    '',
    `Closes #${num}`,
  ].join('\n');

  await writeFile(resolve(process.cwd(), 'pr-body.md'), body + '\n');

  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    await appendFile(
      out,
      [
        `changed=true`,
        `pr_title=compat: ${platform} ${version} (${env}) — report from #${num}`,
        `pr_branch=compat-report/issue-${num}`,
        '',
      ].join('\n')
    );
  }

  console.log(`[compat] ${isNew ? 'added' : 'updated'} ${platform} · ${version} · ${env}`);
}

main().catch((err) => fail(err.message));
