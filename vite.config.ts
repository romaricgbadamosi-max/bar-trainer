import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/bar-trainer/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Bar Trainer',
        short_name: 'Bar Trainer',
        description: 'Recettes de cocktails à apprendre par cœur',
        lang: 'fr',
        display: 'standalone',
        start_url: '/bar-trainer/',
        scope: '/bar-trainer/',
        background_color: '#f6f5f2',
        theme_color: '#1f1e1c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,json}'] },
    }),
  ],
  test: { environment: 'node' },
});
