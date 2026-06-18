# eyeread.in — Design System

> **Brand:** eyeread.in · `eyeread.in` · MIT open source, donation-supported.
> **Status:** Active. All foundations, components, and UI kits are built and ready.

---

## Onboarding — start here

Welcome to the eyeread.in design system. Here is the fast path if you are joining the project:

1. **Read this file** end to end (~5 min).
2. Open the **Design System tab** (the tab bar above the file tree) — it shows every specimen card live. This is the primary visual reference.
3. To use components in a prototype or page, link `styles.css` and load `_ds_bundle.js`, then access components via `window.TelepromptDDesignSystem_019e26.<Name>`. The namespace is a stable internal code token — it will not change when the brand name changes.
4. Ask questions in the GitHub repo: `github.com/eyeread/eyeread` (MIT).

### What eyeread.in does

A teleprompter that works on **any device** by floating your script as a translucent glass overlay on top of whatever you're sharing — slides, a Zoom call, a recording — and **stays invisible to screen-share and screen capture**. Voice tracking listens as you speak, highlights the exact word you're on, and queues what's next, so the speaker's eyes stay on the camera instead of darting to notes.

**Taglines:** *"Free, forever, open source."* · *"Look at the lens. Not your notes."*

**Business model:** MIT open source. No subscription, no freemium gate. Users who find value can donate voluntarily — that's it. The full app is functional for everyone.

### The name

**eyeread.in** — the `.in` is part of the brand name, not just the domain. Always lowercase. The wordmark is `[eye mark] eyeread.in` with `.in` in the indigo accent color. There is a built-in pun: **eye = I**, so the full lockup reads *"I read in"* — the mark says the first word and the type says the rest. This is intentional; document it, don't hide it.

### Core design principles

- **See-through, always.** The overlay is glass. You can read underlying content through it. It never becomes a solid panel.
- **Near the camera.** The prompter anchors top-center, just under the webcam, so the speaker's eyeline looks natural on camera.
- **Invisible to the audience.** Nothing the prompter draws appears in a shared or recorded frame. The UI says so, clearly.
- **Voice-led.** The highlight follows speech, not a timer. Timer (count-up or countdown) is additive.
- **No "Live" badge.** The timer alone signals active state. We removed the pulsing "Live" dot — less noise, more confidence.

---

## Content fundamentals

**Voice:** calm, confident, minimal. Few words, lots of certainty.

| Rule | Detail |
|---|---|
| Casing | Sentence case everywhere — buttons, labels, headings. Wordmark is always lowercase. |
| Mono labels | UPPERCASE, spaced: `02:14`, `142 WPM`, `INVISIBLE TO SCREEN-SHARE` |
| Person | Address the speaker as **you**. The product is invisible — it doesn't say "I/we." |
| Length | Short. Prefer a 3-word button label over 6. Headlines are one line where possible. |
| Verbs first | "Start prompting" · "Hide from screen-share" · "Skip ahead" |
| Emoji | None — ever. Status is communicated by the indigo dot and mono tags. |
| Numbers | Tabular mono: `142 wpm`, `02:14`, `1,204 watching` |

**On-brand examples**
- Hero: *"Your script, on the glass. Invisible on the recording."*
- Empty state: *"No scripts yet. Paste one to start."*
- Toggle labels: *"Hide from screen-share"* · *"Mirror text"* · *"Auto-scroll"*
- Reassurance: *"Overlay hidden — invisible on the recording."*

**Off-brand:** "🎬 Let's gooo!", "Supercharge your presentations!!!", title-case buttons, walls of body copy, the word "leverage."

---

## Visual foundations

**Direction: "Signal"** — near-black command-deck with an electric-indigo glow. Chosen by the founder from three explored directions (see `exploration/Foundations Directions.html`).

### Color

| Role | Token | Value |
|---|---|---|
| Canvas | `--bg-base` | `#0a0a0f` |
| Panel | `--surface-1` | `#13131c` |
| Card | `--surface-2` | `#1a1a26` |
| Raised | `--surface-3` | `#232331` |
| Accent (primary) | `--accent` | `#6e56f7` electric indigo |
| Accent hover | `--accent-hover` | `#8a76ff` |
| Accent text | `--accent-text` | `#b6a8ff` |
| Text primary | `--text-primary` | `#f2f2f7` |
| Text secondary | `--text-secondary` | `#a8a8ba` |
| Text tertiary | `--text-tertiary` | `#7a7a8f` |
| Record / danger | `--record` | `#ff4d6a` |
| Success | `--success` | `#34d399` |
| Warning | `--warning` | `#ffb84d` |
| Glass surface | `--glass-bg` | `rgba(12,12,20,0.66)` |

Always use **semantic aliases** (`--accent`, `--surface-2`, `--text-secondary`) in component code, never raw hex values. The `record` red is reserved for on-air state and destructive actions only — never decorative.

### Type

| Role | Font | Weights | Notes |
|---|---|---|---|
| Display | Space Grotesk | 700 / 600 | Headings, marketing. Tracking `−0.02em`. |
| Body / UI | Hanken Grotesk | 400–800 | Default 15px. Readable, humane. |
| Mono | JetBrains Mono | 400 / 500 | Timecodes, tags, eyebrows. |
| Prompter reading | Hanken Grotesk | 500 / 600 | Large scale 28–72px. Spoken dims, active glows. |

All three fonts are loaded via Google Fonts CDN. For self-hosted / offline builds, drop `.woff2` files in `assets/fonts/` and replace the CDN `@import` in `tokens/fonts.css` with `@font-face` rules.

### The glass overlay material (signature)

```css
background: rgba(12, 12, 20, 0.66);
backdrop-filter: blur(18px) saturate(1.25);
-webkit-backdrop-filter: blur(18px) saturate(1.25);
border: 1px solid rgba(110, 86, 247, 0.32);
border-radius: 20px;
box-shadow: 0 0 0 1px rgba(110,86,247,0.10), 0 18px 50px rgba(110,86,247,0.20);
```

This is the heart of the brand. The user can always see content through it. Opacity is user-adjustable (30–100%). Used for the overlay, floating toolbars, and `Card variant="glass"`.

### Voice-tracking script highlight

```css
/* Spoken (already said) */
color: var(--prompt-upcoming);   /* #7a7a8f */
opacity: 0.4;

/* Active word (where voice is now) */
color: #ffffff;
font-weight: 600;
text-shadow: 0 0 18px rgba(110, 86, 247, 0.7);  /* --glow-text */

/* Upcoming (not yet reached) */
color: var(--prompt-spoken);     /* #f2f2f7 */
opacity: 0.72;
```

Drive the `active` word index from the voice-detection API. The ScriptViewer component handles this automatically when you pass `active={wordIndex}`.

### Space & radius

- **Grid:** 4px base. Tokens `--space-1` (4px) through `--space-40` (160px).
- **Radii:** controls 8–12px, cards 16px, large panels 20–28px, pills 999px.

### Shadows & glow

Use depth shadows (`--shadow-md/lg/xl`) for elevation. Use **glow** (`--glow-accent`) as the signature treatment on live/interactive elements — not drop shadows. The glow is subtle: a faint indigo ring + diffuse bloom.

### Motion

- **Easing:** `--ease-out cubic-bezier(.22,1,.36,1)` for most transitions; `--ease-spring` for toggle thumbs.
- **Duration:** 120ms (fast), 200ms (default), 320ms (slow).
- **Pulses** (live/rec dot): ~1.7s scale+opacity loop. All animations respect `prefers-reduced-motion`.
- **No bounces** on slide/content elements. No infinite decorative loops.

### Backgrounds & imagery

- Default: flat near-black. No gradients, textures, or patterns on app surfaces.
- Marketing/hero moments: large soft **radial indigo glows** bleeding from a corner — never the purple-to-pink AI cliché.
- Photography (when used): cool-toned, low-key, slightly desaturated.

---

## Iconography

**System:** [Lucide](https://lucide.dev) — 2px stroke, rounded, consistent. Chosen for this brand; not a substitution.

**Loading:** CDN UMD (`lucide@latest`). The helper at `assets/lucide-icon.js` exposes:
- `tpdIconSVG(name, size, strokeWidth)` → SVG markup string (safe for `innerHTML`)
- `window.TpdIcon` → React component: `<TpdIcon name="play" size={18}/>`

Icon names are **kebab-case**: `flip-horizontal-2`, `eye-off`, `chevrons-down`.

**Common icons in this product:**

| Use | Icon name |
|---|---|
| Transport | `play`, `pause`, `square`, `rotate-ccw`, `chevrons-right` |
| Screen-share | `eye-off` |
| Mirror | `flip-horizontal-2` |
| Timer | `timer` (count-up), `hourglass` (countdown) |
| Capture | `mic`, `video` |
| Script/file | `file-text`, `library` |
| UI | `settings`, `search`, `arrow-left`, `plus`, `heart` |

Do **not** use emoji, unicode glyphs, or hand-rolled SVG illustrations as icons.

---

## File index

```
eyeread.in/
├── styles.css                    ← consumers link this ONE file
├── tokens/
│   ├── fonts.css                 ← Google Fonts import + font custom properties
│   ├── colors.css                ← full color ramp + semantic aliases
│   ├── typography.css            ← type scale, weights, leading, tracking
│   ├── spacing.css               ← 4px grid, container widths, overlay sizing
│   ├── effects.css               ← radii, shadows, glow, blur, motion tokens
│   └── base.css                  ← body reset, ::selection, scrollbars
├── assets/
│   ├── logo-mark.svg             ← glass eye mark (64px square)
│   ├── logo-wordmark.svg         ← eye mark + "eyeread.in" wordmark
│   └── lucide-icon.js            ← icon serializer helper (tpdIconSVG / TpdIcon)
├── components/
│   ├── forms/
│   │   ├── Button.jsx/.d.ts/.prompt.md
│   │   ├── IconButton.jsx/.d.ts/.prompt.md
│   │   ├── Input.jsx/.d.ts/.prompt.md
│   │   ├── Switch.jsx/.d.ts/.prompt.md
│   │   ├── Slider.jsx/.d.ts/.prompt.md
│   │   ├── Segmented.jsx/.d.ts/.prompt.md
│   │   └── forms.card.html        ← DS tab showcase
│   ├── display/
│   │   ├── Card.jsx/.d.ts/.prompt.md
│   │   ├── Badge.jsx/.d.ts/.prompt.md
│   │   ├── Avatar.jsx/.d.ts/.prompt.md
│   │   └── display.card.html
│   ├── navigation/
│   │   ├── Tabs.jsx/.d.ts/.prompt.md
│   │   └── navigation.card.html
│   └── prompter/
│       ├── ScriptViewer.jsx/.d.ts/.prompt.md    ← the highlighted reader
│       └── prompter.card.html
├── guidelines/                   ← DS tab specimen cards (foundations)
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
├── exploration/                  ← throwaway direction studies (not shipped)
│   ├── Foundations Directions.html
│   └── Name Options v2–v4.html
├── SKILL.md                      ← Claude Code agent-skill manifest
└── readme.md                     ← you are here
```

---

## Using components

### In a prototype / HTML file

```html
<link rel="stylesheet" href="path/to/styles.css" />
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
  // ...
</script>
```

### The prompter overlay pattern

```jsx
// Minimal overlay shell — copy from ui_kits/overlay/index.html for the full kit
<div style={{
  background: 'rgba(12,12,20,0.66)',
  backdropFilter: 'blur(18px) saturate(1.25)',
  border: '1px solid rgba(110,86,247,0.32)',
  borderRadius: 20,
  boxShadow: 'var(--glow-accent)',
  padding: '14px 20px',
}}>
  {/* Top row: timer left, "Invisible" pill right */}
  <ScriptViewer text={script} active={wordIndex} size="lg" />
  {/* Bottom: restart · play/pause · skip · A- · A+ · mirror · settings */}
</div>
```

---

## For new contributors

### Things to know before writing code

- **No CSS-in-JS, no npm packages** inside components. Styling via CSS custom properties only — the compiler needs tree-shakeable `.jsx` files with named exports.
- **Named exports required.** Every component must be `export function ComponentName(props) {…}` — no default exports. The bundler picks them up by the `export` keyword.
- **`.d.ts` required.** A `.jsx` without a sibling `.d.ts` is bundled but gets no props contract, adherence rules, or starting-point eligibility.
- **Self-contained CSS injection.** Components inject a `<style data-tpd="name">` tag into `<head>` on first render (once-guard with `_injected` flag). No external stylesheets needed.
- **The namespace** `TelepromptDDesignSystem_019e26` is a stable compiler output from the project ID — it will not change. Do not rename it in component code.

### Adding a new component

1. Create `components/<group>/MyComponent.jsx` — named export, self-contained CSS injection.
2. Create `components/<group>/MyComponent.d.ts` — props interface.
3. Create `components/<group>/MyComponent.prompt.md` — one-line description + usage example.
4. Add it to the group's `<group>.card.html` showcase (or create one if it's a new group).
5. Run `check_design_system` (Claude tool) or rebuild the bundle to confirm it appears under the namespace.

### Tech stack summary

| Tool | Version | Purpose |
|---|---|---|
| React | 18.3.1 (pinned) | Component runtime |
| ReactDOM | 18.3.1 (pinned) | Rendering |
| Babel Standalone | 7.29.0 (pinned) | Transpiles JSX in-browser |
| Lucide | latest UMD | Icons |
| Google Fonts | CDN | Space Grotesk, Hanken Grotesk, JetBrains Mono |

---

## Sources

Net-new brand — no prior codebase or Figma. Founder made all design decisions in this design system session. The visual direction "Signal" was chosen from three explored directions on `exploration/Foundations Directions.html`. The name "eyeread.in" was chosen after ~40-name exploration (see `exploration/Name Options v4.html`). Typefaces are genuine Google Fonts; no substitutions were made. Icons are Lucide; no substitutions were made.
