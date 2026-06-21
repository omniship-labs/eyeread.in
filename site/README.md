# eyeread.in — marketing site

The public landing page for **eyeread.in**, deployed to GitHub Pages.

It's a **Vite + React app** (the same stack as the desktop app under `src/`),
kept as a separate build so it deploys on its own. It recreates the marketing
prototype at `design/ui_kits/marketing/index.html` as fresh component-based code.

**No vendored copies.** Design tokens and brand assets are imported straight
from `design/` and bundled by Vite at build time — `design/` stays the single
source of truth, nothing is duplicated into `site/`.

## Layout

```
site/
├── index.html              # Vite entry: <head> meta + #root
├── vite.config.js          # standalone build (root: site/, outDir: site/dist)
└── src/
    ├── main.jsx            # imports design/styles.css (tokens) + mounts React
    ├── App.jsx             # composes the sections
    ├── config.js           # ← EDIT CONTENT HERE (copy, links, features, steps…)
    ├── assets.js           # brand SVGs imported from design/
    ├── styles/             # base.css, layout.css, components.css (marketing-only)
    ├── hooks/
    │   └── useSponsors.js  # live Open Collective fetch
    └── components/
        ├── Icon.jsx        # lucide-react + inline brand marks (GitHub/Apple)
        ├── Nav.jsx  Hero.jsx  Demo.jsx  Features.jsx
        ├── HowItWorks.jsx  OpenSource.jsx  Sponsors.jsx
        └── Brand.jsx  Footer.jsx
```

## Editing content

All copy, links, features, steps, and the Open Collective settings live in
**`src/config.js`** — the single source of truth. Components render from it, so
routine content edits never touch markup or styles.

## Design tokens & assets

`main.jsx` imports `design/styles.css` (the design system's blessed entry point)
for tokens, and `assets.js` imports brand SVGs from `design/assets/`. Vite
bundles both — change the design system and the site follows on the next build,
with zero copies to keep in sync. The marketing-only styling lives in
`src/styles/` and layers on top of the tokens.

## Live backers & sponsors

`hooks/useSponsors.js` fetches financial contributors **in the browser** from
Open Collective at page load, so the section is always current with no rebuild:

```
https://opencollective.com/<slug>/members/all.json
```

Configure it in `config.js → sponsors`:

- `collectiveSlug` — the Open Collective slug (default `eyereadin`)
- `sponsorThreshold` — lifetime USD total at/above which a contributor is shown
  as a **Sponsor** (larger avatar) rather than a **Backer**

If the request fails or there are no backers yet, the section shows a friendly
link to Open Collective instead of breaking.

## Social share image (og:image)

Scrapers don't render SVG `og:image`s, so `site/scripts/og-image.mjs` rasterizes
`design/assets/brand/og-image.svg` to a PNG at build time (using the real Space
Grotesk font from `@fontsource`, so it's faithful and deterministic). Output is
`site/public/og-image.png` — git-ignored, regenerated on every build, copied to
the site root by Vite → `https://get.eyeread.in/og-image.png`. Update the design
SVG and the card follows; the `og:image` meta lives in `index.html`.

## Commands

```bash
npm run site:og        # (re)generate the og:image PNG from the design SVG
npm run site:dev       # dev server with HMR (runs site:og first)
npm run site:build     # production build → site/dist (runs site:og first)
npm run site:preview   # preview the production build
```

## Deployment

The site is served at **get.eyeread.in** (GitHub Pages custom domain). The domain
is pinned by `site/public/CNAME`, which Vite copies to the build root.

Pushes to `main` that touch `site/**`, `design/**`, or the lockfile trigger
`.github/workflows/deploy-site.yml`, which runs `npm run site:build` and
publishes `site/dist` to GitHub Pages. Enable it once under
**Settings → Pages → Source → GitHub Actions**, then point a `get` CNAME DNS
record at the Pages host.
