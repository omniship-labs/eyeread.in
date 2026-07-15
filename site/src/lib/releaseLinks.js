/* Shared between Download.jsx (full platform grid) and the Hero/Nav one-click
   CTAs — both need to turn a fetched GitHub release object (from
   useLatestReleases) into an actual download URL for a given platform. */

// Matches an asset's filename to a platform key. Filenames come from the
// bundler (glimpse.yml/release.yml normalize them, but the exact pattern —
// e.g. the arch token in a Windows installer name — is set by Tauri/NSIS),
// so match by suffix rather than assuming an exact name.
const ASSET_MATCHERS = {
  macos: (name) => name.endsWith('.dmg'),
  'windows-x64': (name) => name.endsWith('x64-setup.exe'),
  'windows-arm64': (name) => name.endsWith('arm64-setup.exe'),
  linux: (name) => name.endsWith('.AppImage'),
};

export function findAssetUrl(release, platformKey) {
  const matcher = ASSET_MATCHERS[platformKey];
  const asset = release?.assets?.find((a) => matcher(a.name));
  return asset?.browser_download_url ?? null;
}

// One-click direct download for a detected OS (used by Hero/Nav's primary
// CTA). Windows defaults to x64 — arch isn't reliably detectable client-side,
// and x64 covers the vast majority; arm64 users can pick it explicitly on
// /download. Returns null while the release hasn't loaded yet, or for an
// unrecognized OS — callers should fall back to the /download page link.
export function resolveDirectDownloadHref(os, release) {
  if (!release) return null;
  switch (os) {
    case 'macos':
      return findAssetUrl(release, 'macos');
    case 'windows':
      return findAssetUrl(release, 'windows-x64');
    case 'linux':
      return findAssetUrl(release, 'linux');
    default:
      return null;
  }
}

// Display version string — the release's own title already has the exact
// human-readable version embedded (e.g. "eyeread.in glimpse (0.1.0-glimpse.
// 20260713)" or "eyeread.in v0.1.0"), so extract it rather than parsing the
// git tag format.
export function displayVersion(release) {
  const match = release?.name?.match(/\(([^)]+)\)/);
  return match ? match[1] : (release?.tag_name?.replace(/^v/, '') ?? '');
}

const RELATIVE_UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

// "3 hours ago" / "2 days ago" — glimpse ships multiple times a day, so a
// relative label is far more useful there than an absolute date; falls back
// to "just now" for anything under a minute.
export function relativeReleaseTime(publishedAt, locale) {
  const seconds = (Date.now() - new Date(publishedAt).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    const value = Math.floor(seconds / secondsInUnit);
    if (value >= 1) return rtf.format(-value, unit);
  }
  return rtf.format(0, 'minute');
}
