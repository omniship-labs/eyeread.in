# eyeread.in

> Look at the lens. Not your notes.

An **OmniShip** project · [omniship.dev](https://omniship.dev)

A teleprompter that floats your script as a translucent glass overlay on top of whatever
you're sharing — and **stays invisible to screen-share and screen capture**.
Voice tracking follows you as you speak and highlights the exact word you're on.
Free, forever. Source-available under BUSL-1.1; each release becomes open source
(AGPL-3.0) two years after publication.

**macOS only.** This is a deliberate product decision, not a technical shortcut —
see [Why macOS only?](#why-macos-only) below.

Built with **Tauri 2 + React 18 + Vite**, implementing the design in
[`design_system/`](design_system/readme.md) (the original Claude Design handoff bundle —
single source of truth for tokens, components, and UI kits).

## Why macOS only?

The screen-share invisibility feature — eyeread.in's entire reason for existing — works by
excluding the overlay window from the OS screen capture pipeline before any capture software
ever sees it. Apple exposes a private API (`NSWindowSharingTypeNone` via `CGWindowSharingType`)
that marks a window's backing buffer as capture-excluded at the compositor level. Tauri's
`macOSPrivateApi` + `contentProtected` hooks directly into this.

No equivalent exists on other platforms:

- **Windows** has `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`, which blocks
  Win32-based screenshot tools but is completely bypassed by DXGI capture — the method
  used by OBS, Zoom, Teams, and essentially every serious tool. Shipping on Windows would
  mean advertising the feature and silently breaking it for the majority of users.
- **Linux** has no compositor-level capture exclusion protocol in X11 or Wayland. Any
  application with screen capture permissions can read every window's pixels.

Shipping a half-working version of the core feature on other platforms would undermine
the product's credibility. When a real cross-platform solution exists, we'll add it.

## Architecture

Two windows, one React app (routed by `?window=` query param):

| Window | What it is | How |
|---|---|---|
| `main` | Script library · editor · settings | Standard window, macOS overlay title bar |
| `overlay` | The floating glass prompter | Transparent, frameless, always-on-top, **`contentProtected: true`** (excluded from screen capture via `NSWindowSharingTypeNone`), visible on all workspaces |

- **Design tokens** are imported directly from `design_system/tokens/*` — no duplication.
  Fonts are self-hosted via `@fontsource` packages (no CDN, works offline; the app makes
  zero network requests at runtime).
- **Storage**: scripts live in SQLite (`eyeread.db` via tauri-plugin-sql), settings in
  `settings.json` (tauri-plugin-store) — both in the app data directory. The two windows
  sync live over Tauri events (`overlay:load`, `settings:sync`, `script:patch`). In a
  plain browser the same code falls back to `localStorage` + `BroadcastChannel`, so
  `npm run dev` alone gives a working web demo. Legacy localStorage data migrates
  automatically on first native run.
- **Voice tracking** (`src/hooks/useVoiceTracking.js`): Web Speech API when available;
  recognized words are aligned against the script near the current position. Where speech
  recognition isn't exposed (WKWebView often doesn't expose it), it falls back automatically
  to timed scrolling at the configured wpm.
- **Global hotkey**: ⌘⇧E shows/hides the overlay system-wide. In the overlay: Space
  play/pause, ↑/↓ speed, ⌘+/⌘− text size, Esc hide.

## Develop

```bash
npm install

# Web demo (main app + overlay demo tab, no native shell needed)
npm run dev

# Native app (requires Rust: https://v2.tauri.app/start/prerequisites/)
npm run tauri dev

# Quality gates
npm test        # vitest — pure logic (voice matching, clamps, formatting)
npm run lint    # eslint
npm run format  # prettier

# Release build
npm run tauri icon src-tauri/icons/icon.png   # once: generate full icon set (.icns etc.)
npm run tauri build
```

## Project layout

```
design_system/        ← design handoff bundle (tokens, components, UI kits) — read its readme
src/
  windows/            ← MainWindow (library/editor/settings) · OverlayWindow (glass prompter)
  screens/            ← Library · Editor · SettingsScreen
  components/         ← ScriptViewer, Switch, Slider, Segmented (DS ports) · overlay/SettingsPopover
  hooks/              ← useVoiceTracking · useClickThrough · usePanelResize
  lib/                ← tauri platform layer · store (SQLite/plugin-store) · voiceMatch · utils
  styles/             ← fonts (self-hosted) · app/main-window/overlay CSS (from the UI kits)
src-tauri/            ← Tauri 2 shell: window config, capabilities, Info.plist (mic usage)
```

## Known limits (v1)

- Screen-share invisibility requires the native macOS app; the web demo overlay is a same-page demo only.
- The transparent overlay window still captures mouse clicks within its bounds (use ⌥E to enable full click-through).
- Voice tracking quality depends on the platform's speech engine; timed scroll is the automatic fallback.
- The marketing site (`design_system/ui_kits/marketing/`) is not yet implemented.

## Release

Two channels ship automatically via GitHub Actions:

| Channel | Trigger | Branch | Identifier |
|---|---|---|---|
| **Stable** | Push a `v*` tag | `main` | `in.eyeread.app` |
| **Nightly** | Push to `dev` or daily cron | `dev` | `in.eyeread.app.nightly` |

Both channels install side-by-side. The nightly build auto-stamps its version
(`0.1.0-nightly.20260612`) so the in-app updater treats each nightly as newer than the last.
See `.github/workflows/` for the full CI setup and required secrets.

BUSL-1.1 © 2026 OmniShip — see [LICENSE.md](LICENSE.md).
Each release converts to AGPL-3.0-or-later two years after publication.
