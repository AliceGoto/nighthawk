import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const server = process.env.NIGHTHAWK_SERVER_URL ?? 'http://127.0.0.1:58627';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: server,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
