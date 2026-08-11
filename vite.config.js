import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import localApiPlugin from './vite-plugin-local-api.js';

export default defineConfig(({ mode }) => {
  // Vite only auto-exposes VITE_-prefixed vars to the browser; the local
  // API middleware runs server-side in this same process and needs the
  // full .env - HOTELOPS_API_BASE_URL, BOOQA_API_KEY, DATABASE_URL, etc. -
  // in process.env exactly like `vercel dev` provided it.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), localApiPlugin()],
    server: {
      port: 5174,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'react-hot-toast', 'clsx'],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
