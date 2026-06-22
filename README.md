# eyeread.in

[![CLA assistant](https://cla-assistant.io/readme/badge/omniship-labs/eyeread.in)](https://cla-assistant.io/omniship-labs/eyeread.in)

> Look at the lens. Not your notes.

A teleprompter that floats your script as a translucent glass overlay on top of whatever
you're sharing — and **stays invisible to screen-share and screen capture**.
Voice tracking follows you as you speak and highlights the exact word you're on.

Free, forever. Open source under **AGPL-3.0**.

**macOS and Windows** get OS-enforced invisibility. **Linux** is best-effort and
experimental — see [Platform support](#platform-support) below.

Built with **Tauri 2 + React 18 + Vite**.

---

## Platform support

The screen-share invisibility feature relies on excluding the overlay window from the OS
capture pipeline before any capture software sees it.

| Platform    | Status             | Mechanism                                                                                        |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| **macOS**   | ✅ Fully supported | `NSWindow.sharingType = .none` (compositor-level). Needs `macOSPrivateApi` + `contentProtected`. |
| **Windows** | ✅ Fully supported | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` — Windows 10 2004+.                           |
| **Linux**   | ⚠️ Experimental    | No portable exclusion exists — outcome depends entirely on the compositor.                       |

**Minimum OS versions:** macOS 10.15 Catalina · Windows 10 v2004 (build 19041, required for capture exclusion) · Linux from the Ubuntu 22.04 / Debian 12 / glibc 2.35 era.

**Windows.** `WDA_EXCLUDEFROMCAPTURE` is enforced by the Desktop Window Manager _before_ any
capture API runs, so the window is excluded from **DXGI Desktop Duplication, Windows.Graphics.Capture,
and BitBlt** alike — i.e. Zoom, Teams, Google Meet, Discord, and OBS all see nothing, while the
window stays fully visible to you locally. (This is the same primitive other "invisible" apps use.
The older `WDA_MONITOR` flag only painted the window black and _could_ be bypassed by DXGI — hence
the long-standing myth that Windows can't do this. `WDA_EXCLUDEFROMCAPTURE` is the fix for exactly
that.) Tauri's `contentProtected` maps straight to it.

**Linux.** Capture happens inside the compositor — PipeWire + `xdg-desktop-portal`'s `ScreenCast`
on Wayland, or the raw framebuffer on X11 — and there is **no standard, cross-compositor protocol
to mark a single window as capture-excluded**. On most setups the overlay will _not_ be hidden, so
the app makes you explicitly acknowledge the risk before enabling it and always recommends a test
recording. Treat Linux invisibility as unreliable.

> **Universal caveat (all platforms):** capture exclusion only defeats _software_ capture. A phone
> camera or hardware capture card pointed at the screen still sees everything.

## Verified setups — and testers wanted 🧪

Invisibility is OS-guaranteed on macOS and Windows; real-world confirmation —
and the entire Linux story — depends on the community. We keep a live
**compatibility matrix** of which OS versions and environments have been verified,
and by whom:

→ **[Verified setups on eyeread.in](https://get.eyeread.in/#compatibility)**

**On a setup that's still untested, or one not listed?** Run the quick check and
report back via a
[compatibility report](https://github.com/omniship-labs/eyeread.in/issues/new?template=3-compat-report.yml).
We especially need **Linux** testers across compositors (GNOME/KDE/wlroots,
Wayland _and_ X11). Confirmed reports are added to the matrix with credit.

## Architecture

The app is a single React codebase that runs in two Tauri windows, selected by `?window=` query param at startup.

| Window    | Purpose                          | Notable config                                                                             |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `main`    | Script library, editor, settings | Standard window with macOS overlay title bar                                               |
| `overlay` | The floating glass prompter      | Transparent, frameless, always-on-top, `contentProtected: true`, visible across all Spaces |

**Storage.** Scripts are stored in SQLite (`eyeread.db` via `tauri-plugin-sql`), settings in
`settings.json` (`tauri-plugin-store`), both in the user's app data directory. The two windows
stay in sync over Tauri events. In a plain browser the same code falls back to `localStorage` +
`BroadcastChannel`, so `npm run dev` works without the native shell. Legacy localStorage data
migrates automatically on first native launch.

**Voice tracking.** Uses the Web Speech API where available. Recognized words are aligned
against the script near the current read position. Falls back to timed scrolling at the
configured wpm where speech recognition is unavailable (e.g. WKWebView).

**Hotkeys.**

| Shortcut  | Action                             |
| --------- | ---------------------------------- |
| ⌘ Shift E | Show / hide overlay (system-wide)  |
| ⌥ E       | Toggle click-through (system-wide) |
| Space     | Play / pause scroll                |
| ↑ / ↓     | Scroll speed up / down             |
| ⌘ + / ⌘ − | Text size up / down                |
| Esc       | Hide overlay                       |

On Windows and Linux, **⌘ → Ctrl** and **⌥ → Alt** (the shortcuts are registered as
`CommandOrControl` / `Alt`, so they work cross-platform).

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

- Screen-share invisibility requires the native build (macOS or Windows). The web demo overlay is visible to screen capture, and Linux is best-effort only (see [Platform support](#platform-support)).
- The overlay window captures mouse clicks within its bounds by default. Use ⌥E to enable full click-through.
- Voice tracking quality depends on the platform speech engine. Timed scroll is the automatic fallback.

## Releases

Builds are published automatically via GitHub Actions on two channels:

| Channel     | Trigger                     | Bundle ID                |
| ----------- | --------------------------- | ------------------------ |
| **Stable**  | `v*` tag on `main`          | `in.eyeread.app`         |
| **Nightly** | Push to `dev` or daily cron | `in.eyeread.app.nightly` |

Each channel builds for **macOS** (Apple Silicon + Intel), **Windows** (x64 +
arm64), and **Linux** (x86_64, experimental). Bundles per OS: `.dmg` on macOS,
NSIS installer on Windows, AppImage + `.deb` on Linux. The in-app updater reads
`latest.json` and matches your OS/arch.

Both channels install side-by-side. Nightly builds are stamped with the date
(e.g. `0.1.0-nightly.20260612`) so the in-app updater treats each nightly as a distinct
release.

See **[docs/RELEASE_STRATEGY.md](docs/RELEASE_STRATEGY.md)** for the full
per-OS strategy (signing, store eligibility, distribution channels), and
`.github/workflows/` for CI configuration and required secrets.

---

AGPL-3.0 © 2026 Mrithyunjay Jagannath Halinge — see [LICENSE](LICENSE).  
Commercial licenses available: [license@omniship.dev](mailto:license@omniship.dev)
