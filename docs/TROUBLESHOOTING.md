# Troubleshooting

If something isn't working, please check these first:

- **Overlay is visible in screen share (macOS/Windows):** Make sure you're running the native build, not the web demo (`npm run dev`). The web demo overlay is always visible to capture by design.
- **Overlay is visible in screen share (Linux):** This is expected — Linux invisibility is experimental and compositor-dependent. See [Platform support](PLATFORM_SUPPORT.md).
- **Voice tracking isn't following along:** Check the mic permission first (System Settings → Privacy & Security → Microphone on macOS). On macOS the mic can't start until you've interacted with the overlay once — click or drag anywhere on it, or use the amber "Enable mic" chip in the header. Where the Web Speech API is genuinely unavailable (e.g. some Linux builds) the app falls back to timed scroll automatically.
- **Voice indicator flickering / voice tracking unreliable (macOS):** Confirmed fix — check **System Settings → Keyboard → Dictation** is turned on. The Web Speech API that voice tracking uses rides on the system Dictation service, which is a separate OS-level switch from the app's own mic/speech-recognition permission prompts (and from System Settings → Privacy & Security → Microphone) — it's easy to have granted the app's permissions but never turned Dictation on. This showed up most often while on a call (Zoom, Meet, Teams…), since reading along while presenting is the app's core use case, but Dictation being off — not the call app itself — was the actual cause. If it happens, an amber **"Mic issue"** chip appears in the header; tracking resumes automatically once Dictation is enabled, no restart needed.
- **Mic chime on every resume (macOS):** That's the system's speech-recognition listening sound — the OS plays it whenever a mic session starts. Enable **Keep mic open while paused** in Settings → Reading defaults to hold one session for the whole reading, so it chimes once instead of on every resume.
- **Hotkeys not responding:** Another app may have registered the same shortcut. Check System Settings → Keyboard Shortcuts (macOS) or your compositor's keybind config (Linux) for conflicts.
- **App won't launch / blank script list:** This can happen if the SQLite database fails to load on first run. Quit and relaunch — the app retries automatically.

When filing a bug, please include:

- OS and version (e.g. macOS 15.3, Windows 11 24H2)
- App version (stable or glimpse + date stamp)
- Whether you're using the native build or web demo
- Steps to reproduce and what you expected vs. what happened

→ [Open an issue](https://github.com/omniship-labs/eyeread.in/issues/new/choose)
