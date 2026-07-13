import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// Tauri expects a fixed dev port.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  // Bake the release channel into the bundle at build time.
  // CI sets RELEASE_CHANNEL=stable or RELEASE_CHANNEL=glimpse.
  // Local dev gets 'dev'.
  define: {
    __RELEASE_CHANNEL__: JSON.stringify(process.env.RELEASE_CHANNEL || 'dev'),
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    // WKWebView on macOS / WebView2 on Windows
    target: ['es2021', 'safari15'],
    outDir: 'dist',
  },
  // Vitest (unit tests). Playwright specs in site/tests/ share the *.spec.js
  // extension but must not run under Vitest — exclude that dir. Also exclude
  // .claude/ entirely: git worktrees created there (see `git worktree list`)
  // are full separate checkouts with their own site/tests/, and configDefaults
  // doesn't already ignore that path since it's not node_modules-like.
  test: {
    exclude: [...configDefaults.exclude, 'site/tests/**', '.claude/**'],
  },
});
