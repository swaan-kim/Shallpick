import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['samples/CREDITS.md'],
    manifest: {
      id: './', name: 'Shallpick', short_name: 'Shallpick', lang: 'ko',
      description: '함께 찍고, 함께 고르는 우리들의 사진 공간',
      start_url: './', scope: './', display: 'standalone',
      background_color: '#FAFAFA', theme_color: '#FAFAFA',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      importScripts: ['notification-events.js'],
      globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.(js|css)$/,
      navigateFallback: 'index.html', cleanupOutdatedCaches: true, clientsClaim: true,
      // Only bundled public assets are precached. No auth/API/photo runtime cache.
    },
  })],
})
