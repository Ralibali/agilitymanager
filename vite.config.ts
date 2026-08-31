import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Dela upp tunga tredjepartslibb i egna chunks så att de kan cachas
        // separat och — i kombination med lazy routes/dynamiska imports —
        // inte laddas på förstasidan.
        manualChunks(id) {
          // Vites preload-hjälp (\0vite/preload-helper) används av entry:t för
          // dynamiska imports — den får inte hamna i en tung lazy vendor-chunk,
          // då dras hela chunken in som modulepreload på förstasidan.
          if (id.includes("preload-helper") || id.includes("commonjsHelpers") || id.includes("commonjs-dynamic-modules")) return "vendor-react";
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
          if (id.includes("jspdf")) return "vendor-jspdf";
          if (id.includes("html2canvas")) return "vendor-html2canvas";
          if (id.includes("dompurify")) return "vendor-dompurify";
          if (id.includes("canvg")) return "vendor-canvg";
          // OBS: leaflet/recharts lämnas med sina lazy-importer — egna
          // vendor-chunks där skapar cirkulära chunk-beroenden mot vendor-react.
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-dom") || id.includes("react-router") || /node_modules\/react\//.test(id) || id.includes("scheduler")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});
