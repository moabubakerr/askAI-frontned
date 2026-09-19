import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Where the dev server forwards /api. Development only — this never reaches the
 * bundle. In the container, nginx does the same job with the same variable name.
 */
const API_UPSTREAM = process.env.API_UPSTREAM ?? 'http://localhost:18000';

/** Asserted server-side in both places, so the browser can never forge it. */
const CALLER_ID = process.env.CALLER_ID ?? 'askai-web';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin in development too: the client only ever calls /api/…, so the
    // browser makes no cross-origin request and CORS never arises.
    proxy: {
      '/api': {
        target: API_UPSTREAM,
        changeOrigin: true,
        // The service's routes are at its root (/chat, /health); the app calls
        // them under /api. nginx strips the prefix the same way in production.
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-Caller-Id', CALLER_ID);
          });
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // The suite always runs on the fixtures, whatever a local .env says. That
    // is what makes it deterministic and offline.
    env: { VITE_USE_FIXTURES: 'true' },
  },
});
