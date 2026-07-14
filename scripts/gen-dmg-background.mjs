#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const W = 660;
const H = 400;
const SPLIT_X = 300;
const DIVIDER_X = 298;
const DIVIDER_W = 4;

const CHANNELS = {
  stable: {
    out: 'design/assets/dmg/dmg-background.png',
    leftColor: '#6e56f7',
    rightColor: '#0e0e1a',
    tag: `v${version} · AGPL-3.0`,
    tagline: 'Look at the lens. Not your notes.',
  },
  glimpse: {
    out: 'design/assets/dmg/dmg-background-glimpse.png',
    leftColor: '#c79428',
    rightColor: '#150f08',
    // version already carries "-glimpse.<date>" once CI's stamp step runs
    tag: `v${version} · AGPL-3.0`,
    tagline: 'Look at the lens. Not your notes.',
  },
};

function svgFor({ leftColor, rightColor, tag, tagline }) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${leftColor}"/>
  <rect x="${SPLIT_X}" width="${W - SPLIT_X}" height="${H}" fill="${rightColor}"/>
  <rect x="${DIVIDER_X}" width="${DIVIDER_W}" height="${H}" fill="#ffffff"/>
  <text x="32" y="41" font-family="Space Grotesk" font-weight="700" font-size="17" fill="#ffffff">eyeread<tspan fill="${rightColor}">.in</tspan></text>
  <text x="${W - 32}" y="38" text-anchor="end" font-family="JetBrains Mono" font-size="10" letter-spacing="1.6" fill="#54546e">${tag.toUpperCase()}</text>
  <text x="32" y="${H - 30}" font-family="Space Grotesk Medium" font-size="13" fill="#7a7a92">${tagline}</text>
</svg>`.trim();
}

for (const channel of Object.values(CHANNELS)) {
  const resvg = new Resvg(svgFor(channel), {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Space Grotesk' },
    background: channel.leftColor,
    fitTo: { mode: 'width', value: W },
  });
  const png = resvg.render().asPng();
  const outPath = path.join(repoRoot, channel.out);
  // design/assets/dmg/*.png is gitignored (generated output) and the
  // directory itself isn't tracked, so a fresh CI checkout never has it.
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`wrote ${channel.out} (${png.length} bytes)`);
}
