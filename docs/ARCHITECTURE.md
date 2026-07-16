# Architecture

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
