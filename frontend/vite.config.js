import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/inventory': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/finance': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
});
