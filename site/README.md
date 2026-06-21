# eyeread.in — marketing site

The public landing page for **eyeread.in**, deployed to GitHub Pages.

It is a **standalone static site** — separate from the Tauri desktop app under
`src/`. It recreates the marketing prototype at
`design/ui_kits/marketing/index.html` as fresh, organized, production code
(it does **not** reuse the prototype's markup). There is **no build step**:
the browser loads ES modules directly.

## Layout

```
site/
├── index.html            # shell: <head> meta + #app mount + <noscript> fallback
├── css/
│   ├── base.css          # reset + element defaults              (source)
│   ├── layout.css        # nav, hero, section grids, footer       (source)
│   ├── components.css    # buttons, badges, demo, cards, sponsors (source)
│   └── tokens.css        # GENERATED from design/tokens/ — not committed
├── js/
│   ├── config.js         # ← EDIT CONTENT HERE (copy, links, features, steps…)
│   ├── icons.js          # inline SVG icon set (no icon-lib dependency)
│   ├── render.js         # config → DOM
│   ├── sponsors.js       # live Open Collective backers/sponsors fetch
│   ├── demo.js           # before/after reveal slider
│   └── main.js           # entry point
├── assets/               # COPIED from design/ + public/ — not committed
└── scripts/
    └── build.mjs         # assembles tokens.css + assets from their sources
```

Hand-written **source** lives in `index.html`, `css/{base,layout,components}.css`,
and `js/`. Everything the site borrows from elsewhere in the repo —
`css/tokens.css` and everything under `assets/` — is generated/copied at build
time and is **git-ignored**, so there are no committed duplicates to drift.

## Editing content

All copy, links, features, steps, and the Open Collective settings live in
**`js/config.js`** — the single source of truth. Change it there; the page
re-renders from it. No need to touch markup or CSS for routine content edits.

## Build (assemble borrowed artifacts)

`scripts/build.mjs` regenerates `css/tokens.css` from `design/tokens/` and copies
the brand assets from `design/assets/` + `public/` into `assets/`, so the site
can never drift from those sources:

```bash
npm run site:build
```

The deploy workflow runs this automatically before publishing. Run it once
locally before serving (see below).

## Live backers & sponsors

The Backers & sponsors section fetches financial contributors **in the browser**
from Open Collective at page load, so it is always current with no rebuild:

```
https://opencollective.com/<slug>/members/all.json
```

Configure it in `config.js → sponsors`:

- `collectiveSlug` — the Open Collective slug (default `eyereadin`)
- `sponsorThreshold` — lifetime USD total at/above which a contributor is shown
  as a **Sponsor** (larger avatar) rather than a **Backer**

If the request fails or there are no backers yet, the section shows a friendly
link to Open Collective instead of breaking.

## Running locally

Assemble the borrowed artifacts once, then serve over HTTP (ES modules don't
load from `file://`):

```bash
npm run site:build                       # generate tokens.css + copy assets
cd site && python3 -m http.server 8000   # then open http://localhost:8000
```

## Deployment

Pushes to `main` that touch `site/**`, `design/tokens/**`, or `design/assets/**`
trigger `.github/workflows/deploy-site.yml`, which runs `npm run site:build` and
publishes `site/` to GitHub Pages. Enable it once under
**Settings → Pages → Source → GitHub Actions**.
