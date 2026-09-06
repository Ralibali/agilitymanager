import fs from "node:fs"
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import {
  applyFirstByteSeo,
  assertFirstByteMoneyRoute,
  FIRST_BYTE_ROUTES,
  routeFromRequestPath,
} from "./src/lib/firstByteSeo"

function plannerShellPath(): string {
  return path.resolve(__dirname, "dist/banplanerare/index.html");
}

function servePlannerShellIfRequested(
  req: { url?: string },
  res: { setHeader: (k: string, v: string) => void; end: (b: string) => void },
  next: () => void,
) {
  const url = req.url?.split("?")[0];
  if (url !== "/banplanerare" && url !== "/banplanerare/") {
    next();
    return;
  }
  const file = plannerShellPath();
  if (!fs.existsSync(file)) {
    next();
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(fs.readFileSync(file, "utf8"));
}

function firstByteSeoPlugin(): Plugin {
  return {
    name: "first-byte-seo",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        return applyFirstByteSeo(html, routeFromRequestPath(ctx.path));
      },
    },
    configurePreviewServer(server) {
      server.middlewares.use(servePlannerShellIfRequested);
    },
    closeBundle() {
      const indexPath = path.resolve(__dirname, "dist/index.html");
      if (!fs.existsSync(indexPath)) return;
      const homeHtml = fs.readFileSync(indexPath, "utf8");
      assertFirstByteMoneyRoute(homeHtml, FIRST_BYTE_ROUTES["/"]);
      const plannerHtml = applyFirstByteSeo(homeHtml, FIRST_BYTE_ROUTES["/banplanerare"]);
      assertFirstByteMoneyRoute(plannerHtml, FIRST_BYTE_ROUTES["/banplanerare"]);
      const outDir = path.resolve(__dirname, "dist/banplanerare");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "index.html"), plannerHtml);
      // Hosts that map /banplanerare → banplanerare.html (no trailing slash).
      fs.writeFileSync(path.resolve(__dirname, "dist/banplanerare.html"), plannerHtml);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), firstByteSeoPlugin(), react()],
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
