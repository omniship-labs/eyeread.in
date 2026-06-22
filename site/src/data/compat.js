/* ============================================================
   Screen-share compatibility matrix — SINGLE SOURCE OF TRUTH.
   ------------------------------------------------------------
   Rendered on the marketing site (components/Compat.jsx) at
   /#compatibility. The README links to that live matrix rather than
   duplicating it. Add a row — or fill in the verifiers — whenever a
   tester confirms a setup.

   On macOS and Windows invisibility is OS-guaranteed; rows there
   record which OS versions have been confirmed by a real human. On
   Linux there is no guarantee, so the result column is the whole
   point — it says whether the overlay actually stayed hidden.

   platform: 'macOS' | 'Windows' | 'Linux'   (grouping + guarantee)
   result:
     'hidden'   → overlay confirmed EXCLUDED from capture (works)
     'partial'  → hidden in some capture tools but not all
     'visible'  → overlay shows up in the capture (does NOT work)
     'untested' → no verified report yet — testers wanted!

   verifiers: GitHub users who confirmed it, e.g.
     { name: 'octocat', profile: 'https://github.com/octocat' }
   ============================================================ */

import pkg from '../../../package.json';

// Current app version — verifications confirmed against an OLDER version are
// flagged "re-verify" so each release gets re-checked (see isStaleVersion).
export const CURRENT_VERSION = pkg.version;

export const compat = [
  // ── macOS — OS-guaranteed (NSWindow.sharingType = .none) ──
  { platform: 'macOS', version: 'macOS 15 Sequoia', env: 'Apple Silicon', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'macOS', version: 'macOS 14 Sonoma', env: 'Apple Silicon', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'macOS', version: 'macOS 13 Ventura', env: 'Intel', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },

  // ── Windows — OS-guaranteed (WDA_EXCLUDEFROMCAPTURE, Win10 2004+) ──
  { platform: 'Windows', version: 'Windows 11 23H2', env: 'x64', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Windows', version: 'Windows 11 22H2', env: 'x64', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Windows', version: 'Windows 10 22H2', env: 'x64', result: 'hidden', appVersion: '', date: '', verifiers: [], notes: '' },

  // ── Linux — best-effort (depends entirely on the compositor) ──
  { platform: 'Linux', version: 'Ubuntu 24.04 LTS', env: 'GNOME · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Ubuntu 24.04 LTS', env: 'GNOME · X11', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Fedora 40', env: 'GNOME · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Fedora 40 KDE', env: 'KDE Plasma 6 · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Debian 12', env: 'GNOME · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Arch Linux', env: 'KDE Plasma 6 · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Arch Linux', env: 'Hyprland · Wayland', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Linux Mint 21', env: 'Cinnamon · X11', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
  { platform: 'Linux', version: 'Pop!_OS 22.04', env: 'GNOME · X11', result: 'untested', appVersion: '', date: '', verifiers: [], notes: '' },
];

// Fixed display order + per-platform guarantee level.
export const PLATFORM_ORDER = ['macOS', 'Windows', 'Linux'];
export const PLATFORM_GUARANTEE = { macOS: 'guaranteed', Windows: 'guaranteed', Linux: 'bestEffort' };

// Numeric x.y.z tuple, ignoring any pre-release suffix (e.g. "-nightly.…").
const triple = (v) =>
  String(v || '')
    .split('-')[0]
    .split('.')
    .map((n) => parseInt(n, 10) || 0);

const rank = ([a = 0, b = 0, c = 0]) => a * 1e6 + b * 1e3 + c;

/**
 * Was a verification (done on `appVersion`) confirmed against an app version
 * older than the one we currently ship? If so it should be re-verified.
 * Returns false for empty versions (nothing claimed yet).
 */
export function isStaleVersion(appVersion) {
  if (!appVersion) return false;
  return rank(triple(appVersion)) < rank(triple(CURRENT_VERSION));
}

export default compat;
