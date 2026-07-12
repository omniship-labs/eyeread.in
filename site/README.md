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
├── scripts/
│   ├── og-image.mjs        # rasterize the social card (build time)
│   └── prerender.mjs       # per-locale static pages + hreflang + sitemap (post-build)
└── src/
    ├── main.jsx            # imports design/styles.css (tokens) + i18n + mounts React
    ├── App.jsx             # react-router <Routes>: home ↔ /docs
    ├── docs/               # developer docs at /docs (see "Developer docs" below)
    ├── config.js           # non-translatable structure + buildConfig()/useConfig()
    ├── i18n/               # ← EDIT COPY HERE — one bundle per language
    │   ├── registry.js     # pure locale data (bundles, regions, URLs) — Node-safe
    │   ├── index.js        # live i18next instance: detection + persistence
    │   ├── i18n.test.js    # asserts every locale matches en's shape
    │   ├── en.js           # English (source of truth — mirror its shape)
    │   └── fr de es ru zh ja hi mr ta te kn ml .js
    ├── assets.js           # brand SVGs imported from design/
    ├── data/
    │   └── credits.js      # contributor credits, bucketed by kind of work
    ├── styles/             # base.css, layout.css, components.css (marketing-only)
    ├── hooks/
    │   ├── useSponsors.js      # live Open Collective fetch
    │   └── useDocumentMeta.js  # sync <head> title/description on language switch
    └── components/
        ├── Icon.jsx        # lucide-react + inline brand marks (GitHub/Apple)
        ├── LanguageSwitcher.jsx
        ├── Nav.jsx  Hero.jsx  Demo.jsx  Features.jsx
        ├── HowItWorks.jsx  OpenSource.jsx  Sponsors.jsx
        ├── Credits.jsx     # contributor credits (reuses Sponsors' avatars)
        └── Brand.jsx  Footer.jsx
```

## Editing content

The page is **multilingual** (English, French, German, Spanish, Russian,
Chinese, Japanese, Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam), powered
by [i18next](https://www.i18next.com/) + react-i18next.

- **Translatable copy** lives per-language in **`src/i18n/*.js`**. `en.js` is the
  source of truth; every other locale mirrors its exact shape (same keys, same
  array lengths). To edit copy, edit the relevant locale file(s). To add a string,
  add it to `en.js` first, then to every other locale.
- **Non-translatable structure** — brand, links, icons, and the Open Collective
  settings — lives in **`src/config.js`**. `buildConfig()` weaves the active
  locale's strings together with this shared structure, and `useConfig()` exposes
  the result to components (re-rendering on language change).

### Adding a language

1. Add a bundle `src/i18n/<code>.js` (copy `en.js` and translate).
2. Import it in `src/i18n/index.js` and add `{ code, label, native }` to `locales`.

The visitor's language is auto-detected from the browser on first visit and their
choice from the in-nav switcher is remembered in `localStorage`
(`eyeread.locale`); `<html lang>` follows the active language.

## Developer docs (`/docs`)

The site doubles as the home for the **developer documentation** at
`get.eyeread.in/docs`. Routing is **react-router** (`BrowserRouter` in
`main.jsx`, `<Routes>` in `App.jsx`): `/docs` and `/docs/:slug` render the docs
layout, everything else renders the marketing home, which stays multilingual
exactly as before. The sidebar uses `<NavLink>` for its active state.

```
src/docs/
├── registry.js        # page order, slugs, URL helpers, head meta (Node-safe)
├── content.en.js       # the `docs` i18next namespace — English copy
├── DocsLayout.jsx      # sidebar + active page + <head> sync
├── CodeBlock.jsx       # <CodeBlock> / <Code> primitives
└── pages/              # Overview, BuildFromSource, Architecture,
                        # Contributing, TauriApi
```

- **i18n is wired, English-only for now.** Docs copy lives in its own `docs`
  namespace (separate from the marketing `translation` namespace, so it never
  affects the locale shape test). Only `content.en.js` exists; every other
  locale falls back to English via i18next `fallbackLng`. To translate, add
  `src/docs/content.<code>.js` mirroring `content.en.js`, then register it in
  `src/i18n/index.js`. Technical literals (commands, file paths, API
  signatures, code blocks) stay in the page components — only prose translates.
- **Crawlable, static-host friendly.** `scripts/prerender.mjs` writes a static
  `dist/docs/<slug>/index.html` per route (with its own `<title>`/description/
  canonical and root-absolute asset paths) and adds them to `sitemap.xml`, so
  deep links resolve before the client router runs. A `dist/404.html` SPA
  fallback covers any unmatched path.

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

- `collectiveSlug` — the Open Collective slug (default `omniship`)
- `sponsorThreshold` — lifetime USD total at/above which a contributor is shown
  as a **Sponsor** (larger avatar) rather than a **Backer**

If the request fails or there are no backers yet, the section shows a friendly
link to Open Collective instead of breaking.

## Credits / contributors

Contributors are credited in **buckets by kind of work** — `translation`,
`code`, `design`, `review`, `docs`, `infra`. Edit one file, `data/credits.js`:

```js
export const credits = [
  { name: 'Ada', profile: 'https://github.com/ada', roles: ['code', 'review'] },
  { name: 'Kuvempu', roles: ['translation'], langs: ['kn'] },
];
```

`<Credits>` (in `App.jsx`, after Sponsors) groups people by bucket and reuses
the sponsor avatar visuals. It **self-hides** while the list is empty, so it can
live in the page permanently and surface only once there are entries. Inject on
demand:

- `<Credits />` — all non-empty buckets, full section
- `<Credits only={['translation']} />` — a single bucket, drop it anywhere
- `<Credits bare />` — just the grouped avatars, no section/heading wrapper

`groupCredits(only)` / `groupContributors(people, only)` expose the same grouping
for programmatic use. Bucket order, labels, and icons live in `creditBuckets`;
add a bucket there (with an `Icon` name) and tag people with its id.

## SEO & per-locale pages

Because the page is a client-rendered SPA, crawlers and link scrapers would
otherwise only ever see the English `<head>`. To fix that,
`site/scripts/prerender.mjs` runs **after** `vite build` and, for every locale,
writes a static page:

- default locale → `dist/index.html`; others → `dist/<code>/index.html`
- localized `<title>`, `description`, and `og:`/`twitter:` tags (the brand name
  `eyeread.in` stays constant — only the tagline localizes)
- `<html lang>` set, which the i18next **htmlTag** detector reads, so landing on
  `/es/` from a search result boots the site in Spanish
- a `canonical` URL plus full **hreflang** alternates (+ `x-default`) and
  `og:locale` / `og:locale:alternate`

It also emits `dist/sitemap.xml` (with hreflang alternates) and `dist/robots.txt`.
At runtime, in-session language switches keep the `<head>` in sync via
`hooks/useDocumentMeta.js`. The canonical origin lives in `i18n/registry.js`
(`SITE_URL`).

> The social `og:image` is **not** localized: the card font (Space Grotesk) is
> Latin-only and can't render Devanagari/Tamil/CJK, so all locales share the
> brand card. `og:locale` still varies per page.

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
npm run site:build     # production build → site/dist (og:image + per-locale prerender)
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
