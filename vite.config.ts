import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// Displayed in Settings. In Docker, APP_VERSION is set to the image tag (e.g.
// "5.1.0") so the in-app version always matches the deployed image. Falls back
// to the package.json version for local dev.
const appVersion = process.env.APP_VERSION || pkg.version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'MemorizeMate',
        short_name: 'MemorizeMate',
        description: 'Spaced-repetition flashcards, offline-first.',
        theme_color: '#C75B39',
        background_color: '#F7F3EC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true, port: 5174, watch: { usePolling: true } },
  preview: { host: true, port: 4173 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    // Test-only: the PWA virtual module is provided by VitePWA at build time;
    // alias it to a mock here so it resolves under Vitest without affecting prod.
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/__mocks__/pwa-mock.ts', import.meta.url)),
    },
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
    },
  },
});
