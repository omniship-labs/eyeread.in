# Pack content policy

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
OmniShip names and logos, except that you may say your pack is "Verified by
eyeread.in" for any version that is currently Verified.

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

### 6. Hidden functionality

A pack must do what its description and manifest say, and nothing else. If it
connects to a third-party service, it must follow that service's terms.

### 7. Paid packs must still show their code

You may charge for a pack, or for features in it. What we require is the same
as for any pack: the complete, readable source is in the pack.

- Any license or payment check must be readable code in the pack, like the
  rest. No hidden, obfuscated or downloaded checks.
- If the check calls a server, that server must be a declared site, and the
  description must say what's sent to it.
- Say in the description what's free and what's paid, and where to buy.
- Payment happens outside eyeread.in; the app doesn't take payments.

Any license is fine. Because the code is readable, a determined user can see
how a license check works; charging tends to work best for support, updates,
or a service your pack connects to.

### 8. More permissions than it needs

Ask only for the permissions and network sites the pack actually uses, for
what its description says. No permissions "just in case", and no sites the
code never calls.

### 9. Remote switches

A pack can't change what it does based on data from a server. It may fetch the
content its description promises (a Notion page, say), but not settings, flags
or instructions that turn features on or off, or change where data goes, after
review. No kill switches and no hidden feature flags.

### 10. Mishandling credentials

Many packs need an API key or token for the service they connect to. A pack
may send it only to that service, and must not log it, show it elsewhere, or
send it anywhere else. Pack settings aren't secret storage, so say in the
description what the key can access.

A pack must never ask for your eyeread.in or OmniShip account details, or for
passwords to services it doesn't connect to.

### 11. A pack id that isn't yours

A pack's `id` never changes and is shown as who made it, so it must be yours to
use: reverse-DNS of a domain you control (`com.example.notion-sync` for
`example.com`), or `io.github.<your-username>.<pack>` if you don't have one.
No ids that suggest a company or product you aren't.

### Also

We won't verify anything that's illegal, harmful to users (malware, scams,
harassment), or breaks the [Terms of Use](TERMS.md).

---

## Staying Verified

A Verified version must stay available from where it was reviewed. We check
every Verified version daily, and withdraw it if:

- its zip can't be downloaded for 3 days in a row (from its URL or any mirror);
- its zip changes, even slightly; or
- its tag or commit disappears from your repo, or the tag is moved.

Withdrawing isn't a penalty. The version leaves the catalog and installed
copies show as Community, with the reason, but they aren't blocked. To stay
Verified, don't delete or re-tag your releases; to fix a problem, submit a new
version.

---

## Enforcement

- **During review** we explain what needs to change, and you can update the
  pull request.
- **After verification** we add the pack's hash to the signed revocation list,
  with a reason. The app then blocks that version and shows users the reason.
  Only the affected versions are revoked.

If you think we got it wrong, reply on the pull request or email
**legal@omniship.dev**.
