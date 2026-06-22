# Contributing to eyeread.in

Thanks for wanting to make eyeread.in better. This is a small, focused project —
contributions that make the core experience sharper are very welcome.

## Before you start

By submitting a pull request you agree to the
[Contributor License Agreement](CLA.md). A bot will ask you to sign it on your
first PR — it takes about 30 seconds.

## Setup

```bash
# Prerequisites: Rust (stable), Node 22+
# https://v2.tauri.app/start/prerequisites/

git clone https://github.com/omniship-labs/eyeread.in
cd eyeread.in
npm install

# Web demo (no Rust build needed)
npm run dev

# Native app
npm run tauri dev
```

## What we're looking for

- Bug fixes with a clear reproduction case
- Performance improvements to voice tracking or scroll
- Accessibility improvements
- Tests for logic in `src/lib/` and `src/hooks/`

Linux is officially experimental — see [Platform support](README.md#platform-support).
**Compatibility reports and compositor testing on Linux are especially welcome.**

## What we're probably not looking for (ask first)

- New UI screens or major feature additions without prior discussion
- Changes to the design tokens in `design/` — those come from the design source of truth
- Changes to CI, signing, or release config (`.github/`, `src-tauri/tauri*.conf.json`) —
  these are code-owned and gated; open an issue first

> **Release secrets never reach fork PRs.** CI on a pull request runs lint/test/build
> only — no signing secrets are exposed. Signed builds run from `dev`/tags inside
> protected environments. See [docs/RELEASE_STRATEGY.md](docs/RELEASE_STRATEGY.md).

Open an issue to discuss anything large before writing code.

## Pull request checklist

- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run format` has been run
- [ ] The PR description explains _why_, not just _what_
- [ ] New logic has tests where practical

## Commit style

Plain imperative: `Fix voice match drift on long scripts` — no emoji, no ticket numbers required.

## Questions

Open an issue or start a GitHub Discussion. We try to respond within a few days.
