import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // semua request /api/* di dev diarahkan ke server express
      '/api': 'http://localhost:8787',
    },
  },
});
