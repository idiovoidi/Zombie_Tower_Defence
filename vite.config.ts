import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Zombie_Tower_Defence-OS2/' : '/',
  server: {
    port: 8080,
    open: false, // Disabled to prevent duplicate instances when debugging
  },
  build: {
    outDir: 'dist', // GitHub Actions expects dist folder
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@components': resolve(import.meta.dirname, 'src/components'),
      '@managers': resolve(import.meta.dirname, 'src/managers'),
      '@objects': resolve(import.meta.dirname, 'src/objects'),
      '@ui': resolve(import.meta.dirname, 'src/ui'),
      '@utils': resolve(import.meta.dirname, 'src/utils'),
      '@config': resolve(import.meta.dirname, 'src/config'),
      '@renderers': resolve(import.meta.dirname, 'src/renderers'),
    },
  },
});
