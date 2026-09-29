import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    // ===== 🎯 PWA Configuration =====
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'bakoLogo.png', 'Far_Homa.ttf'],
      manifest: {
        name: 'بیکو - مدیریت نانوایی',
        short_name: 'بیکو',
        description: 'پلتفرم جامع مدیریت فروش نانوایی',
        theme_color: '#8B4513',
        background_color: '#FFF8F0',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        dir: 'rtl',
        lang: 'fa-IR',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        runtimeCaching: [
          // API درخواست‌ها - NetworkFirst با کش ۵ دقیقه‌ای
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bako-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // تصاویر محصولات - CacheFirst
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bako-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // ۳۰ روز
              },
            },
          },
          // فونت - CacheFirst
          {
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bako-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      // ===== API Backend =====
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/cart': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/checkout': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },

      // ===== فایل‌های آپلود شده =====
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },

      // ===== 🎯 پروکسی Nominatim (برای Reverse Geocoding) =====
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        headers: {
          'Referer': 'http://localhost:5173',
        },
      },
    },
  },
})