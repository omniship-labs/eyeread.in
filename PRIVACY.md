# Privacy Policy

**eyeread.in** — published by Mrithyunjay Halinge ("MJ"), operating as OmniShip Labs  
_Last updated: September 26, 2026_

Your privacy is straightforward with eyeread.in: **the App stores everything
locally on your device and sends nothing to us or any third party during normal
use.** The only exception is a pack you've explicitly allowed to use the
internet.

---

## What we collect

### Currently: nothing

eyeread.in stores your scripts and settings in a local SQLite database and a
local settings file on your Mac. No data leaves your device unless you let a
pack use the internet (see [Packs and connected apps](#packs-and-connected-apps)),
and even then nothing is sent to us. There are no accounts, no sign-in, no
analytics, and no telemetry.

### In a future release: crash reports (opt-in)

We plan to add optional crash reporting so we can fix bugs faster. When we do:

- It will be **opt-in** — off by default, enabled only if you explicitly turn
  it on in Settings.
- Crash reports will contain a stack trace, the App version, and basic macOS
  version information.
- Crash reports will **never** contain the content of your scripts or any
  personally identifiable information.
- We will update this policy and clearly describe what is sent before the
  feature ships.

---

## What we never collect

- The content of your scripts or notes — ever
- Audio or microphone data (the App uses the Web Speech API locally on your
  device; audio never leaves it)
- Screen content
- Usage analytics or behavioral telemetry — ever, by policy

---

## Data stored on your device

| What                                            | Where                                                        | Controlled by                                 |
| ----------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Scripts                                         | `~/Library/Application Support/in.eyeread.app/eyeread.db`    | You — delete the app to remove                |
| Settings                                        | `~/Library/Application Support/in.eyeread.app/settings.json` | You — delete the app to remove                |
| Packs                                           | `~/Library/Application Support/in.eyeread.app/packs/`        | You — uninstall them in Settings → Packs      |
| Pack permissions, pack settings, connected apps | `~/Library/Application Support/in.eyeread.app/packs.json`    | You — revoke or uninstall in Settings → Packs |

You can delete all App data at any time by uninstalling eyeread.in and removing
the Application Support folder above.

---

## Packs and connected apps

eyeread.in can be extended with **packs** (add-ons that run inside the App) and
**connected apps** (other programs on your computer). Both are off until you
install or allow them, and neither sends anything to us.

### Packs

- A pack can only do what you allow, per permission, in Settings → Packs.
  Everything starts off, and you can revoke any permission at any time.
- **Internet access is off by default, and is set per permission.** A pack can
  reach the internet only for a permission that declares the exact `https://`
  sites it needs, and only after you switch internet on for that permission.
  The App makes each request on the pack's behalf, and refuses any other site.
- When you let a pack use the internet, what it sends to those sites (which
  can include script text, if it has a permission that gives it script text) is
  handled by those sites and the pack's author, under their own privacy
  policies, not this one. A pack's description should say what it sends and
  where; Verified packs are reviewed for this (see the
  [pack content policy](PACK_POLICY.md)).
- A pack can't read your library. It only sees what its permissions give it:
  the script being read, a file you pick with the App's own file picker, or
  the settings you set for it.
- **Network log.** Each pack's screen shows its recent requests: time,
  permission, method, site, status and size. Request and response bodies and
  header values are never logged. The log is kept in memory only, holds the
  last 500 requests per pack, is cleared when you quit, and never leaves your
  device.
- Checking a pack's signature (the ✓ Verified badge) happens offline. Installing
  a pack sends nothing.

### Connected apps

- Off by default. When on, the App listens only on `127.0.0.1`, so only
  programs on your computer can reach it; web pages are refused.
- Each app has to ask you first, and gets only the scopes you approve. The App
  stores only a hash of each app's token. You can revoke any app in Settings →
  Packs → Connected apps.
- A connected app is a separate program with its own privacy practices. What it
  receives depends on its scopes: for example, the title and position of the
  script being read, while a reading session is active. No scope can read your
  library.

### Catalogs (planned)

A future version will let you browse packs from catalogs. When it does,
checking catalogs will be **opt-in** and off by default. Only catalog lists and
the packs you choose will be downloaded, and none of your data will be sent. As
with any download, the server hosting a catalog (ours, or a third party's you
added) can see your IP address. We will update this policy before it ships.

---

## Third-party services

The App makes no network requests during normal use, except those you switch on
for a pack. The auto-updater checks for new versions at `releases.eyeread.in`
(or GitHub Releases) only when you explicitly click "Check for updates" in
Settings.

---

## Children

The App is not directed at children under 13. We do not knowingly collect any
information from children.

---

## Changes to this policy

If we make material changes — particularly when crash reporting is added — we
will update the "Last updated" date and note the change in the release notes.

---

## Contact

Questions about privacy? Open an issue at
[github.com/omniship-labs/eyeread.in](https://github.com/omniship-labs/eyeread.in)
or email privacy@omniship.dev.
