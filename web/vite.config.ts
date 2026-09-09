import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Basketball Auction Draft',
        short_name: 'Auction Draft',
        description: 'Δημοπρασία μπασκετμπολιστών για δύο παίκτες.',
        lang: 'el',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f1115',
        theme_color: '#e07b39',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@bad/engine': fileURLToPath(new URL('../packages/engine/src/index.ts', import.meta.url)),
    },
  },
  server: {
    host: true,
    fs: { allow: ['..'] },
  },
});
