import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions/ai-continue': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/api/ai/continue',
      },
      '/.netlify/functions/ai-summarize': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/api/ai/summarize',
      },
      '/.netlify/functions/ai-rephrase': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/api/ai/rephrase',
      },
      '/.netlify/functions/ai-suggest': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/api/ai/suggest',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
  },
})
