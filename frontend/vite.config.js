import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: serve API + OAuth routes from the SPA origin so the HttpOnly refresh
// cookie behaves exactly as in production (single site behind a reverse proxy).
const backend = process.env.DEV_BACKEND || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, proxy: { '/api': backend, '/accounts': backend } },
  build: { outDir: 'build', sourcemap: false },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.js' },
});
