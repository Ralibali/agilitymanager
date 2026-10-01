import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No SEO prerender, editor integration, external fonts or website analytics
// in the binary. All screens and fonts are packaged in dist-native.
export default defineConfig({
  base: './',
  publicDir: 'mobile-public',
  plugins: [react()],
  define: { 'import.meta.env.VITE_NATIVE_APP': JSON.stringify('true') },
  resolve: {
    alias: [
      { find: '@/lib/analytics', replacement: path.resolve('src/lib/nativeAnalytics.ts') },
      { find: '@', replacement: path.resolve('src') },
    ],
  },
  build: {
    outDir: 'dist-native',
    rollupOptions: { input: path.resolve('mobile.html') },
  },
});
