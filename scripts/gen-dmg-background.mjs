#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

// beforeBuildCommand runs for every target in the build matrix, but only the
// macOS dmg bundler ever reads this background image — skip it elsewhere.
if (process.platform !== 'darwin') {
  console.log('[gen-dmg-background] skipping — not a macOS build');
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const { version } = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const FONT_FILES = [
  path.join(repoRoot, 'scripts/fonts/SpaceGrotesk-Bold.ttf'),
  path.join(repoRoot, 'scripts/fonts/SpaceGrotesk-Medium.ttf'),
  path.join(repoRoot, 'scripts/fonts/JetBrainsMono-Regular.ttf'),
];

// windowSize in tauri.conf.json's dmg config sets the OUTER Finder window
// frame, title bar included — measured directly from a real build's
// screenshot, the visible content viewport is ~37pt shorter than that
// (title-bar overhead), a roughly fixed amount independent of H. Content
// was previously positioned at "H - constant", which grows exactly as
// fast as the visible boundary itself grows with H — so bumping H alone
// never added any real margin. BOTTOM_ROW_Y is a fixed value instead
// (not H-relative) so increasing H actually adds clearance below it.
// Must match src-tauri/tauri.conf.json's dmg.windowSize.
const W = 660;
const H = 450;
const BOTTOM_ROW_Y = 360;
const SPLIT_X = 300;
const DIVIDER_X = 298;
const DIVIDER_W = 4;

const CHANNELS = {
  stable: {
    out: 'design/assets/dmg/dmg-background.tiff',
    leftColor: '#6e56f7',
    rightColor: '#0e0e1a',
    tag: `v${version} · AGPL-3.0`,
    tagline: 'Look at the lens. Not your notes.',
  },
  glimpse: {
    out: 'design/assets/dmg/dmg-background-glimpse.tiff',
    leftColor: '#c79428',
    rightColor: '#150f08',
    // version already carries "-glimpse.<date>" once CI's stamp step runs
    tag: `v${version} · AGPL-3.0`,
    tagline: 'Look at the lens. Not your notes.',
  },
};

// Icon positions, mirrored from src-tauri/tauri.conf.json's dmg config —
// used here only to place the halo/arrow, not read from it at build time.
const APP_ICON_X = 180;
const APPLICATIONS_ICON_X = 480;
const ICON_Y = 170;

// User-supplied arrow glyph — a swirl-tailed, flared-head arrow drawn as
// two filled paths in their own local space (roughly 0..140 wide, 0..44
// tall, natural center around (70,22)). Reused as a single shape, repeated
// with vertical offsets between the two icons.
const ARROW_GLYPH_PATHS = [
  'M81.8785 26.8626C81.2707 26.7539 80.6641 26.5365 80.0586 26.319C76.7902 25.3405 72.9783 24.2531 70.1642 22.2962C66.4741 19.6869 65.0478 16.7516 65.0794 13.8162C65.1274 9.68481 68.4099 5.44515 72.9081 2.83586C77.3652 0.226571 82.9465 -0.861056 87.4423 0.769749C90.5234 1.85695 93.1525 4.2488 94.5859 8.38017C96.2394 13.0551 94.8868 17.5127 91.972 21.4266C90.8782 22.9487 89.5619 24.2531 88.1122 25.5578C90.0198 25.8839 91.9462 26.2105 93.8996 26.5367C100.295 27.4064 107.017 27.6241 113.464 27.2979C121.991 26.9718 130.149 25.3403 138.031 22.2962C138.759 22.0787 139.593 22.4051 139.893 23.0574C140.191 23.7097 139.844 24.4704 139.116 24.7965C130.924 27.9494 122.446 29.6898 113.583 30.0159C106.949 30.2334 100.033 30.1238 93.4511 29.1453C90.7248 28.7104 88.0489 28.2758 85.4034 27.7322C81.9323 30.2327 78.076 32.1899 74.797 33.3858C52.8615 40.9963 23.3234 31.1031 3.44675 21.3183C2.75113 20.9921 2.48645 20.2305 2.85417 19.5781C3.22306 18.9258 4.08614 18.7084 4.78176 19.0345C24.0202 28.4932 52.5594 38.2785 73.7899 30.8855C76.2866 30.0157 79.1522 28.6021 81.8785 26.8626ZM84.7172 24.7965C83.4641 24.5791 82.2193 24.2535 80.9779 23.8187C77.9823 22.8402 74.4621 21.9706 71.8845 20.2311C69.0985 18.2741 67.9075 16.0989 67.931 13.9245C67.9696 10.4454 70.7919 7.18425 74.4304 5.11856C78.1088 2.94415 82.6924 1.85674 86.4035 3.2701C88.7925 4.13987 90.7635 5.98854 91.8748 9.14142C93.2368 13.0554 92.0282 16.7512 89.6263 19.9041C88.2902 21.7523 86.5874 23.3831 84.7172 24.7965Z',
  'M3.22995 20.0154C3.64334 20.559 4.26168 21.1026 4.88118 21.6462C6.07216 22.7334 7.33458 23.7121 7.99975 24.5819C12.0962 29.8005 16.9386 36.106 19.0864 42.3031C19.3288 42.9554 18.9177 43.7164 18.1682 43.9339C17.4199 44.1513 16.6154 43.8254 16.3729 43.0643C14.3119 37.1934 9.62167 31.2132 5.69037 26.1033C4.97132 25.2336 3.44893 24.0383 2.22867 22.9511C1.19343 21.9726 0.367824 20.9939 0.068028 20.0154C-0.142766 19.4718 0.091445 18.4933 1.41008 17.841C3.27912 16.9712 8.46934 16.2096 8.97173 16.1008C14.0612 15.0136 18.5394 13.9267 21.7529 9.79528C22.2154 9.25168 23.109 9.14317 23.7449 9.46933C24.3808 9.90421 24.5213 10.7742 24.0576 11.3178C20.3944 15.9928 15.3787 17.5146 9.57717 18.7106C9.20711 18.7106 6.10493 19.1454 3.94897 19.7978C3.71593 19.9065 3.45948 19.9067 3.22995 20.0154Z',
];

// The glyph's actual arrowhead tip sits at local x≈0 (tight cluster of
// points there), with its decorative loop close behind it (around local
// x≈65-95) and the tail trailing out to local x≈140 — the opposite of what
// it looks like at a glance, and the loop is close enough to the tip that
// scaling the glyph up to span the full icon-to-icon distance drags the
// loop back onto the app icon's face. Mirrored horizontally (negative
// x-scale) so the tip points right into Applications, and scaled to fit
// the whole glyph — loop included — inside the gap between the two icon
// halos (half-width 85 each, local to the group's already-centered
// origin), with a small margin so it doesn't touch either one.
const HALO_HALF = 85;
const GAP_LEFT = HALO_HALF;
const GAP_RIGHT = APPLICATIONS_ICON_X - APP_ICON_X - HALO_HALF; // 215
const GLYPH_WIDTH = 140;
const ARROW_MARGIN = 10;
const ARROW_SCALE = (GAP_RIGHT - GAP_LEFT - ARROW_MARGIN) / GLYPH_WIDTH;
const ARROW_TRANSLATE_X = GAP_RIGHT - ARROW_MARGIN / 2; // local x=0 (the tip) lands here

function arrowGlyph(centerY, opacity) {
  const ty = centerY - 22 * ARROW_SCALE;
  return `
    <g transform="translate(${APP_ICON_X},${ICON_Y}) translate(${ARROW_TRANSLATE_X},${ty}) scale(${-ARROW_SCALE},${ARROW_SCALE})" opacity="${opacity ?? 0.9}" fill="#ffffff">
      <path fill-rule="evenodd" clip-rule="evenodd" d="${ARROW_GLYPH_PATHS[0]}"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="${ARROW_GLYPH_PATHS[1]}"/>
    </g>`;
}

function glassSlab(cx) {
  const x = cx - 85;
  const y = ICON_Y - 72;
  return `
  <g filter="url(#slabShadow)">
    <rect x="${x}" y="${y}" width="170" height="172" rx="24" fill="url(#slabFill)"/>
    <!-- Prismatic edge: a rainbow-tinted stroke standing in for the chromatic
         fringing thick glass/acrylic shows along its beveled edge. -->
    <rect x="${x + 0.75}" y="${y + 0.75}" width="168.5" height="170.5" rx="23.25" fill="none" stroke="url(#slabEdge)" stroke-width="2.25"/>
    <!-- Diagonal glossy highlight sweeping across the slab's face. -->
    <path d="M ${x + 18} ${y + 152} L ${x + 70} ${y + 8}" stroke="rgba(255,255,255,0.5)" stroke-width="14" stroke-linecap="round" opacity="0.35"/>
    <path d="M ${x + 24} ${y + 1.2} H ${x + 146}" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

function svgFor({ leftColor, rightColor, tag, tagline }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="slabFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.08)"/>
    </linearGradient>
    <linearGradient id="slabEdge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,190,225,0.85)"/>
      <stop offset="35%" stop-color="rgba(190,225,255,0.85)"/>
      <stop offset="65%" stop-color="rgba(215,255,220,0.85)"/>
      <stop offset="100%" stop-color="rgba(255,235,180,0.85)"/>
    </linearGradient>
    <filter id="slabShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${leftColor}"/>
  <rect x="${SPLIT_X}" width="${W - SPLIT_X}" height="${H}" fill="${rightColor}"/>
  <rect x="${DIVIDER_X}" width="${DIVIDER_W}" height="${H}" fill="#ffffff"/>
  <text x="32" y="41" font-family="Space Grotesk" font-weight="700" font-size="17" fill="#ffffff">eyeread<tspan fill="${rightColor}">.in</tspan></text>
  <text x="${W - 32}" y="38" text-anchor="end" font-family="JetBrains Mono" font-size="10" letter-spacing="1.6" fill="#54546e">${tag.toUpperCase()}</text>
  <text x="32" y="${BOTTOM_ROW_Y}" font-family="Space Grotesk Medium" font-size="13" fill="#7a7a92">${tagline}</text>
  <!-- OmniShip credit: exact lockup from the "DMG Background - Options.html"
       design doc (options 1a/1b/1d) — beacon-mark icon + two-line mono
       byline, "IBM Plex Mono" swapped for JetBrains Mono (already embedded
       here for the version tag) to avoid a second font dependency. -->
  <g transform="translate(${W - 32 - 177}, ${BOTTOM_ROW_Y - 8})">
    <g transform="scale(0.2)">
      <rect x="5" y="5" width="90" height="90" rx="24" fill="#F24E1E"/>
      <path d="M19,63 L81,63 L72,73 Q50,79 28,73 Z" fill="#FFFFFF" stroke-linejoin="round"/>
      <path d="M53,26 L53,61 L81,61 Z" fill="#FFFFFF"/>
      <path d="M47,35 L47,61 L25,61 Z" fill="#0E1726"/>
    </g>
    <text x="29" y="8" font-family="JetBrains Mono" font-size="10.5" fill="#8a93a3">An OmniShip Labs project</text>
    <text x="29" y="21" font-family="JetBrains Mono" font-size="10.5" fill="#f24e1e">OPEN MEETS NEW IDEAS</text>
  </g>

  <!-- Finder always renders icon labels in black, regardless of how dark
       the background is — a glass-slab halo keeps both labels readable. -->
  ${glassSlab(APP_ICON_X)}
  ${glassSlab(APPLICATIONS_ICON_X)}

  <!-- Drag-here arrow, app icon to Applications shortcut. -->
  ${arrowGlyph(0)}
</svg>`.trim();
}

function renderPng(channel, scale) {
  const resvg = new Resvg(svgFor(channel), {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Space Grotesk' },
    background: channel.leftColor,
    fitTo: { mode: 'width', value: W * scale },
  });
  return resvg.render().asPng();
}

for (const channel of Object.values(CHANNELS)) {
  const outPath = path.join(repoRoot, channel.out);
  // design/assets/dmg/*.tiff is gitignored (generated output) and the
  // directory itself isn't tracked, so a fresh CI checkout never has it.
  mkdirSync(path.dirname(outPath), { recursive: true });

  const png1x = path.join(path.dirname(outPath), `${path.basename(outPath, '.tiff')}@1x.png`);
  const png2x = path.join(path.dirname(outPath), `${path.basename(outPath, '.tiff')}@2x.png`);
  writeFileSync(png1x, renderPng(channel, 1));
  writeFileSync(png2x, renderPng(channel, 2));

  // Finder's "background picture" reads a multi-resolution TIFF the same
  // way AppKit reads any HiDPI asset: the 1x representation covers non-
  // Retina displays, the 2x covers Retina, each pixel-perfect at its scale.
  execFileSync('tiffutil', ['-cathidpicheck', png1x, png2x, '-out', outPath]);
  rmSync(png1x);
  rmSync(png2x);
  console.log(`wrote ${channel.out}`);
}
