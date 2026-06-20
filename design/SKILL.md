---
name: eyeread-design
description: Use this skill to generate well-branded interfaces, components, and assets for eyeread.in — a free, open-source, invisible teleprompter. Contains the complete design system: tokens, fonts, assets, component library, and UI kits for the overlay, desktop app, and marketing site.
user-invocable: true
---

Read `readme.md` in this skill first. It is the authoritative guide. The sections below are a fast-path for Claude Code.

---

## Identity

- **Brand:** eyeread.in (always lowercase, `.in` is part of the brand name, not just a TLD)
- **Wordmark:** `[eye mark] eyeread.in` — ".in" renders in the indigo accent `#6e56f7`
- **Pun:** eye = I → the lockup reads "I read in." Intentional.
- **Domain:** `eyeread.in`
- **License:** AGPL-3.0, open source, donation-supported. No subscription, no paywall.

---

## Design tokens (use these, never raw hex)

```css
/* Load via: */
<link rel="stylesheet" href="styles.css" />

/* Key aliases */
--bg-base:           #0a0a0f    /* app canvas */
--surface-1:         #13131c    /* panels */
--surface-2:         #1a1a26    /* cards */
--surface-3:         #232331    /* raised / hover */
--accent:            #6e56f7    /* electric indigo — primary action + glow */
--accent-hover:      #8a76ff
--accent-text:       #b6a8ff    /* text on dark near accent */
--accent-subtle-bg:  rgba(110,86,247,0.14)
--accent-subtle-border: rgba(110,86,247,0.32)
--glass-bg:          rgba(12,12,20,0.66)
--blur-glass:        blur(18px) saturate(1.25)
--glow-accent:       0 0 0 1px rgba(110,86,247,.1), 0 18px 50px rgba(110,86,247,.2)
--glow-accent-sm:    0 0 12px rgba(110,86,247,.45)
--glow-text:         0 0 18px rgba(110,86,247,.7)   /* on active spoken word */
--glow-record:       0 0 12px rgba(255,77,106,.7)
--text-primary:      #f2f2f7
--text-secondary:    #a8a8ba
--text-tertiary:     #7a7a8f
--record:            #ff4d6a    /* on-air / danger ONLY */
--success:           #34d399
--warning:           #ffb84d
--font-display:      'Space Grotesk'     /* headings */
--font-sans:         'Hanken Grotesk'    /* UI / body */
--font-mono:         'JetBrains Mono'    /* timecodes, labels */
--font-prompt:       'Hanken Grotesk'    /* script reading, large */
--radius-md:         12px
--radius-lg:         16px
--radius-xl:         20px
--ease-out:          cubic-bezier(.22,1,.36,1)
--dur-base:          200ms
```

---

## Components

Load via:
```html
<script src="_ds_bundle.js"></script>
```

Access via:
```js
const { Button, Card, ScriptViewer, ... } = window.TelepromptDDesignSystem_019e26;
```

| Component | Group | Key props |
|---|---|---|
| `Button` | forms | `variant` (primary/secondary/ghost/subtle/danger), `size` (sm/md/lg), `iconLeft`, `iconRight` |
| `IconButton` | forms | `variant` (ghost/solid/accent), `active`, `label` |
| `Input` | forms | `label`, `hint`, `error`, `icon`, `multiline` |
| `Switch` | forms | `label`, `checked`, `onChange` |
| `Slider` | forms | `label`, `min`, `max`, `value`, `formatValue`, `suffix` |
| `Segmented` | forms | `options`, `value`, `onChange`, `block` |
| `Card` | display | `variant` (default/raised/glass/accent), `padding`, `interactive` |
| `Badge` | display | `tone` (neutral/accent/record/success/warning), `dot`, `solid` |
| `Avatar` | display | `name`, `src`, `size`, `accent`, `status` (online/live) |
| `Tabs` | navigation | `items`, `value`, `onChange`, `variant` (line/pill) |
| `ScriptViewer` | prompter | `text`, `active` (word index), `size`, `mirror`, `align` |

---

## Icons

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script src="assets/lucide-icon.js"></script>
```

```js
// Inline SVG string (any context)
const svg = tpdIconSVG('play', 20);

// React component (after React is loaded)
const Icon = window.TpdIcon;
<Icon name="eye-off" size={18} />
```

Common: `play pause square rotate-ccw chevrons-right eye-off flip-horizontal-2 timer hourglass mic video settings search file-text library heart arrow-left plus`

---

## The glass overlay (signature pattern)

The product's hero UI — floating translucent prompter over shared content:

```html
<div style="
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: 1000; width: 520px;
  background: rgba(12,12,20,0.66);
  backdrop-filter: blur(18px) saturate(1.25);
  -webkit-backdrop-filter: blur(18px) saturate(1.25);
  border: 1px solid rgba(110,86,247,0.32);
  border-radius: 20px;
  box-shadow: 0 0 0 1px rgba(110,86,247,0.10), 0 18px 50px rgba(110,86,247,0.20);
">
  <!-- Top row: drag grip + timer + "Invisible" pill -->
  <!-- Script: ScriptViewer with spoken/active/upcoming states -->
  <!-- Footer: restart · play/pause · skip · A- · A+ · mirror · settings -->
</div>
```

Script word states:
```css
.spoken   { color: #7a7a8f; opacity: 0.4; }
.active   { color: #fff; font-weight: 600; text-shadow: 0 0 18px rgba(110,86,247,0.7); }
.upcoming { color: #f2f2f7; opacity: 0.72; }
```

**Critical:** No "Live" badge on the overlay. Timer is the only active-state signal.

---

## UI kits (reference these, don't reinvent)

- `ui_kits/overlay/index.html` — full interactive floating prompter. Self-contained React + Babel.
- `ui_kits/desktop/index.html` — library + editor + settings (macOS chrome, three-pane layout).
- `ui_kits/marketing/index.html` — eyeread.in landing page. Hero, features, OSS CTA.

---

## Copy rules

- Sentence case everywhere. Mono status labels UPPERCASE.
- No emoji. No exclamation marks. No "supercharge."
- Short verbs: "Start reading" · "Hide from screen-share" · "Skip ahead"
- Open source narrative: transparent, trustworthy. "Open source." not "Start for free today!"

---

## If invoked without context

Ask the user:
1. What surface are you building? (overlay / desktop / marketing / something new)
2. Prototype (HTML) or production code?
3. Any specific screens or components?

Then act as a senior product designer who knows this brand cold. Output HTML prototypes for explorations, or production-ready React components following the rules above.
