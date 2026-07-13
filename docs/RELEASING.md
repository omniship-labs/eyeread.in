# Releasing eyeread.in

How eyeread.in is built, signed, and distributed — per OS, and where each
artifact lands. The CI that implements this lives in
[`.github/workflows/release.yml`](../.github/workflows/release.yml) (stable) and
[`.github/workflows/nightly.yml`](../.github/workflows/nightly.yml) (nightly);
both delegate the actual build/sign/notarize matrix to the shared
[`.github/workflows/build-app.yml`](../.github/workflows/build-app.yml).

The product's whole value — staying invisible to screen capture — depends on
OS-level primitives, so platform coverage and store eligibility are shaped more
by those primitives than by reach. Read the [Platform support](../README.md#platform-support)
table first; it explains why macOS/Windows are first-class and Linux is
best-effort.

## Cutting a release (what you do each time)

**Stable — four actions, ~10 minutes of your attention:**

1. Push a `v0.x.y` tag, or run the Release workflow manually with the version.
2. If you set a required reviewer on `release`, approve the run when it pauses.
3. After the ~30–60 min build, a **draft** release appears. Check that every
   platform's artifacts and `latest.json` are attached, and edit the generated
   notes.
4. Click **Publish**. Nothing reaches users — updater or download links — until
   this click. That's deliberate: keep `draft: true`.

If any build leg fails, the publish job never runs; re-run the failed jobs from
the run page rather than re-tagging. macOS legs fail fast at "Import Apple
signing certificate" when secrets are missing or the cert expired; notarization
problems surface in "Build, sign & notarize" (check the app-specific password
and Apple's system status).

**Nightly — zero actions, most days.** The 03:00 UTC cron builds and publishes
a fresh nightly release automatically — each run gets its own permanent,
uniquely-tagged release (`nightly-v<version>-YYYYMMDD-HHMMSS`). GitHub's
immutable-releases policy forbids ever reusing a tag that backed a published
release, so there's no single rolling "nightly" release to update in place
anymore. Only the 3 most recent nightly Releases are kept; older ones are
pruned automatically after each publish. The tags themselves are kept forever
(cheap, useful history) — only the Release object and its assets get deleted.
The updater's endpoint URL never changes: it points at `latest.json` on the
`nightly-manifest` branch (served via raw.githubusercontent.com), which gets
force-pushed to point at whichever release is current. Trigger a nightly on
demand via workflow dispatch when you want a build sooner. If a nightly is
broken, fix forward on `main`; don't hand-edit the release.

## Channels

| Channel     | Trigger                           | Bundle ID                | Updater endpoint                                      |
| ----------- | --------------------------------- | ------------------------ | ----------------------------------------------------- |
| **Stable**  | `v*` tag (or workflow dispatch)   | `in.eyeread.app`         | `releases/latest/.../latest.json`                     |
| **Nightly** | Daily cron (or workflow dispatch) | `in.eyeread.app.nightly` | `nightly-manifest` branch (raw.githubusercontent.com) |

Both channels install side-by-side. The Tauri auto-updater reads `latest.json`
and matches the running OS/arch to a `platforms` key. Stable's `latest.json`
can safely live as a release asset under the fixed `releases/latest/download/`
URL, because each `v*` tag is only ever published once — no immutability
conflict. Nightly can't do that (see above), hence the separate manifest
branch.

## Build matrix

| OS          | Targets (Rust triple)                               | Bundles            | Updater key(s)                      |
| ----------- | --------------------------------------------------- | ------------------ | ----------------------------------- |
| **macOS**   | `aarch64-apple-darwin` (Apple Silicon only)         | `dmg` + `updater`  | `darwin-aarch64`                    |
| **Windows** | `x86_64-pc-windows-msvc`, `aarch64-pc-windows-msvc` | `nsis` + `updater` | `windows-x86_64`, `windows-aarch64` |
| **Linux**   | `x86_64-unknown-linux-gnu`                          | `appimage`, `deb`  | `linux-x86_64` (AppImage)           |

macOS ships **Apple Silicon only** — the Intel (`x86_64`) target was dropped in
July 2026, and there's no Universal binary. Windows stays per-arch as separate
downloads; the updater keys on arch.

## Per-OS detail

### macOS — fully supported (Apple Silicon only)

- **Apple Silicon only, macOS 11+.** Intel builds were dropped in July 2026.
  Existing Intel installs don't get a farewell notice — the updater finds no
  `darwin-x86_64` key in `latest.json` and quietly reports "no update
  available".
- **Signing:** Apple Developer ID + notarization + stapling. The keychain
  import in [`import-apple-cert`](../.github/actions/import-apple-cert/action.yml)
  follows the [Tauri v2 macOS signing docs](https://v2.tauri.app/distribute/sign/macos/),
  and the signing identity is auto-detected from the imported certificate.
  Signing is mandatory — Gatekeeper blocks unsigned/unnotarized apps.
- **Invisibility:** capture exclusion uses `NSWindow.sharingType = .none` —
  this is **public** AppKit API, mapped from Tauri's `contentProtected`, and is
  _not_ itself an App Store blocker.
- **Mac App Store: blocked by the transparent overlay, not by invisibility.**
  The glass overlay window needs `app.macOSPrivateApi: true` (in
  `tauri.conf.json`) plus the Rust `macos-private-api` feature. Tauri documents
  that enabling this **"will prevent your application from being accepted into
  the App Store."** The sandbox MAS also requires would separately strain
  global-shortcut and always-on-top-across-Spaces behaviour. So the _current_
  build is MAS-ineligible — direct Developer ID distribution only.

  **Could MAS ever happen?** Only as a separate, sandboxed build variant that
  earns its way past the private-API flag:
  1. Make the overlay MAS-eligible — see the spike below. This is the
     load-bearing blocker, and it is **not** a config tweak.
  2. Adopt the **App Sandbox** with entitlements and re-verify global shortcuts,
     always-on-top across Spaces, SQLite in the container, and capture exclusion
     all still work sandboxed.
  3. Ship it as a **parallel MAS target** (App Store provisioning, no
     self-updater — MAS handles updates), kept alongside the Developer ID build.

  Treat MAS as a future discoverability play, not a near-term channel — and
  never as a replacement for the direct build.

  #### Spike: can we drop `macOSPrivateApi`? — No (without a native overlay)

  The overlay is rendered by a **transparent WKWebView** (`transparent: true`).
  For an HTML overlay to show the desktop through it, the _webview itself_ must
  not paint its background. The only known way to do that on macOS is the
  **private** Key-Value-Coding call `webView.setValue(false, forKey:
"drawsBackground")` — which is exactly what Tauri's `macos-private-api`
  feature does under the hood. Findings:
  - **No public API exists** to make a macOS WKWebView background transparent.
    Apple's feedback request for one (FB7539179 / feedback-assistant #81) has
    sat open since 2020 with no public API added; CSS `background: transparent`
    alone does **not** work — the webview still paints opaque unless
    `drawsBackground` is false.
  - **Tauri won't solve it for us.** The request to achieve transparency via
    public APIs / Metal (tauri-apps/tauri #13680) was **closed as not planned**.
  - `NSWindow` transparency itself _is_ public (`setOpaque:NO`, clear
    `backgroundColor`); the private dependency is **solely** the webview content
    layer.

  **Conclusion:** you cannot keep the React/HTML overlay _and_ turn off
  `macOSPrivateApi`. The only MAS-eligible route is to **re-render the overlay
  natively** (a transparent `NSWindow` drawing the script with AppKit / Core
  Text / `NSVisualEffectView` instead of a webview) — a real feature rewrite
  that forks the overlay into a web build (direct + Windows + Linux) and a
  native build (MAS only), doubling that surface. Given the direct Developer ID
  build already reaches 100% of Macs, **the spike's recommendation is to not
  pursue MAS** until there's concrete demand that only the App Store can serve.

- **Minimum OS:** `bundle.macOS.minimumSystemVersion` = `11.0` (Big Sur, the
  first Apple Silicon release). This also sets the build's deployment target.

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
- **Minimum OS:** Windows 10 version 2004 (build 19041) — the floor for
  `WDA_EXCLUDEFROMCAPTURE`. There's no Tauri config to hard-gate the OS version,
  so the app checks at runtime and the invisibility feature degrades gracefully
  on older builds. The installer pins a minimum WebView2 runtime
  (`minimumWebview2Version`).

### Linux — experimental

- **Status:** shipped so the README's "testers wanted" campaign has real
  downloads, but invisibility is **unreliable** — there is no portable,
  cross-compositor capture-exclusion protocol. The app makes users acknowledge
  this before enabling the overlay.
- **Formats:** **AppImage** (portable, distro-agnostic — the recommended format
  for testers and the updater's Linux artifact) plus **.deb** for
  Debian/Ubuntu.
- **glibc floor / minimum OS:** built on `ubuntu-22.04` (glibc 2.35). The
  AppImage runs on distros of that vintage or newer — roughly Ubuntu 22.04+,
  Debian 12+, Fedora 36+. Older distros are out of scope.

## Minimum OS versions

| OS      | Minimum                                   | Enforced by                              |
| ------- | ----------------------------------------- | ---------------------------------------- |
| macOS   | 11.0 Big Sur (Apple Silicon only)         | `bundle.macOS.minimumSystemVersion`      |
| Windows | 10 v2004 (build 19041)                    | runtime check (feature) + WebView2 floor |
| Linux   | Ubuntu 22.04 / Debian 12 / glibc 2.35 era | build host (`ubuntu-22.04`)              |

## Accounts, secrets & cost (the cheap path)

Total recurring cost for full trust on all three OSes: **≈ $99/yr (Apple) +
≈ $120/yr (Azure Trusted Signing) = ~$219/yr.** Linux is free.

| OS      | Account to create                                                | Cost          | Why it's the cheap option                                                    |
| ------- | ---------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| macOS   | [Apple Developer Program](https://developer.apple.com/programs/) | **$99/yr**    | Only way to notarize. No cheaper legit path; skipping = Gatekeeper warnings. |
| Windows | [Azure](https://portal.azure.com) → Trusted Signing              | **~$9.99/mo** | Cheapest real Authenticode (EV certs are $200–600/yr). No hardware token.    |
| Linux   | None (GitHub) / Flathub via GitHub PR                            | **Free**      | AppImage/deb on GitHub Releases; Flathub is a free PR.                       |

### macOS — one-time setup

Already done for the current cert (expires ~Feb 2027 — repeat this to renew):

1. Join the **Apple Developer Program** ($99/yr).
2. In the dev portal, create a **Developer ID Application** certificate; export
   it as a password-protected `.p12`.
3. Create an **app-specific password** at <https://appleid.apple.com> (for
   notarization).
4. Note your 10-char **Team ID** (Membership page).

Secrets to add — **ideally** to both the `release` and `nightly` environments
(repo → Settings → Environments → pick one → Add secret); see
[Handling secrets](#handling-secrets) for why:

- `APPLE_CERTIFICATE` — `base64 -i cert.p12` output
- `APPLE_CERTIFICATE_PASSWORD` — the `.p12` password
- `KEYCHAIN_PASSWORD` — any random string; unlocks the throwaway CI keychain
- `APPLE_ID` — your Apple ID email
- `APPLE_ID_PASSWORD` — the app-specific password
- `APPLE_TEAM_ID` — the 10-char team ID
- `APPLE_SIGNING_IDENTITY` — **optional**; CI auto-detects the identity from
  the imported certificate. Set it only to override.

### Windows — one-time setup (Azure Trusted Signing)

1. Create a free **Azure account**; add a pay-as-you-go subscription.
2. Create a **Trusted Signing account** (~$9.99/mo) and a **certificate
   profile**. _Eligibility:_ a registered org verified ≥ 3 years, **or**
   individual identity validation — budget a few days for Microsoft's identity
   check.
3. In **Entra ID**, register an **app (service principal)** and give it the
   _Trusted Signing Certificate Profile Signer_ role; create a client secret.

Secrets to add (same two environments):

- `AZURE_TRUSTED_SIGNING_ENDPOINT` — e.g. `https://eus.codesigning.azure.net/`
- `AZURE_TRUSTED_SIGNING_ACCOUNT` — Trusted Signing account name
- `AZURE_TRUSTED_SIGNING_PROFILE` — certificate profile name
- `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` — the service principal

Until these are set, Windows builds are Tauri-signed only (updater works,
SmartScreen warns) — nothing breaks.

### Shared — Tauri updater key

Already done (key `CB13CFCE0531C6C6`, both configs and both environments
set). To rotate: run `npm run tauri signer generate` once, then:

- Paste the **public key** into `plugins.updater.pubkey` in **both**
  `tauri.conf.json` and `tauri.nightly.conf.json`.
- Add the **private key** + passphrase as secrets in both environments:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Back up the private key offline immediately** — lose it and you can never
  ship an update to already-installed apps again (see
  [Handling secrets](#handling-secrets)).

### Free-but-worse fallbacks (if you can't pay yet)

- **macOS unsigned:** ship the `.dmg` without notarization — users must
  right-click → Open or run `xattr -dr com.apple.quarantine`. Bad first-run UX.
- **Windows unsigned:** Tauri-signed only; SmartScreen warns and winget won't
  accept it. The Azure ~$10/mo is the smallest spend that removes both problems.

## Handling secrets

The threat to manage: this is a **public, AGPL** repo that accepts fork PRs, and
the signing keys can sign software as you. Treat them accordingly.

- **Scope secrets to environments, not the repo — this is the target state,
  not what's live for Apple today.** The Tauri updater secrets follow it: both
  live in the `release` and `nightly` **environments** (repo → Settings →
  Environments), readable only by jobs that declare that `environment:` (the
  shared `build-app.yml` job does, picking the environment from its `channel`
  input), so PR/CI jobs can never see them.

  **The six Apple secrets are currently org-level** (visibility: all public
  repos in `omniship-labs`), set that way because writing environment secrets
  needs only repo access while org secrets need `admin:org` — the path of
  least resistance in the moment, not a deliberate choice. The tradeoff: any
  public repo later added to this org — not just `eyeread.in` — can read them,
  and the tag/branch environment rules below don't apply to org secrets at
  all. Fine for a single-maintainer org with one public repo; **re-scope them
  into the `release`/`nightly` environments (delete the org copies afterward)
  the moment a second public repo or another collaborator with repo-creation
  rights shows up.** (The Tauri **public** key is not a secret; it lives in
  `tauri.conf.json`.)

- **Restrict where secrets can be used.** On the `release` environment add a
  **deployment tag rule** (`v*`); on `nightly`, a **deployment branch rule**
  (`main` only — scheduled runs execute on the default branch, so the rule must
  be the trunk). Now the secrets are unreachable from any fork, branch, or tag
  outside those rules.
- **Prefer OIDC over a stored Azure secret (free hardening).** Instead of
  `AZURE_CLIENT_SECRET`, configure a **federated credential** in Entra ID for
  this repo's environment and add `permissions: id-token: write` +
  `azure/login@v2`. `trusted-signing-cli` then authenticates with a short-lived
  token and there's no long-lived secret to leak or rotate. Recommended once the
  basic path works.
- **Rotation & expiry.** Azure client secrets and the federated trust expire —
  calendar a renewal. Apple certs expire yearly; the app-specific password can
  be revoked from appleid.apple.com.
- **Back up the irreplaceable keys offline.** Store the **Tauri updater private
  key** + passphrase and the Apple `.p12` in a password manager / offline vault.
  Losing the Tauri key means you can never push an update to already-installed
  apps — there is no recovery.
- **Never log them.** Jobs pass secrets via `env:` only; don't `echo` them. The
  Azure endpoint/account/profile written into `signCommand` args are identifiers,
  not credentials — fine to appear in logs.

## Contributor onboarding & fork safety

The model: **anyone can contribute code; no contributor can reach a signing
key.** It mostly already holds — here's how to keep it that way.

- **CI for PRs is secret-free by design.** `ci.yml` runs on `pull_request`
  (lint/test/build only) and never touches signing. GitHub does not pass
  secrets to fork-PR runs, and the environment scoping above is the backstop.
- **Guard the privileged trigger.** `welcome.yml` uses `pull_request_target`
  (which _does_ run with repo context) but only posts a greeting and never
  checks out PR code — keep it that way. Never add `pull_request_target` +
  checkout of the PR head; that's the classic secret-exfiltration hole.
- **CODEOWNERS gates the dangerous files.** `.github/CODEOWNERS` requires
  maintainer review for `.github/`, the Tauri/signing config, and licensing —
  so a PR can't quietly rewrite the release workflow to print secrets. Pair it
  with a branch rule that **requires review from Code Owners**.
- **Require approval to run workflows from first-time contributors** (repo →
  Settings → Actions → "Require approval for all outside collaborators"). Stops
  a drive-by PR from running CI at all until a maintainer eyeballs it.
- **CLA is already enforced** (cla-assistant) — keep it; it's your legal basis
  for the dual AGPL/commercial license.
- **Branch protection on `main`:** require CI to pass + at least one review +
  Code Owner review; disallow force-push. Both nightly (cron/dispatch, always
  building `main`) and stable (tags) build off this branch, so protecting it
  protects both signed channels.

## Should you gate releases? Yes — here's the layering

Gate by _consequence_, cheaply:

1. **Stable already ships as a draft** (`draft: true`) — the human "publish"
   click is your final gate. Keep it; don't auto-publish stable.
2. **Tag protection.** Restrict who can push `v*` tags (Settings → Tags) so only
   maintainers can trigger a stable build.
3. **Environment rules** (above) gate _secret access_ to the right ref —
   the most important control, and free.
4. **Optional required reviewers on `release`.** Add yourself as a required
   reviewer so even a correctly-tagged build pauses for one approval before
   signing runs. Worth it for a solo maintainer who wants a deliberate "go".
   Leave `nightly` reviewer-free so automation isn't blocked.

Net: nightly is automatic but ref-locked to `main`; stable needs a protected tag,
runs in a gated environment, and still won't go public until you publish the
draft.

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
- **Mac App Store** — blocked by the `macOSPrivateApi` transparent-window flag;
  only viable as a separate sandboxed variant that drops it (see macOS above).

## Beta / QA distribution (the TestFlight question)

**TestFlight does not fit this app.** TestFlight ships builds through App Store
Connect, which means an App Store / Mac App Store distribution provisioning
profile, the App Store sandbox, and an upload-time private-API scan (external
testing also needs Beta App Review). The invisibility core relies on the private
`NSWindow.sharingType` API (`macOSPrivateApi`), which is exactly what that scan
rejects — the same blocker as the Mac App Store. So there is **no TestFlight path
for the desktop app**. (TestFlight is iOS-first anyway; eyeread.in is
desktop-only. If a mobile companion without the capture-exclusion feature is ever
built, TestFlight would apply to _that_, not to this binary.)

The good news: for a directly-distributed, notarized app you don't need it — the
**`nightly` channel already is our TestFlight equivalent**, and avoiding review
is a feature, not a gap. Map of what TestFlight gives vs. how we cover it:

| TestFlight capability      | Our equivalent (no store)                                              |
| -------------------------- | ---------------------------------------------------------------------- |
| Beta build distribution    | `nightly` GitHub pre-release (Developer ID-signed + notarized)         |
| Auto-update for testers    | Tauri updater on the nightly endpoint (works once `pubkey` is set)     |
| Tester management / groups | GitHub (watchers), a Discord/mailing list, or a private `beta` channel |
| Crash reports & feedback   | Add `tauri-plugin-sentry` (or similar) + the compat-report issue form  |
| Staged rollout             | Promote nightly → optional `beta` (RC) → stable                        |
| 90-day build expiry        | N/A — direct builds don't expire                                       |

### Optional: a third `beta` (release-candidate) channel

Two channels (nightly, stable) are enough today. If you want a calmer pre-release
ring than nightly without touching stable, add a `beta` channel that mirrors the
release workflow but triggers on `v*-beta.*` tags, publishes a **pre-release**
(not draft), and serves its own `latest.json` under a `beta` tag with bundle id
`in.eyeread.app.beta`. Opt-in users point the updater at the beta endpoint.
Worth it only once there's a tester base asking for RCs.

### Crash/feedback telemetry (the real TestFlight value)

The one thing the store gives that we don't yet: structured crash + feedback.
Cheapest privacy-respecting path is **self-hosted Sentry (GlitchTip) or the
free Sentry tier** wired via `tauri-plugin-sentry`, opt-in, with the policy
noted in `PRIVACY.md`. This is the highest-value beta addition — prioritise it
over a separate beta channel.

## Suggested execution order

1. **Azure Trusted Signing** for Windows — set the secrets; unblocks winget and
   kills SmartScreen friction. (CI scaffold already merged.)
2. **Homebrew Cask + winget** submissions (both consume signed GitHub assets).
3. **Flathub** for Linux.
4. **`get.eyeread.in` download page** with OS/arch auto-detect.
5. **Opt-in crash/feedback telemetry** (`tauri-plugin-sentry`) — the genuine
   TestFlight value; do before a dedicated `beta` channel.
