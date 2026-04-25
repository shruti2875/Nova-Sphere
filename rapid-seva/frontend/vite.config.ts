import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  server: {
    port: 3000,
    proxy: {
      '/create-case-ai': 'http://localhost:5000',
      '/calculate-score': 'http://localhost:5000',
      '/assistant': 'http://localhost:5000',
      '/notify-doctors': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
});
