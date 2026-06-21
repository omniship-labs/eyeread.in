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
│   ├── tokens.css        # GENERATED from design/tokens/ — do not edit by hand
│   ├── base.css          # reset + element defaults
│   ├── layout.css        # nav, hero, section grids, footer
│   └── components.css     # buttons, badges, demo, feature cards, sponsors
├── js/
│   ├── config.js         # ← EDIT CONTENT HERE (copy, links, features, steps…)
│   ├── icons.js          # inline SVG icon set (no icon-lib dependency)
│   ├── render.js         # config → DOM
│   ├── sponsors.js       # live Open Collective backers/sponsors fetch
│   ├── demo.js           # before/after reveal slider
│   └── main.js           # entry point
├── assets/               # logos, favicon, og image
└── scripts/
    └── sync-tokens.mjs   # regenerates css/tokens.css from design/tokens/
```

## Editing content

All copy, links, features, steps, and the Open Collective settings live in
**`js/config.js`** — the single source of truth. Change it there; the page
re-renders from it. No need to touch markup or CSS for routine content edits.

## Design tokens

`css/tokens.css` is **generated** from the design system's `design/tokens/`
(the source of truth), so the site never drifts from it:

```bash
npm run site:tokens   # regenerate site/css/tokens.css
```

The deploy workflow runs this automatically before publishing.

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

ES modules need to be served over HTTP (not `file://`):

```bash
cd site && python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Pushes to `main` that touch `site/**` (or the design tokens) trigger
`.github/workflows/deploy-site.yml`, which publishes `site/` to GitHub Pages.
Enable it once under **Settings → Pages → Source → GitHub Actions**.
