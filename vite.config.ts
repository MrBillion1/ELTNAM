import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    // Note: Add @vitejs/plugin-basic-ssl for HTTPS when deploying (required by Privy in production).
    // The Vite API proxy for /api/* routes is handled via a lightweight Express server
    // (see server.mjs) which is started separately in production / CI.
    // In dev, AgentSidebar gracefully falls back to the on-device keyword response.
  },
});
