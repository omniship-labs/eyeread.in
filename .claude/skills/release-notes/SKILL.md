---
name: release-notes
description: Generate user-facing release notes for an eyeread.in stable release, from the commits since the last vX.Y.Z tag. Use when cutting a new stable release and editing the draft GitHub Release's notes (see docs/RELEASING.md step 3), or when asked to "write release notes" / "draft the changelog" for eyeread.in.
---

# Release notes for eyeread.in

Turns the raw commit list GitHub's `generate_release_notes: true` fills a
draft with into something a user downloading the app would want to read.
Rendered on the download page via `site/src/lib/releaseNotes.js` — plain
Markdown (headings, bullets, bold/italic, links), kept short.

## Method

1. **Range**: `git tag -l 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -n2` for
   the previous tag, then `git log --oneline <prev>..<new>`.
2. **Read diffs, not just subjects** — `git show <sha>` for anything whose
   user impact isn't obvious from the message alone.
3. **Group by user impact**: New / Improved / Fixed / Under the hood (only
   if genuinely worth a curious user's attention — never for CI/lint/
   refactor/test-only commits). Omit empty sections; don't pad.
4. **One user sentence per note** — "Fixed DMG background clipping on some
   displays," never a commit message. No file names, no implementation
   detail. Unclear impact → ask the maintainer, don't guess.
5. **Flag separately** (not as a notes section) anything needing a manual
   callout: breaking changes, new permissions, platform-support changes.

## Output

```markdown
## New

- ...

## Fixed

- ...
```

Link the full range (`.../compare/vX.Y.Z...vA.B.C`) at the bottom instead
of itemizing every commit.

The generated notes text is the entire output of this skill — applying it
to a draft or publishing is out of scope here (see the `publish-release`
skill).
