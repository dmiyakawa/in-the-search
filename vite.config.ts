import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
