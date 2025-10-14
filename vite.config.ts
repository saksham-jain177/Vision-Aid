import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    hmr: {
      overlay: true, // Show errors in browser overlay
    },
    proxy: {
      // Proxy any request starting with /api to the Flask backend
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  publicDir: 'public', // This ensures the public directory is served correctly
});
