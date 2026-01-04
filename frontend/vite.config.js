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
    watch: {
      usePolling: true,
      interval: 250,
    },
  },
})
