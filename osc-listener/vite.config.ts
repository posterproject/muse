import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true
  }
}); 