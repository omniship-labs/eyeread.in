# eyeread.in

[![GitHub License](https://img.shields.io/github/license/omniship-labs/eyeread.in)](LICENSE)
[![GitHub downloads](https://img.shields.io/github/downloads/omniship-labs/eyeread.in/total)](https://github.com/omniship-labs/eyeread.in/releases)
[![CII Best Practices](https://img.shields.io/cii/summary/13607)](https://bestpractices.coreinfrastructure.org/projects/13607)

[![GitHub commits since latest release](https://img.shields.io/github/commits-since/omniship-labs/eyeread.in/latest)](https://github.com/omniship-labs/eyeread.in/commits/main)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/omniship-labs/eyeread.in)](https://github.com/omniship-labs/eyeread.in/commits/main)

[![Latest glimpse](https://img.shields.io/github/v/release/omniship-labs/eyeread.in?include_prereleases&label=glimpse)](https://github.com/omniship-labs/eyeread.in/releases)
[![Glimpse date](https://img.shields.io/github/release-date-pre/omniship-labs/eyeread.in?label=glimpse%20date)](https://github.com/omniship-labs/eyeread.in/releases)
[![Latest stable](https://img.shields.io/github/v/release/omniship-labs/eyeread.in?label=stable)](https://github.com/omniship-labs/eyeread.in/releases/latest)
[![Stable date](https://img.shields.io/github/release-date/omniship-labs/eyeread.in?label=stable%20date)](https://github.com/omniship-labs/eyeread.in/releases/latest)

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fget.eyeread.in)](https://get.eyeread.in)
[![W3C Validation](https://img.shields.io/w3c-validation/default?targetUrl=https%3A%2F%2Fget.eyeread.in)](https://validator.w3.org/nu/?doc=https%3A%2F%2Fget.eyeread.in)
[![GitHub stars](https://img.shields.io/github/stars/omniship-labs/eyeread.in?style=flat)](https://github.com/omniship-labs/eyeread.in/stargazers)
[![CLA assistant](https://cla-assistant.io/readme/badge/omniship-labs/eyeread.in)](https://cla-assistant.io/omniship-labs/eyeread.in)

> Look at the lens. Not your notes.

A teleprompter that floats your script as a translucent glass overlay on top of whatever
you're sharing — and **stays invisible to screen-share and screen capture**.
Voice tracking follows you as you speak and highlights the exact word you're on.

Free, forever. Open source under **AGPL-3.0**.

**macOS and Windows** get OS-enforced invisibility. **Linux** is best-effort and
experimental — see [Platform support](docs/PLATFORM_SUPPORT.md).

Built with **Tauri 2 + React 18 + Vite**.

---

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

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the window/storage/voice-tracking
design and project layout.

## Known limitations

- Screen-share invisibility requires the native build (macOS or Windows). The web demo overlay is visible to screen capture, and Linux is best-effort only (see [Platform support](docs/PLATFORM_SUPPORT.md)).
- The overlay window captures mouse clicks within its bounds by default. Use ⌥⇧E to enable full click-through.
- Voice tracking quality depends on the platform speech engine. Timed scroll is the automatic fallback.
- On macOS, starting the mic needs one interaction inside the overlay (a WebKit user-activation rule) — the app recovers on your first click or drag, and the "keep mic open while paused" setting avoids repeated mic starts (and the system listening chime) within a session.

## Releases

Builds are published automatically via GitHub Actions on two channels, **Stable** (`v*`
tags on `main`) and **Glimpse** (daily builds off `main`), for macOS, Windows, and Linux.
See [docs/RELEASING.md](docs/RELEASING.md) for the full per-OS strategy.

## Disclaimers

We are **not** responsible for any issues arising from use of this software, including but not limited to data loss, privacy incidents, or unexpected screen-share behavior. By using eyeread.in you accept responsibility for verifying that the overlay is invisible on your specific setup before using it in sensitive contexts.

Screen-share invisibility is OS-enforced on macOS/Windows but not guaranteed against every
capture method, and Linux invisibility is experimental with no guarantees — see
[Platform support](docs/PLATFORM_SUPPORT.md). This app never sends audio or transcripts
anywhere; recognition is delegated to the platform's Web Speech API implementation. This
software is provided as-is under AGPL-3.0, **without warranty of any kind** — see
[LICENSE](LICENSE).

## Troubleshooting

Common issues (overlay visible in screen share, voice tracking not following, mic chime,
hotkey conflicts) are covered in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

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
