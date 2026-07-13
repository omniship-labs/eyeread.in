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

**Minimum OS versions:** macOS 11 Big Sur (Apple Silicon) · Windows 10 v2004 (build 19041, required for capture exclusion) · Linux from the Ubuntu 22.04 / Debian 12 / glibc 2.35 era.

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

The app is a single React codebase that runs in four Tauri windows, selected by `?window=` query param at startup.

| Window     | Purpose                          | Notable config                                                                             |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `main`     | Script library, editor, settings | Standard window with macOS overlay title bar                                               |
| `overlay`  | The floating glass prompter      | Transparent, frameless, always-on-top, `contentProtected: true`, visible across all Spaces |
| `settings` | Prompter settings (per-script)   | Independent window so it can never clip or resize the overlay; hides on blur               |
| `about`    | About / credits                  | Frameless; closing hides instead of destroying so it can reopen                            |

**Storage.** Scripts are stored in SQLite (`eyeread.db` via `tauri-plugin-sql`), settings in
`settings.json` (`tauri-plugin-store`), both in the user's app data directory. The two windows
stay in sync over Tauri events. In a plain browser the same code falls back to `localStorage` +
`BroadcastChannel`, so `npm run dev` works without the native shell. Legacy localStorage data
migrates automatically on first native launch.

**Voice tracking.** Uses the Web Speech API (works in the native builds — WKWebView on
macOS, WebView2 on Windows — and in Chromium browsers). Recognized words are aligned
against the script near the current read position; on repeated misses the matcher
re-locks on the last two heard words (forward or backward, so restarted sentences are
followed), and the highlight moves at your measured speaking rate. Falls back to timed
scrolling at the configured wpm where speech recognition is unavailable (e.g. Linux
WebKitGTK). On macOS, WebKit requires a click inside the overlay before the mic can
start — the app retries automatically on your first interaction.

**Hotkeys.**

| Shortcut  | Action                             |
| --------- | ---------------------------------- |
| ⌘ Shift E | Show / hide overlay (system-wide)  |
| ⌥ Shift E | Toggle click-through (system-wide) |
| Space     | Play / pause scroll                |
| ↑ / ↓     | Scroll speed up / down             |
| ⌘ + / ⌘ − | Text size up / down                |
| Esc       | Hide overlay                       |

On Windows and Linux, **⌘ → Ctrl** and **⌥ → Alt** (the shortcuts are registered as
`CommandOrControl` / `Alt`, so they work cross-platform).

## Getting started

**Prerequisites:** Node.js 24+ and, for the native app, Rust — see the
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
docs/                 Release strategy and other project docs
site/                 Marketing site (get.eyeread.in) — own Vite config and tests
src/
  windows/            MainWindow · OverlayWindow · SettingsWindow · AboutWindow (.jsx)
    main/             main-window.less
    overlay/          overlay.less
    settings/         settings-window.less
    about/            about-window.less
  features/           Library · Editor · SettingsScreen
  components/         ScriptViewer, Switch, Slider, Segmented… (shared across windows)
  hooks/              useVoiceTracking · useSpeechRecognition · useClickThrough ·
                      usePanelResize · useShareProtection · useA11y
  lib/                tauri (platform abstraction) · store · voiceMatch · mic · utils
  i18n/               i18next setup + locales/ (13 languages)
  styles/             app.less · fonts.less (global; window styles colocated in windows/)
src-tauri/            Tauri 2 shell — window config, migrations, capabilities, Info.plist
```

## Known limitations

- Screen-share invisibility requires the native build (macOS or Windows). The web demo overlay is visible to screen capture, and Linux is best-effort only (see [Platform support](#platform-support)).
- The overlay window captures mouse clicks within its bounds by default. Use ⌥⇧E to enable full click-through.
- Voice tracking quality depends on the platform speech engine. Timed scroll is the automatic fallback.
- On macOS, starting the mic needs one interaction inside the overlay (a WebKit user-activation rule) — the app recovers on your first click or drag, and the "keep mic open while paused" setting avoids repeated mic starts (and the system listening chime) within a session.

## Releases

Builds are published automatically via GitHub Actions on two channels:

| Channel     | Trigger                            | Bundle ID                |
| ----------- | ---------------------------------- | ------------------------ |
| **Stable**  | `v*` tag on `main`                 | `in.eyeread.app`         |
| **Glimpse** | Daily cron on `main` (or dispatch) | `in.eyeread.app.glimpse` |

Each channel builds for **macOS** (Apple Silicon only), **Windows** (x64 +
arm64), and **Linux** (x86_64, experimental). Bundles per OS: `.dmg` on macOS,
NSIS installer on Windows, AppImage + `.deb` on Linux. The in-app updater reads
`latest.json` and matches your OS/arch.

Both channels install side-by-side, and Glimpse ships a visually distinct app
icon (a glitched cue-line + warm palette) so it's never confused with stable
in your dock. Glimpse builds are stamped with the date (e.g.
`0.1.0-glimpse.20260612`) so the in-app updater treats each one as a
distinct release.

See **[docs/RELEASING.md](docs/RELEASING.md)** for the full
per-OS strategy (signing, store eligibility, distribution channels), and
`.github/workflows/` for CI configuration and required secrets.

## Disclaimers

We are **not** responsible for any issues arising from use of this software, including but not limited to data loss, privacy incidents, or unexpected screen-share behavior. By using eyeread.in you accept responsibility for verifying that the overlay is invisible on your specific setup before using it in sensitive contexts.

- Screen-share invisibility is **OS-enforced on macOS and Windows** but is not guaranteed to defeat every capture method (hardware capture cards, phone cameras, or future OS changes are out of scope).
- **Linux invisibility is experimental and comes with no guarantees** — the app makes you acknowledge the risk before enabling it, and we strongly recommend a test recording first (see [Platform support](#platform-support)).
- **This app never sends audio or transcripts anywhere** — recognition is delegated to the platform speech engine via the Web Speech API. Note that the platform engine itself may use its vendor's speech service depending on OS, browser, and language (e.g. Chrome's implementation is Google-backed; modern macOS/Windows generally process on-device). Check your OS/browser privacy settings if this matters for your use.
- This software is provided as-is under AGPL-3.0, **without warranty of any kind** — see [LICENSE](LICENSE) for the full disclaimer.

## Troubleshooting

If something isn't working, please check these first:

- **Overlay is visible in screen share (macOS/Windows):** Make sure you're running the native build, not the web demo (`npm run dev`). The web demo overlay is always visible to capture by design.
- **Overlay is visible in screen share (Linux):** This is expected — Linux invisibility is experimental and compositor-dependent. See [Platform support](#platform-support).
- **Voice tracking isn't following along:** Check the mic permission first (System Settings → Privacy & Security → Microphone on macOS). On macOS the mic can't start until you've interacted with the overlay once — click or drag anywhere on it, or use the amber "Enable mic" chip in the header. Where the Web Speech API is genuinely unavailable (e.g. some Linux builds) the app falls back to timed scroll automatically.
- **Mic chime on every resume (macOS):** That's the system's speech-recognition listening sound — the OS plays it whenever a mic session starts. Enable **Keep mic open while paused** in Settings → Reading defaults to hold one session for the whole reading, so it chimes once instead of on every resume.
- **Hotkeys not responding:** Another app may have registered the same shortcut. Check System Settings → Keyboard Shortcuts (macOS) or your compositor's keybind config (Linux) for conflicts.
- **App won't launch / blank script list:** This can happen if the SQLite database fails to load on first run. Quit and relaunch — the app retries automatically.

When filing a bug, please include:

- OS and version (e.g. macOS 15.3, Windows 11 24H2)
- App version (stable or glimpse + date stamp)
- Whether you're using the native build or web demo
- Steps to reproduce and what you expected vs. what happened

→ [Open an issue](https://github.com/omniship-labs/eyeread.in/issues/new/choose)

## Credits

eyeread.in is built on the shoulders of:

- **[Tauri](https://tauri.app/)** — the Rust + WebView shell that makes native invisibility possible
- **[React](https://react.dev/)** — UI framework
- **[Vite](https://vitejs.dev/)** — build tooling
- **[Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)** — on-device voice recognition
- **[tauri-plugin-sql](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/sql)** and **[tauri-plugin-store](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/store)** — storage

Contributors are listed in the [GitHub contributor graph](https://github.com/omniship-labs/eyeread.in/graphs/contributors). If you've helped test, translate, or triage and aren't listed, please open an issue or PR so we can add you.

---

AGPL-3.0 © 2026 Mrithyunjay Jagannath Halinge — see [LICENSE](LICENSE) and [LICENSING.md](LICENSING.md).  
Commercial licenses available: [license@omniship.dev](mailto:license@omniship.dev)
