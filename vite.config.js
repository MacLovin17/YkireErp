import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/Ykire/',
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/pages/, replacement: fileURLToPath(new URL('./src/Pages', import.meta.url)) },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  server: {
    proxy: {
      '/Ykire/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/Ykire/, ''),
      },
    },
  },
  build: { outDir: 'dist' },
});
