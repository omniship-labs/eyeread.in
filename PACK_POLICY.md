# Pack content policy

> **Draft, pending sign-off.** This policy isn't final yet and may change
> before the first pack is Verified.

This is what we won't verify. A pack that breaks it doesn't get the
✓ **Verified by eyeread.in** badge, and a Verified pack found to break it later
is revoked.

The policy applies to Verified packs only. Anyone can still share an
unverified (Community) pack: users see a warning and have to accept the risk
before installing it. Connected apps aren't reviewed at all.

---

## What we won't verify

### 1. Hidden live-answer feeds

eyeread.in is a teleprompter you can hide from screen recordings. It exists so
you can read **your own** script. We won't verify packs that listen to a
conversation, meeting, interview, exam or call and feed generated answers into
the prompter while it happens, or that are built to hide that from the other
people in it.

Packs that help you write, import or edit a script ahead of time are fine,
including ones that use AI to do it.

### 2. Deceptive names or impersonation

A pack's name, description, author and icon must say honestly what it is and
who made it. No posing as another person, company, product or pack, and no
claiming to be official, endorsed or made by OmniShip unless it is.

### 3. Trademark misuse

Use other people's trademarks only as far as needed to say what the pack works
with ("Sends Notion pages to your library"), and not in a way that suggests the
owner made or endorses the pack. The same applies to the eyeread.in and
OmniShip names and logos.

### 4. Obfuscated code

Reviewers must be able to read everything a pack does. The installer already
rejects minified files; beyond that we reject code that hides what it does,
such as encoded or encrypted payloads, strings built up to hide URLs or API
calls, or code downloaded and run at runtime.

### 5. Collecting data beyond what's declared

A pack may send data only to the sites its manifest declares, and only what its
description says. In particular:

- Say in the description what the pack sends, to which site, and why. Script
  text counts.
- No analytics, tracking, advertising or fingerprinting, even to a declared
  site.
- No selling or sharing users' data with anyone other than the declared
  service the user asked the pack to talk to.

### Also

We won't verify anything that's illegal, harmful to users (malware, scams,
harassment), or breaks the [Terms of Use](TERMS.md).

---

## Enforcement

- **During review** we explain what needs to change, and you can update the
  pull request.
- **After verification** we add the pack's hash to the signed revocation list,
  with a reason. The app then blocks that version and shows users the reason.
  Only the affected versions are revoked.

If you think we got it wrong, reply on the pull request or email
**legal@omniship.dev**.
