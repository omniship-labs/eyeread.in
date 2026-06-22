/* ============================================================
   Screen-share compatibility matrix — SINGLE SOURCE OF TRUTH.
   ------------------------------------------------------------
   The actual rows live in `compat.data.json` (next to this file).
   This module just imports that JSON and re-exports it with the
   display metadata. WHY THE SPLIT:

     • The compat data is fed by community reports through an
       automated pipeline (.github/workflows/compat-report.yml →
       scripts/apply-compat-report.mjs). That bot writes the rows
       as JSON via JSON.stringify of *validated, allowlisted*
       values — JSON can't carry executable code, so an untrusted
       tester report can never inject anything that runs at build
       time or ships in the bundle. Keeping the data out of this
       .js file is the whole point.

   Rendered on the marketing site (components/Compat.jsx) at
   /#compatibility and in the in-app About window (src/lib/credits.js).
   The README links to the live matrix rather than duplicating it.

   On macOS and Windows invisibility is OS-guaranteed; rows there
   record which OS versions a real human has confirmed. On Linux
   there is no guarantee, so the result column is the whole point —
   it says whether the overlay actually stayed hidden.

   Row shape (see compat.data.json):
     platform     'macOS' | 'Windows' | 'Linux'  (grouping + guarantee)
     version      OS version string
     env          chip/arch (macOS/Windows) or desktop·session (Linux)
     result       'hidden'   → confirmed EXCLUDED from capture (works)
                  'partial'  → hidden in some capture tools but not all
                  'visible'  → shows up in the capture (does NOT work)
                  'untested' → no verified report yet — testers wanted!
     captureTools which screen-sharing apps were tested, e.g.
                  ['Zoom', 'Google Meet', 'OBS Studio']
     verifiers    GitHub users who confirmed it, e.g.
                  { name: 'octocat', profile: 'https://github.com/octocat' }
   ============================================================ */

import data from './compat.data.json';

export const compat = data.rows;

// Fixed display order + per-platform guarantee level.
export const PLATFORM_ORDER = ['macOS', 'Windows', 'Linux'];
export const PLATFORM_GUARANTEE = {
  macOS: 'guaranteed',
  Windows: 'guaranteed',
  Linux: 'bestEffort',
};

export default compat;
