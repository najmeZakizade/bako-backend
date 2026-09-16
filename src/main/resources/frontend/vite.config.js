import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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