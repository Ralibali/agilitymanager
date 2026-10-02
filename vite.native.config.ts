import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nativeNotices } from './scripts/native-notices';

// No SEO prerender, editor integration, external fonts or website analytics
// in the binary. All screens and fonts are packaged in dist-native.
export default defineConfig({
  base: './',
  publicDir: 'mobile-public',
  plugins: [react(), nativeNotices()],
  define: { 'import.meta.env.VITE_NATIVE_APP': JSON.stringify('true') },
  resolve: {
    alias: [
      { find: /^troika-three-text$/, replacement: path.resolve('node_modules/troika-three-text/src/index.js') },
      { find: '../libs/unicode-font-resolver-client.factory.js', replacement: path.resolve('src/features/course-planner/3d/localUnicodeFontResolver.ts') },
      { find: '@/lib/analytics', replacement: path.resolve('src/lib/nativeAnalytics.ts') },
      { find: '@/components/SiteNav', replacement: path.resolve('src/mobile/nativeChrome.tsx') },
      { find: '@/components/SiteFooter', replacement: path.resolve('src/mobile/nativeChrome.tsx') },
      { find: '@', replacement: path.resolve('src') },
    ],
  },
  build: {
    outDir: 'dist-native',
    rollupOptions: { input: path.resolve('mobile.html') },
  },
});
