// Persistence layer.
//   Scripts  → SQLite via tauri-plugin-sql   (documents: durable, queryable)
//   Settings → tauri-plugin-store settings.json (key-value preferences)
//   Browser demo → localStorage fallback for both.
// Data from the v1 localStorage era is migrated automatically on first run.

import { uid } from './utils';
import { isTauri } from './tauri';

const LS_SCRIPTS = 'eyeread.scripts.v1';
const LS_SETTINGS = 'eyeread.settings.v1';
const DB_PATH = 'sqlite:eyeread.db';

export const defaultSettings = {
  size: 30, // px
  speed: 135, // wpm (auto-scroll fallback)
  bellWords: 15, // upcoming words kept clearly lit ahead of the peak
  opacity: 40, // % tint — low default: you're always reading over live content
  blur: 3, // px backdrop blur ("glassyness") — 0 = crystal clear
  mirror: false,
  timerMode: 'up', // off | up | down
  countFrom: 300, // s, for countdown
  position: 'top', // top | center | bottom
  hideFromShare: true,
  linuxShareRiskAccepted: false, // Linux only: user acknowledged capture-hiding is best-effort
  voice: true, // voice tracking on/off
  // Keep the mic session alive while paused (global-only, privacy-relevant):
  // avoids the OS "listening" chime WebKit plays on every fresh mic start.
  keepMicOpen: false,
  overlaySize: { w: 560, h: 168 }, // user default; per-script overlaySize wins
  reduceMotion: false, // disable scroll easing + UI animations everywhere
  highContrast: false, // boost text contrast in overlay
  dyslexicFont: false, // OpenDyslexic + roomier spacing for the reading text
  showIconLabels: false, // force icon+text labels on icon-only buttons everywhere
  uiScale: 100, // app UI zoom, % (affects main / settings / about windows)
  updateCheckHours: 6, // periodic update-check interval, hours; 0 = off
  // Tour tips seen/dismissed, one entry per step as `${tourId}:${stepId}` —
  // per-step (not per-tour) so a step added to an already-finished tour
  // later shows up on its own, without replaying the whole tour. See
  // src/lib/tours.js and src/hooks/useTour.js.
  seenTourSteps: [],
};

// Selectable periodic-check cadences, hours; 0 = off. Single source of truth
// for the Settings UI options list and the useUpdateCheck hook.
export const UPDATE_CHECK_HOURS_OPTIONS = [0, 1, 3, 6, 12, 24];

// Prompter settings a script may override. Anything not listed (position,
// hideFromShare, overlaySize, accessibility) stays global only.
export const OVERRIDABLE_KEYS = [
  'voice',
  'speed',
  'bellWords',
  'size',
  'opacity',
  'blur',
  'mirror',
  'timerMode',
  'countFrom',
];

/**
 * Resolve the effective settings for a script: the global layer with the
 * script's partial overrides laid on top (script ▸ global ▸ default — defaults
 * are already baked into `global`).
 */
export const resolveSettings = (global, overrides) => ({ ...global, ...(overrides || {}) });

const seedScripts = () => {
  const now = Date.now();
  return [
    {
      id: uid(),
      title: 'Q3 All-Hands',
      text: `Good morning, everyone. Before we get into the numbers, I want to say — what this team shipped in the last ninety days is genuinely remarkable.\n\nWe launched invisible. Not as a metaphor. The product literally disappears from every screen recording, every shared frame, every Zoom call in the room. That was the hard problem. We solved it.\n\nNow we scale it. Three numbers define this quarter: fourteen thousand active installs, forty-two thousand scripts read, and a net promoter score of seventy-one — higher than any tool in this category.\n\nSo let's talk about what comes next.`,
      tag: 'ready',
      pinned: true,
      updatedAt: now,
    },
    {
      id: uid(),
      title: 'Product Demo — Investors',
      text: `Imagine you're presenting to a room of two hundred people. Your slides are up, your camera is on — and your script is floating right there, invisible to everyone but you.\n\nThat's eyeread. A transparent overlay that lives on top of whatever you're sharing. It reads your voice and moves with you. When you speed up, it speeds up. When you pause, it waits.\n\nNo one can see it. Not on Zoom, not on Loom, not on any recording software. We render it outside the captured layers of the operating system.\n\nIt's free. Open source. And it's yours.`,
      tag: 'ready',
      pinned: false,
      updatedAt: now - 86400e3,
    },
    {
      id: uid(),
      title: 'Podcast Intro — Season 2',
      text: `Welcome back to the show. I'm your host, and this is season two of Invisible Work — conversations with the builders, speakers, and thinkers who make hard things look easy.\n\nThis season we're going deeper: into the craft of live communication, the tools that make you better on camera, and the companies being built quietly, without the noise.\n\nIf that sounds like your kind of show — subscribe, share it with one person who would love it, and let's get into it.`,
      tag: 'draft',
      pinned: false,
      updatedAt: now - 2 * 86400e3,
    },
    {
      id: uid(),
      title: 'Conference Keynote — Opening',
      text: `There's a version of this talk where I stand up here and tell you everything I know.\n\nBut the best talks I've ever seen weren't about knowledge. They were about permission.\n\nPermission to try something before you're ready. Permission to ship before it's perfect. Permission to look at the camera and say — I don't have all the answers, but I have this.\n\nSo that's what we're doing today. Together.`,
      tag: 'draft',
      pinned: false,
      updatedAt: now - 3 * 86400e3,
    },
  ];
};

export function newScript() {
  return {
    id: uid(),
    title: 'Untitled script',
    text: '',
    tag: 'draft',
    pinned: false,
    updatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Settings — tauri-plugin-store (settings.json in the app data dir)
// ---------------------------------------------------------------------------

let settingsStore = null;
async function getSettingsStore() {
  if (!settingsStore) {
    const { LazyStore } = await import('@tauri-apps/plugin-store');
    settingsStore = new LazyStore('settings.json');
  }
  return settingsStore;
}

function lsReadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted */
  }
  return null;
}

export async function fetchSettings() {
  if (!isTauri) {
    return { ...defaultSettings, ...(lsReadJSON(LS_SETTINGS) || {}) };
  }
  const store = await getSettingsStore();
  let saved = await store.get('settings');
  if (!saved) {
    saved = lsReadJSON(LS_SETTINGS); // migrate the localStorage era
    if (saved) await store.set('settings', saved);
  }
  return { ...defaultSettings, ...(saved || {}) };
}

export async function persistSettings(settings) {
  if (!isTauri) {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
    return;
  }
  const store = await getSettingsStore();
  await store.set('settings', settings); // LazyStore auto-saves
}

// ---------------------------------------------------------------------------
// Scripts — SQLite (eyeread.db in the app data dir)
// ---------------------------------------------------------------------------

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql')
      .then((m) => m.default.load(DB_PATH))
      .catch((e) => {
        dbPromise = null; // allow retry on next call
        throw e;
      });
  }
  return dbPromise;
}

const rowToScript = (r) => ({
  id: r.id,
  title: r.title,
  text: r.text,
  tag: r.tag,
  pinned: !!r.pinned,
  updatedAt: r.updated_at,
  ...(r.overlay_w != null ? { overlaySize: { w: r.overlay_w, h: r.overlay_h } } : {}),
  ...(r.overlay_x != null ? { overlayPos: { x: r.overlay_x, y: r.overlay_y } } : {}),
  ...(r.settings ? { settingsOverrides: safeParse(r.settings) } : {}),
});

const safeParse = (s) => {
  try {
    return JSON.parse(s) || {};
  } catch {
    return {};
  }
};

function lsScripts() {
  return lsReadJSON(LS_SCRIPTS);
}
function lsSaveScripts(list) {
  localStorage.setItem(LS_SCRIPTS, JSON.stringify(list));
}

export async function fetchScripts() {
  if (!isTauri) {
    const existing = lsScripts();
    if (existing) return existing;
    const seeded = seedScripts();
    lsSaveScripts(seeded);
    return seeded;
  }
  const d = await db();
  let rows = await d.select('SELECT * FROM scripts ORDER BY updated_at DESC');
  if (rows.length === 0) {
    // first run: import from the localStorage era, or seed the examples
    const initial = lsScripts() || seedScripts();
    for (const s of initial) await upsertScript(s);
    rows = await d.select('SELECT * FROM scripts ORDER BY updated_at DESC');
  }
  return rows.map(rowToScript);
}

export async function upsertScript(s) {
  if (!isTauri) {
    const list = lsScripts() || [];
    const i = list.findIndex((x) => x.id === s.id);
    if (i >= 0) list[i] = s;
    else list.unshift(s);
    lsSaveScripts(list);
    return;
  }
  const d = await db();
  await d.execute(
    `INSERT INTO scripts (id, title, text, tag, pinned, overlay_w, overlay_h, overlay_x, overlay_y, settings, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT(id) DO UPDATE SET
       title = $2, text = $3, tag = $4, pinned = $5,
       overlay_w = $6, overlay_h = $7, overlay_x = $8, overlay_y = $9,
       settings = $10, updated_at = $11`,
    [
      s.id,
      s.title,
      s.text,
      s.tag,
      s.pinned ? 1 : 0,
      s.overlaySize?.w ?? null,
      s.overlaySize?.h ?? null,
      s.overlayPos?.x ?? null,
      s.overlayPos?.y ?? null,
      s.settingsOverrides && Object.keys(s.settingsOverrides).length
        ? JSON.stringify(s.settingsOverrides)
        : null,
      s.updatedAt,
    ]
  );
}

export async function removeScript(id) {
  if (!isTauri) {
    lsSaveScripts((lsScripts() || []).filter((s) => s.id !== id));
    return;
  }
  const d = await db();
  await d.execute('DELETE FROM scripts WHERE id = $1', [id]);
}
