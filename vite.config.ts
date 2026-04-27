import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Sitemap-generering körs nu som postbuild-steg i package.json:s
// build-script (efter generate-static-pages.mjs), så att sitemap.xml
// alltid speglar de faktiskt prerenderade routes under dist/.

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const requiredEnvVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID"];
  const missingEnvVars = requiredEnvVars.filter((key) => !env[key]);
  if (missingEnvVars.length > 0 && mode !== "development") {
    throw new Error(`Missing required env vars: ${missingEnvVars.join(", ")}`);
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(env.VITE_SUPABASE_PROJECT_ID ?? ""),
    },
  };
});
