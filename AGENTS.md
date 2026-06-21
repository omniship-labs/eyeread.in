# Agent Instructions

## Stack overview

**eyeread** is a Tauri v2 desktop app — a Rust backend with a React + Vite frontend.

- **Frontend:** React 18, Vite, plain CSS (no Tailwind). Component library lives in `src/components/`. Features (screens) in `src/features/`. Per-window entry points in `src/windows/`.
- **Backend:** Rust via Tauri. Native plugins: `global-shortcut`, `opener`, `sql` (SQLite), `store`.
- **Design system:** `design/` is the single source of truth for tokens, components, and prototypes. `design/styles.css` is imported directly by the app — don't duplicate tokens in `src/`.

## Key file locations

| Path                  | What it is                                                         |
| --------------------- | ------------------------------------------------------------------ |
| `design/styles.css`   | Master CSS token file (colors, spacing, typography, effects)       |
| `design/tokens/`      | Token source files broken out by category                          |
| `design/components/`  | Design-system components (display, forms, navigation, prompter)    |
| `design/exploration/` | Full-page HTML prototypes                                          |
| `src/components/`     | Production component implementations (mirror `design/components/`) |
| `src/features/`       | Screen-level React components                                      |
| `src/windows/`        | Per-window entry points (Main, Overlay, Settings)                  |
| `src/styles/app.css`  | App-level globals; component CSS uses `er-*` class prefix          |
| `src-tauri/`          | Rust/Tauri backend                                                 |

## Dev commands

```bash
npm run dev       # Vite dev server (frontend only)
npm run tauri     # Full Tauri app (frontend + native shell)
npm run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest
```

## What you should do — IMPORTANT

**Find the primary design file under `design/` and read it top to bottom.** Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Design ↔ src divergence

Some `src/components/` files intentionally differ from their `design/components/` counterparts. Treat src as authoritative for production logic; treat design as authoritative for visual spec. Known divergences:

| Component      | Status                    | Notes                                                                                                                                                                     |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScriptViewer` | **src is ahead**          | Design has 3 word states (spoken/upcoming/active). Src has an 8-state bell-curve model plus `activeWordRef` and `onWordClick` — keep the src behaviour.                   |
| `Segmented`    | **src is simplified**     | Design supports `icon`, `block` prop, `sm` size, `tpd-seg` classes. Src uses `er-seg` with a minimal API — missing features should be backfilled from design when needed. |
| `Slider`       | **src is simplified**     | Design has `label`, `formatValue`, `suffix`, `step` props and a labelled wrapper div. Src is a bare `<input type=range er-slider>` — missing wrapper/label features.      |
| `Switch`       | **different DOM pattern** | Design uses `<label>` + hidden `<input type=checkbox>`. Src uses `<button role=switch>` — visually equivalent, but different semantics. Prefer src pattern going forward. |

## Missing components (design exists, src not yet implemented)

These components exist under `design/components/` but have no counterpart in `src/components/` yet:

- **display:** `Avatar`, `Badge`, `Card`
- **forms:** `Button`, `IconButton`, `Input`
- **navigation:** `Tabs`

When implementing any of these, use the design file as the visual spec and follow the `er-*` CSS class prefix convention used in the rest of src.
