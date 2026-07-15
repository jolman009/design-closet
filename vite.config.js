import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// App identity — kept in one place so the manifest, meta tags and TWA config agree.
const APP_NAME = 'Design Closet'
const APP_SHORT = 'Closet'
const THEME_COLOR = '#4e635a'
const BG_COLOR = '#fdf9f5'

export default defineConfig({
  // Relative base keeps the build portable across hosts (Firebase, Netlify, sub-paths).
  base: '/',
  build: {
    target: 'es2020',
    sourcemap: false,
    // Keep the entry readable; let Vite hash the rest for long-term caching.
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    VitePWA({
      // 'prompt' so we can show our own "new version ready" toast (see main.js).
      registerType: 'prompt',
      // We register the SW ourselves via virtual:pwa-register — don't inject a duplicate.
      injectRegister: null,
      // Files copied verbatim from /public that the SW should also treat as assets.
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icons/*.png',
        'offline.html',
      ],
      manifest: {
        id: '/',
        name: APP_NAME,
        short_name: APP_SHORT,
        description:
          'Your personal stylist — Design Closet suggests daily outfits from the clothes you actually own.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: BG_COLOR,
        categories: ['lifestyle', 'shopping', 'productivity'],
        lang: 'en',
        dir: 'ltr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: "Today's Outfit",
            short_name: 'Today',
            url: '/?source=pwa&tab=home',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Add a Piece',
            short_name: 'Add',
            url: '/?source=pwa&action=add',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // App shell + navigation fallback for offline.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Wait for the user to tap "Refresh" (prompt flow) before activating.
        skipWaiting: false,
        runtimeCaching: [
          {
            // Google Fonts stylesheets — cache-first, refreshed in background.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Google Fonts webfont files — long-lived, cache-first.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Wardrobe photos from Supabase Storage — cache-first with a cap.
            urlPattern: /\/storage\/v1\/object\/public\/closet-photos\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'closet-photos',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase REST/data — network-first so we stay fresh but survive offline.
            urlPattern: /\/rest\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Weather — network-first, short cache so it's fresh but offline-tolerant.
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Let us exercise the SW in `vite dev` when needed.
        enabled: false,
        type: 'module',
      },
    }),
  ],
})
