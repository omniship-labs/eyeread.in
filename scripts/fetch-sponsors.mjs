#!/usr/bin/env node
/**
 * fetch-sponsors.mjs
 *
 * Build-time fetch of Open Collective backers/sponsors → src/data/sponsors.json.
 * Run manually (`npm run sponsors`) or automatically before a build (`prebuild`).
 *
 * Keeps the app's "no network during normal use" privacy promise: the network
 * call happens here at build time, never in the shipped app — the About window
 * only ever reads the bundled JSON.
 *
 * If the fetch fails (offline, API down), the existing sponsors.json is left
 * untouched so a build never breaks on a flaky network.
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = process.env.OC_SLUG || 'eyereadin';
const URL = `https://opencollective.com/${SLUG}/members/all.json`;
const OUT = resolve(ROOT, 'src/data/sponsors.json');
const AVATAR_DIR = resolve(ROOT, 'public/sponsors'); // served at /sponsors/<id>.png

/** Download an avatar locally so the shipped app makes zero network calls. */
async function downloadAvatar(url, id) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const file = `${id}.png`;
    await writeFile(resolve(AVATAR_DIR, file), buf);
    return `/sponsors/${file}`;
  } catch {
    return null; // missing avatar is non-fatal — name still renders
  }
}

async function main() {
  console.log(`[sponsors] fetching ${URL}`);
  const res = await fetch(URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const members = await res.json();

  const backers = members
    // financial contributors only — drop admins, hosts, followers
    .filter((m) => m.role === 'BACKER' && m.isActive && (m.totalAmountDonated ?? 0) > 0)
    // biggest supporters first
    .sort((a, b) => (b.totalAmountDonated ?? 0) - (a.totalAmountDonated ?? 0));

  // Re-fetch avatars fresh each run; start from a clean dir.
  await rm(AVATAR_DIR, { recursive: true, force: true });
  await mkdir(AVATAR_DIR, { recursive: true });

  const sponsors = [];
  for (const m of backers) {
    const image = m.image ? await downloadAvatar(m.image, m.MemberId) : null;
    sponsors.push({
      name: m.name || 'Anonymous',
      image,
      profile: m.profile || null,
      total: m.totalAmountDonated ?? 0,
    });
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(sponsors, null, 2) + '\n');
  console.log(`[sponsors] wrote ${sponsors.length} sponsor(s) → ${OUT}`);
}

main().catch((err) => {
  console.warn(`[sponsors] skipped — ${err.message}. Keeping existing sponsors.json.`);
  // Non-fatal: never break a build over a network hiccup.
  process.exit(0);
});
