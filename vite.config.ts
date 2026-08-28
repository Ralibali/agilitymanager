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

function firstByteSeoPlugin(): Plugin {
  return {
    name: "first-byte-seo",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        return applyFirstByteSeo(html, routeFromRequestPath(ctx.path));
      },
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
});
