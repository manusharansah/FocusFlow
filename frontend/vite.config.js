import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: serve API + OAuth routes from the SPA origin so the HttpOnly refresh
// cookie behaves exactly as in production (single site behind a reverse proxy).
const backend = process.env.DEV_BACKEND || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  // changeOrigin:false keeps the browser's Host header (localhost:3000), so the OAuth callback URL Django builds
  // is the SPA origin, exactly as in production.
  server: { port: 3000, proxy: { '/api': { target: backend, changeOrigin: false }, '/accounts': { target: backend, changeOrigin: false } } },
  build: { outDir: 'build', sourcemap: false },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
});
