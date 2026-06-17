# Privacy Policy

**eyeread.in** — published by OmniShip  
_Last updated: June 2026_

Your privacy is straightforward with eyeread.in: **the App stores everything
locally on your device and sends nothing to us or any third party during normal
use.**

---

## What we collect

### Currently: nothing

eyeread.in stores your scripts and settings in a local SQLite database and a
local settings file on your Mac. No data leaves your device. There are no
accounts, no sign-in, no analytics, and no telemetry.

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

| What | Where | Controlled by |
|---|---|---|
| Scripts | `~/Library/Application Support/in.eyeread.app/eyeread.db` | You — delete the app to remove |
| Settings | `~/Library/Application Support/in.eyeread.app/settings.json` | You — delete the app to remove |

You can delete all App data at any time by uninstalling eyeread.in and removing
the Application Support folder above.

---

## Third-party services

The App makes no network requests during normal use. The auto-updater checks for
new versions at `releases.eyeread.in` (or GitHub Releases) only when you
explicitly click "Check for updates" in Settings.

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
