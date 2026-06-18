# eyeread.in

> Look at the lens. Not your notes.

A teleprompter that floats your script as a translucent glass overlay on top of whatever
you're sharing — and **stays invisible to screen-share and screen capture**.
Voice tracking follows you as you speak and highlights the exact word you're on.

Free, forever. Open source under **AGPL-3.0**.

**macOS only.** This is a deliberate product decision, not a technical shortcut —
see [Why macOS only?](#why-macos-only) below.

Built with **Tauri 2 + React 18 + Vite**.

---

## Why macOS only?

The screen-share invisibility feature relies on excluding the overlay window from the OS
capture pipeline before any capture software sees it. macOS exposes a compositor-level API
(`NSWindowSharingTypeNone` / `CGWindowSharingType`) that marks a window's backing buffer as
capture-excluded. Tauri's `macOSPrivateApi` + `contentProtected` flags hook directly into this.

No equivalent exists on other platforms:

- **Windows** has `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`, but DXGI capture — used
  by OBS, Zoom, Teams, and most modern tools — bypasses it entirely.
- **Linux** has no compositor-level capture exclusion in X11 or Wayland.

Shipping a broken version of the core feature would be worse than not shipping at all.
Cross-platform support will be added if a reliable solution becomes available.

## Architecture

The app is a single React codebase that runs in two Tauri windows, selected by `?window=` query param at startup.

| Window | Purpose | Notable config |
|---|---|---|
| `main` | Script library, editor, settings | Standard window with macOS overlay title bar |
| `overlay` | The floating glass prompter | Transparent, frameless, always-on-top, `contentProtected: true`, visible across all Spaces |

**Storage.** Scripts are stored in SQLite (`eyeread.db` via `tauri-plugin-sql`), settings in
`settings.json` (`tauri-plugin-store`), both in the user's app data directory. The two windows
stay in sync over Tauri events. In a plain browser the same code falls back to `localStorage` +
`BroadcastChannel`, so `npm run dev` works without the native shell. Legacy localStorage data
migrates automatically on first native launch.

**Voice tracking.** Uses the Web Speech API where available. Recognized words are aligned
against the script near the current read position. Falls back to timed scrolling at the
configured wpm where speech recognition is unavailable (e.g. WKWebView).

**Hotkeys.**

| Shortcut | Action |
|---|---|
| ⌘ Shift E | Show / hide overlay (system-wide) |
| ⌥ E | Toggle click-through (system-wide) |
| Space | Play / pause scroll |
| ↑ / ↓ | Scroll speed up / down |
| ⌘ + / ⌘ − | Text size up / down |
| Esc | Hide overlay |

## Getting started

**Prerequisites:** Node.js 18+ and, for the native app, Rust — see the
[Tauri v2 setup guide](https://v2.tauri.app/start/prerequisites/).

```bash
npm install

# Run the web demo (no Rust required)
npm run dev

# Run the native app
npm run tauri dev
```

```bash
# Linting and tests
npm run lint     # ESLint
npm run format   # Prettier
npm test         # Vitest (unit tests for voice matching, utils)

# Production build
npm run tauri icon src-tauri/icons/icon.png  # generate icon set (run once)
npm run tauri build
```

## Project layout

```
design/               Design tokens, component specs, and UI kits — source of truth for styling
src/
  windows/
    main/             MainWindow.jsx + main-window.css
    overlay/          OverlayWindow.jsx · SettingsDrawer · VoiceDebugger + overlay.css
    settings/         settings-window.css
  features/           Library · Editor · SettingsScreen
  components/         ScriptViewer, Switch, Slider, Segmented (shared across windows)
  hooks/              useVoiceTracking · useClickThrough · usePanelResize
  lib/                Tauri platform abstraction · store · voiceMatch · utils
  styles/             app.css · fonts.css (global; window CSS is colocated in windows/)
src-tauri/            Tauri 2 shell — window config, capabilities, Info.plist
```

## Known limitations

- Screen-share invisibility requires the native macOS build. The web demo overlay is visible to screen capture.
- The overlay window captures mouse clicks within its bounds by default. Use ⌥E to enable full click-through.
- Voice tracking quality depends on the platform speech engine. Timed scroll is the automatic fallback.

## Releases

Builds are published automatically via GitHub Actions on two channels:

| Channel | Trigger | Bundle ID |
|---|---|---|
| **Stable** | `v*` tag on `main` | `in.eyeread.app` |
| **Nightly** | Push to `dev` or daily cron | `in.eyeread.app.nightly` |

Both channels install side-by-side. Nightly builds are stamped with the date
(e.g. `0.1.0-nightly.20260612`) so the in-app updater treats each nightly as a distinct
release. See `.github/workflows/` for CI configuration and required secrets.

---

AGPL-3.0 © 2026 Mrithyunjay Jagannath Halinge — see [LICENSE](LICENSE).  
Commercial licenses available: [license@omniship.dev](mailto:license@omniship.dev)
