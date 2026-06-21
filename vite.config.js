import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
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
  // CI sets RELEASE_CHANNEL=stable or RELEASE_CHANNEL=nightly.
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
});
