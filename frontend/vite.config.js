import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev server ở cổng 5173; /api, /uploads, /socket.io được proxy sang backend 9090
// nên frontend gọi API cùng origin, không lo CORS.
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:9090';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
      '/socket.io': { target: BACKEND, ws: true },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
      '/socket.io': { target: BACKEND, ws: true },
    },
  },
});
