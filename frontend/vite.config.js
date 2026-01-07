import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /**
   * When running Vite inside Docker on Windows, filesystem events from bind mounts
   * can be dropped. Polling makes HMR/rebuilds reliable (slightly higher CPU).
   */
  server: {
    // Cloudflare Tunnel / remote dev access:
    // Vite blocks unknown Host headers by default; allow your tunnel domain here.
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'photo.crijman.com',
      'dev.crijman.com',
      'dev.photo.crijman.com',
    ],
    /**
     * Proxy API calls through Vite so the browser always talks to the same origin
     * (works locally and via Cloudflare Tunnel). Backend stays private.
     */
    proxy: {
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
    watch: {
      usePolling: true,
      interval: 250,
    },
  },
})
