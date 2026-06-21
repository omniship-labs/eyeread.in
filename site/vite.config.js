import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Standalone build for the marketing site (separate from the Tauri app at the
// repo root). Run via `npm run site:dev` / `npm run site:build`.
//
// No vendored assets: tokens and logos are imported straight from `design/` and
// Vite bundles them at build time — single source of truth, zero duplication.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Relative base so the build works on a custom domain root or a project path.
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2021', 'safari15'],
  },
});
