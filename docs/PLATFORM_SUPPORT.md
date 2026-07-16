# Platform support

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
