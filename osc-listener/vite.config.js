import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}); 