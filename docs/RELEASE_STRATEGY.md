# Release strategy

How eyeread.in is built, signed, and distributed — per OS, and where each
artifact lands. The CI that implements this lives in
[`.github/workflows/release.yml`](../.github/workflows/release.yml) (stable) and
[`.github/workflows/nightly.yml`](../.github/workflows/nightly.yml) (nightly).

The product's whole value — staying invisible to screen capture — depends on
OS-level primitives, so platform coverage and store eligibility are shaped more
by those primitives than by reach. Read the [Platform support](../README.md#platform-support)
table first; it explains why macOS/Windows are first-class and Linux is
best-effort.

## Channels

| Channel     | Trigger                     | Bundle ID                | Updater endpoint              |
| ----------- | --------------------------- | ------------------------ | ----------------------------- |
| **Stable**  | `v*` tag (or workflow dispatch) | `in.eyeread.app`     | `releases/latest/.../latest.json` |
| **Nightly** | Push to `dev` or daily cron | `in.eyeread.app.nightly` | `releases/download/nightly/latest.json` |

Both channels install side-by-side. The Tauri auto-updater reads `latest.json`
and matches the running OS/arch to a `platforms` key.

## Build matrix

| OS          | Targets (Rust triple)                                  | Bundles            | Updater key(s)                       |
| ----------- | ------------------------------------------------------ | ------------------ | ------------------------------------ |
| **macOS**   | `aarch64-apple-darwin`, `x86_64-apple-darwin`          | `dmg` + `updater`  | `darwin-aarch64`, `darwin-x86_64`    |
| **Windows** | `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc`    | `nsis` + `updater` | `windows-x86_64`, `windows-aarch64`  |
| **Linux**   | `x86_64-unknown-linux-gnu`                             | `appimage`, `deb`  | `linux-x86_64` (AppImage)            |

Separate per-arch downloads (not a macOS Universal binary): smaller files, and
the updater already keys on arch.

## Per-OS detail

### macOS — fully supported

- **Signing:** Apple Developer ID + notarization + stapling (see the
  `import-apple-cert` action and the `APPLE_*` secrets). This is mandatory —
  Gatekeeper blocks unsigned/unnotarized apps.
- **Invisibility:** `NSWindow.sharingType = .none` via `macOSPrivateApi` +
  `contentProtected`.
- **Mac App Store: not pursued.** Private API + the App Store sandbox are
  mutually exclusive; MAS would reject the build. Direct distribution only.
- **TODO:** set `minimumSystemVersion` in `tauri.conf.json` so old Macs are
  rejected at install/update time rather than crashing.

### Windows — fully supported

- **Invisibility:** `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` (Win10
  2004+), which Tauri's `contentProtected` maps to.
- **Installer:** NSIS in `currentUser` mode — no admin prompt, right for an
  overlay utility.
- **Code signing (Authenticode):** wired for **Azure Trusted Signing** and
  **gated on secrets** — when they're absent the installer is still
  Tauri-signed (so the updater works) but SmartScreen shows "Unknown
  publisher." Set these repository secrets to switch Authenticode on:
  - `AZURE_TRUSTED_SIGNING_ENDPOINT` — e.g. `https://eus.codesigning.azure.net/`
  - `AZURE_TRUSTED_SIGNING_ACCOUNT` — Trusted Signing account name
  - `AZURE_TRUSTED_SIGNING_PROFILE` — certificate profile name
  - `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` — service
    principal for the signing identity (Azure credential chain)

  CI installs `trusted-signing-cli` and injects a `bundle.windows.signCommand`
  override only when `AZURE_TRUSTED_SIGNING_ENDPOINT` is set, so unsigned local
  and fork builds keep working. Azure Trusted Signing (~$10/mo, cloud-based) is
  preferred over an EV cert on a hardware token, which can't run unattended in
  CI.
- **arm64:** cross-compiled from the x64 `windows-latest` runner. WebView2 is
  arch-independent at runtime.

### Linux — experimental

- **Status:** shipped so the README's "testers wanted" campaign has real
  downloads, but invisibility is **unreliable** — there is no portable,
  cross-compositor capture-exclusion protocol. The app makes users acknowledge
  this before enabling the overlay.
- **Formats:** **AppImage** (portable, distro-agnostic — the recommended format
  for testers and the updater's Linux artifact) plus **.deb** for
  Debian/Ubuntu.
- **glibc floor:** built on `ubuntu-22.04` (not `-latest`) so the AppImage runs
  on a wider range of distros.

## Where we distribute

### Canonical (own it now)

- **GitHub Releases** — source of truth; feeds the Tauri auto-updater via
  `latest.json`. Already implemented.
- **Direct download on `get.eyeread.in`** — should OS/arch-detect and deep-link
  the matching GitHub asset. Highest-conversion channel.

### Package managers (after Windows signing lands)

- **macOS → Homebrew Cask** — `brew install --cask eyeread`. Easy once
  notarized; submit to `homebrew/cask`.
- **Windows → winget** — submit a manifest to `microsoft/winget-pkgs`. Requires
  the Authenticode-signed installer above.
- **Linux → Flathub** (best reach) and optionally **AUR** for Arch.

### Deferred / not pursued

- **Microsoft Store (MSIX)** — possible, but the capture-exclusion API may draw
  review questions; revisit later.
- **Snap, Chocolatey** — only if the community asks.
- **Mac App Store** — blocked by private-API usage (see above).

## Suggested execution order

1. **Azure Trusted Signing** for Windows — set the secrets; unblocks winget and
   kills SmartScreen friction. (CI scaffold already merged.)
2. **Linux + Windows arm64 builds** — done; verify a release produces all
   artifacts and a valid `latest.json`.
3. **Homebrew Cask + winget** submissions (both consume signed GitHub assets).
4. **Flathub** for Linux.
5. **`get.eyeread.in` download page** with OS/arch auto-detect.
