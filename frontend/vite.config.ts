import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const isDesktop = mode === 'desktop' || process.env.VITE_RUNTIME_MODE === 'desktop'

  return {
    // Desktop PyWebView loads dist/index.html via file:// so relative asset paths are required
    base: isDesktop ? './' : '/',
    define: {
      'import.meta.env.VITE_RUNTIME_MODE': JSON.stringify(isDesktop ? 'desktop' : 'web'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
  }
})
