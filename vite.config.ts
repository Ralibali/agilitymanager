import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
function firstPartyCollect() {
  return {
    name: "first-party-collect",
    configureServer(server: { middlewares: { use: (path: string, fn: (req: { method?: string }, res: { statusCode: number; end: () => void }, next: () => void) => void) => void } }) {
      server.middlewares.use("/api/collect", (req, res, next) => {
        if (req.method !== "POST" && req.method !== "OPTIONS") return next();
        res.statusCode = 204;
        res.end();
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react(), firstPartyCollect()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
