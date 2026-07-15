---
name: release-notes
description: Generate user-facing release notes for an eyeread.in stable release, from the commits since the last vX.Y.Z tag. Use when cutting a new stable release and editing the draft GitHub Release's notes (see docs/RELEASING.md step 3), or when asked to "write release notes" / "draft the changelog" for eyeread.in.
---

# Release notes for eyeread.in

Produces the release-notes body a maintainer pastes into the draft GitHub
Release before publishing (see `docs/RELEASING.md`'s "Cutting a release"
section, step 3 — GitHub's `generate_release_notes: true` already fills the
draft with a raw commit/PR list; this skill turns that into something a user
downloading the app would actually want to read).

## Where the notes end up

The release body is rendered on the site's download page
(`site/src/pages/Download.jsx` → `renderReleaseNotesHtml`, in
`site/src/lib/releaseNotes.js`) as Markdown-to-HTML inside a collapsible
`<details>` per release. Write plain Markdown; keep it short — this is a
summary, not a full changelog.

## Steps

1. **Find the version range.** Read the current draft's tag (e.g. `v0.1.1`)
   and find the previous stable tag:

   ```
   git tag -l 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -n2
   ```

   (excludes glimpse tags automatically — they're named `glimpse-v...`, not
   `v...`).

2. **Read the commits, not just messages.** List commits between the two
   tags, then read the actual diffs for anything non-obvious — commit
   subjects alone often undersell or bury what a user-facing note should say:

   ```
   git log --oneline v0.1.0..v0.1.1
   git show <sha>   # for any commit whose subject doesn't make the user impact obvious
   ```

3. **Categorize by user impact, not by commit type.** Group into whatever
   subset of these actually apply — skip empty sections entirely, don't pad:
   - **New** — user-visible features
   - **Improved** — changes to existing behavior a user would notice
   - **Fixed** — bug fixes
   - **Under the hood** — only include if there's something worth a curious
     user knowing (e.g. a security fix, a dependency bump with real impact);
     otherwise omit — CI/lint/refactor/test-only commits don't belong here.

4. **Write each note as a user sentence, not a commit message.** "Fixed DMG
   background clipping on some displays" — not "Fix DMG bottom content
   clipping — position was scaling with H". No implementation detail, no
   file names, no internal reasoning. If a commit's actual user impact is
   unclear from its message/diff, don't guess — ask the maintainer rather
   than inventing a plausible-sounding note.

5. **Flag anything that needs a manual callout**, separately from the notes
   themselves — a version bump alone doesn't need a section, but do call it
   out to the maintainer when you spot: a breaking change, a new required
   permission (e.g. this release added microphone/speech-recognition
   permission prompts — worth a heads-up line), or a platform-support change
   (e.g. the Intel-macOS-drop precedent in `docs/RELEASING.md`).

## Output format

```markdown
## New

- ...

## Improved

- ...

## Fixed

- ...
```

Keep it to what changed for the _user_ — link to the full commit range
(`https://github.com/omniship-labs/eyeread.in/compare/vX.Y.Z...vA.B.C`) at
the bottom for anyone who wants the raw diff, rather than trying to itemize
every commit.

## Glimpse channel

Glimpse is a different situation: `glimpse.yml`'s `publish` job auto-publishes
every build with a fixed static body ("Automated glimpse build from the
`main` branch...") — there's no draft, no review step, and it ships
multiple times a day, so per-build curated notes aren't wired into CI and
wouldn't be worth writing for every single one.

Use this skill for glimpse only on request — e.g. a maintainer wants a
"what's new since the last glimpse build" summary to post somewhere (Discord,
a tester channel), not as part of the automated publish flow. Same method,
different range:

```
git tag -l 'glimpse-v*' | sort -V | tail -n2   # previous glimpse tag vs. current
git log --oneline <prev-glimpse-tag>..HEAD
```

Same categorization and per-note style as above, but looser — glimpse
testers expect to see in-progress/experimental items, so it's fine to
include something like "Trying out: new DMG background arrow" that stable's
notes wouldn't carry.
