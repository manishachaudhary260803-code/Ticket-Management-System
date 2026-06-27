import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isTest = mode === 'test'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: isTest ? 5174 : 5173,
      proxy: {
        '/api/auth': {
          target: isTest ? 'http://localhost:3011' : 'http://localhost:3001',
          changeOrigin: true,
        },
        '/api': {
          target: isTest ? 'http://localhost:3010' : 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
