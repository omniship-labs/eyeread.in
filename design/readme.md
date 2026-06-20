# eyeread.in — Design System

> **Brand:** eyeread.in · AGPL-3.0, open source, donation-supported
> **GitHub:** `github.com/omniship-labs/eyeread` · Org: `omniship-labs`
> **Status:** Active — all foundations, components, and UI kits complete

---

## Start here

If you're joining the project, do this first:

1. **Read this file** end-to-end (~8 min).
2. Open the **Design System tab** — every specimen card is live. This is the primary visual reference.
3. To use components, link `styles.css` and load `_ds_bundle.js`:
   ```js
   const { Button, Card, ScriptViewer } = window.TelepromptDDesignSystem_019e26;
   ```
   The namespace token is stable — it will not change if the brand name changes.
4. See **File index** below for where everything lives.

---

## What eyeread.in does

A teleprompter that works on **macOS** by floating your script as a translucent glass overlay on top of whatever you're sharing — slides, a Zoom call, a recording — while **remaining invisible to all screen-share and screen-capture software**.

Voice tracking listens as you speak, highlights the word you're on, and scrolls ahead automatically. The speaker's eyes stay on the camera instead of darting to notes.

**Taglines:**
- *"Look at the lens. Not your notes."*
- *"Your script, on the glass. Invisible on the recording."*

---

## The name

**eyeread.in** — the `.in` is part of the brand name, not just the domain. Always lowercase. Never "EyeRead" or "Eyeread" — it is `eyeread.in`.

The wordmark is `[mark] eyeread.in` with `.in` in the indigo accent color (#6e56f7).

Built-in pun: **eye = I**, so the full lockup reads *"I read in"* — the mark says the first word, the type says the rest. Intentional; lean into it.

---

## Core design principles

| Principle | Detail |
|---|---|
| **See-through, always** | The overlay is glass. Never a solid panel. Content is visible through it. |
| **Near the camera** | Anchors top-center, just below the webcam. Eyeline looks natural on camera. |
| **Invisible to the audience** | Nothing the prompter draws appears in a shared or recorded frame. Say so clearly in UI. |
| **Voice-led** | Highlight follows speech, not a timer. Timer (count-up or countdown) is additive. |
| **No noise** | No pulsing "Live" badge. The timer signals active state. Less is more. |

---

## Content fundamentals

**Voice:** calm, confident, minimal. Few words, lots of certainty.

| Rule | Detail |
|---|---|
| Casing | Sentence case everywhere — buttons, labels, headings. Wordmark always lowercase. |
| Mono labels | UPPERCASE, tracked: `02:14` · `142 WPM` · `INVISIBLE TO SCREEN-SHARE` |
| Person | Address the speaker as **you**. Product is invisible — it doesn't say "I/we." |
| Length | Short. 3-word button over 6. Headlines one line where possible. |
| Verbs first | "Start prompting" · "Hide from screen-share" · "Skip ahead" |
| Emoji | None. Ever. Status via indigo dot and mono tags only. |
| Numbers | Tabular mono: `142 wpm`, `02:14`, `1,204 watching` |

**On-brand copy examples**
- Hero: *"Look at the lens. Not your notes."*
- Empty state: *"No scripts yet. Paste one to start."*
- Toggle: *"Hide from screen-share"* · *"Mirror text"* · *"Auto-scroll"*
- Reassurance: *"Overlay hidden — invisible on the recording."*

**Off-brand:** emoji, title-case buttons, "leverage", walls of body copy, "Supercharge your presentations!!!"

---

## Visual foundations

**Direction: "Signal"** — near-black command deck with electric-indigo glow.

### Color tokens

| Role | Token | Value |
|---|---|---|
| Canvas | `--bg-base` | `#0a0a0f` |
| Panel | `--surface-1` | `#13131c` |
| Card | `--surface-2` | `#1a1a26` |
| Raised | `--surface-3` | `#232331` |
| **Accent** | `--accent` | `#6e56f7` — electric indigo |
| Accent hover | `--accent-hover` | `#8a76ff` |
| Accent text | `--accent-text` | `#b6a8ff` |
| Text primary | `--text-primary` | `#f2f2f7` |
| Text secondary | `--text-secondary` | `#a8a8ba` |
| Text tertiary | `--text-tertiary` | `#7a7a8f` |
| Record / danger | `--record` | `#ff4d6a` — active recording only |
| Success | `--success` | `#34d399` |
| Warning | `--warning` | `#ffb84d` |
| Glass | `--glass-bg` | `rgba(12,12,20,0.66)` |

Always use **semantic aliases** in code — never raw hex. `--record` red is reserved for on-air state and destructive actions only — never decorative.

### Typography

| Role | Font | Weights |
|---|---|---|
| Display | Space Grotesk | 700 / 600 — headings, marketing, tracking `−0.02em` |
| Body / UI | Hanken Grotesk | 400–700 — default 15px |
| Mono | JetBrains Mono | 400 / 500 — timecodes, tags, eyebrows |
| Prompter | Hanken Grotesk | 500 / 600 — large scale 28–72px |

### The glass overlay (signature)

```css
background: rgba(12, 12, 20, 0.66);
backdrop-filter: blur(18px) saturate(1.25);
border: 1px solid rgba(110, 86, 247, 0.32);
border-radius: 20px;
box-shadow: 0 0 0 1px rgba(110,86,247,0.10),
            0 18px 50px rgba(110,86,247,0.20);
```

The heart of the brand. Always see-through. Opacity is user-adjustable (30–100%). Used for the overlay, floating toolbars, and `Card variant="glass"`.

### Voice-tracking highlight

```css
/* Already spoken */
color: var(--prompt-upcoming); opacity: 0.4;

/* Active word */
color: #ffffff; font-weight: 600;
text-shadow: 0 0 18px rgba(110, 86, 247, 0.7);

/* Upcoming */
color: var(--prompt-spoken); opacity: 0.72;
```

Drive `active` word index from voice-detection API. `ScriptViewer` handles this when you pass `active={wordIndex}`.

### Space, radius, motion

- **Grid:** 4px base — `--space-1` (4px) → `--space-40` (160px)
- **Radii:** controls 8–12px · cards 16px · large panels 20–28px · pills 999px
- **Easing:** `--ease-out cubic-bezier(.22,1,.36,1)` for most; `--ease-spring` for toggle thumbs
- **Duration:** 120ms (fast) · 200ms (default) · 320ms (slow)
- **Glow** (`--glow-accent`): signature treatment on live/interactive elements — not drop shadows
- **No bounces** on content. No infinite decorative loops.

---

## Iconography

**System:** [Lucide](https://lucide.dev) — 2px stroke, rounded, consistent.

**Loading:** CDN UMD (`lucide@latest`). Helper at `assets/lucide-icon.js`:
- `tpdIconSVG(name, size, strokeWidth)` → SVG markup string (safe for `innerHTML`)
- `window.TpdIcon` → React component: `<TpdIcon name="play" size={18}/>`

Icon names are kebab-case: `flip-horizontal-2`, `eye-off`, `chevrons-down`.

| Use | Icon name |
|---|---|
| Transport | `play`, `pause`, `square`, `rotate-ccw`, `chevrons-right` |
| Screen-share | `eye-off` |
| Mirror | `flip-horizontal-2` |
| Timer | `timer`, `hourglass` |
| Capture | `mic`, `video` |
| Script/file | `file-text`, `library` |
| UI | `settings`, `search`, `arrow-left`, `plus`, `heart` |

Do **not** use emoji, unicode glyphs, or hand-rolled SVG illustrations as icons.

---

## Logo system

| File | Use | Container |
|---|---|---|
| `assets/logos/eyeread-mark-unbounded-dark.svg` | **Avatars** — Twitter, GitHub, Discord, Instagram | None — platform clips to circle |
| `assets/logos/eyeread-mark-bounded-dark.svg` | All in-product UI, banners, decks (dark bg) | Squircle + white bg rim |
| `assets/logos/eyeread-mark-bounded-light.svg` | Same, on light surfaces | Squircle + white bg rim, inverted |
|  |
| `assets/logos/eyeread-mark-bounded-dark.svg` | App icons — use bounded mark | Squircle + white bg rim |
| `assets/logos/eyeread-wordmark-dark.svg` | Horizontal lockup, dark backgrounds | Reuses `eyeread-mark-bounded.svg` |
| `assets/logos/eyeread-wordmark-light.svg` | Horizontal lockup, light backgrounds | Reuses `eyeread-mark-bounded-light.svg` |

**Rule:** only the app icon has a baked-in container. For avatars, pass `logo-mark.svg` and let the platform clip it. For everything else, use the bounded variant.

---

## File index

```
eyeread.in/
├── styles.css                    ← consumers link this ONE file
├── tokens/
│   ├── fonts.css
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   ├── effects.css
│   └── base.css
├── assets/
│   ├── logo-mark.svg             ← raw split mark — avatars only
│   ├── logo-wordmark.svg         ← bounded mark + wordmark lockup
│   ├── lucide-icon.js            ← tpdIconSVG / TpdIcon helper
│   ├── logos/                    ← all logo variants (see Logo system above)
│   └── brand/                    ← social + banner SVGs (og-image, twitter, linkedin, etc.)
├── components/
│   ├── forms/                    ← Button, IconButton, Input, Switch, Slider, Segmented
│   ├── display/                  ← Card, Badge, Avatar
│   ├── navigation/               ← Tabs
│   └── prompter/                 ← ScriptViewer
├── guidelines/                   ← DS tab specimen cards
│   ├── brand-logo.card.html
│   ├── brand-glass.card.html
│   ├── colors-surfaces.card.html
│   ├── colors-accent.card.html
│   ├── colors-status.card.html
│   ├── type-display.card.html
│   ├── type-body.card.html
│   ├── type-mono.card.html
│   ├── type-prompter.card.html
│   ├── spacing-scale.card.html
│   └── spacing-radii.card.html
├── ui_kits/
│   ├── overlay/index.html        ← floating glass prompter (interactive)
│   ├── desktop/index.html        ← library + editor + settings (interactive)
│   └── marketing/index.html      ← eyeread.in landing page
├── exploration/
│   └── Brand Package.html        ← social asset download pack
├── SKILL.md                      ← Claude Code agent-skill manifest
└── readme.md                     ← you are here
```

---

## Component usage

### In a prototype / HTML file

```html
<link rel="stylesheet" href="path/to/styles.css"/>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js"
        integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js"
        integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js"
        integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script src="path/to/assets/lucide-icon.js"></script>
<script src="path/to/_ds_bundle.js"></script>

<script type="text/babel" data-presets="react">
  const { Button, Card, ScriptViewer } = window.TelepromptDDesignSystem_019e26;
  const Icon = window.TpdIcon;
</script>
```

### The prompter overlay pattern

```jsx
<div style={{
  background: 'rgba(12,12,20,0.66)',
  backdropFilter: 'blur(18px) saturate(1.25)',
  border: '1px solid rgba(110,86,247,0.32)',
  borderRadius: 20,
  boxShadow: 'var(--glow-accent)',
  padding: '14px 20px',
}}>
  <ScriptViewer text={script} active={wordIndex} size="lg"/>
</div>
```

See `ui_kits/overlay/index.html` for the full interactive reference.

---

## For new contributors

### Rules

- **No CSS-in-JS, no npm packages** inside components. Styling via CSS custom properties only.
- **Named exports required.** Every component: `export function ComponentName(props) {…}` — no default exports.
- **`.d.ts` required.** A `.jsx` without a sibling `.d.ts` is bundled but gets no props contract or adherence rules.
- **CSS injection.** Components inject a `<style data-tpd="name">` tag on first render (once-guard with `_injected` flag).
- **Namespace** `TelepromptDDesignSystem_019e26` is stable — never rename it in component code.

### Adding a component

1. `components/<group>/MyComponent.jsx` — named export, CSS injection.
2. `components/<group>/MyComponent.d.ts` — props interface.
3. `components/<group>/MyComponent.prompt.md` — one-line description + usage example.
4. Add to `<group>.card.html` showcase.
5. Run `check_design_system` to confirm it appears under the namespace.

### Tech stack

| Tool | Version | Purpose |
|---|---|---|
| React | 18.3.1 (pinned) | Component runtime |
| ReactDOM | 18.3.1 (pinned) | Rendering |
| Babel Standalone | 7.29.0 (pinned) | Transpiles JSX in-browser |
| Lucide | latest UMD | Icons |
| Google Fonts CDN | — | Space Grotesk, Hanken Grotesk, JetBrains Mono |

---

## Sources

Net-new brand — no prior codebase or Figma provided. All design decisions were made in this session with the founder.

- **Visual direction "Signal"** chosen from three explored directions.
- **Name "eyeread.in"** chosen after a ~40-name exploration.
- **Typefaces:** genuine Google Fonts — no substitutions.
- **Icons:** Lucide — no substitutions.
- **GitHub org:** `omniship-labs` (confirmed by founder).
- **License:** AGPL-3.0 throughout — not MIT, not a dual-license, not time-limited.
