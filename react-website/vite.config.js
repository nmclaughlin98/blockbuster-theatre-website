import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 10'],
      modernTargets: ['iOS >= 10'],
      polyfills: true,
      modernPolyfills: true,
    }),
  ],
  base: '/',
  server: {
    host: '0.0.0.0',
  },
})
