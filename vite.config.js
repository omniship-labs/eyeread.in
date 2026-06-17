import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  },
  build: {
    // WKWebView on macOS / WebView2 on Windows
    target: ['es2021', 'safari15'],
    outDir: 'dist',
  },
});
