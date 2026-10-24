// Förrenderar tävlingskalendern, län, klubbar och varje tävlingssida till
// statisk HTML, så att sökmotorer ser riktig titel och innehåll utan JS.
// Hämtar aktuell tävlingsdata vid bygget. Misslyckas hämtningen hoppas
// tävlingsdelen över. Fel i statisk förrendering stoppar bygget.
import { writeHostingPages } from './hosting-pages.mjs';
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, loadEnv } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "node_modules/.cache/prerender-competitions");
const TIMEOUT_MS = 30_000;

async function main() {
  const env = loadEnv("production", root, "VITE_");
  await build({
    configFile: false,
    root,
    logLevel: "warn",
    resolve: { alias: { "@": join(root, "src") } },
    define: Object.fromEntries(
      Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
    ),
    build: {
      ssr: "src/prerender/entry.ts",
      outDir,
      emptyOutDir: true,
      rollupOptions: { output: { format: "es", entryFileNames: "entry.mjs" } },
    },
  });

  const mod = await import(pathToFileURL(join(outDir, "entry.mjs")).href);
  const template = await readFile(join(root, "dist/index.html"), "utf8");

  // Statiska sidor skrivs alltid — de behöver ingen nätverksdata. Tävlings-
  // kalendern och klubbsidan nedan ersätts av fullständiga versioner när
  // tävlingsdatan går att hämta.
  writeHostingPages(template, 'AgilityManager');
  const staticPages = mod.buildStaticPages();
  for (const page of staticPages) {
    const html = mod.renderPage(template, page);
    if (!/<h1[ >]/.test(html)) throw new Error(`Missing first-byte H1: ${page.canonicalPath}`);
    const dir = join(root, "dist", page.canonicalPath);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html);
    // Värdar som mappar /sida → sida.html (utan avslutande snedstreck).
    if (page.canonicalPath !== "/") await writeFile(join(root, "dist", `${page.canonicalPath}.html`), html);
  }
  console.log(`Prerendered ${staticPages.length} static pages.`);

  let comps;
  try {
    comps = await Promise.race([
    mod.fetchUpcomingCompetitions(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("tidsgräns för tävlingsdata")), TIMEOUT_MS)),
  ]);
  if (!Array.isArray(comps) || comps.length === 0) {
    throw new Error("ingen tävlingsdata hämtades");
  }
  } catch (error) {
    console.warn(`Competition data unavailable: ${error instanceof Error ? error.message : error}`);
    return;
  }

  const pages = mod.buildCompetitionPages(comps);
  const staticPaths = new Set(staticPages.map((p) => p.canonicalPath));
  for (const page of pages) {
    const html = mod.renderPage(template, page);
    const dir = join(root, "dist", page.canonicalPath);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html);
    // Ersätt även reservsidans sida.html (t.ex. /tavlingar, /klubbar).
    if (staticPaths.has(page.canonicalPath)) await writeFile(join(root, "dist", `${page.canonicalPath}.html`), html);
  }

  const sitemapPath = join(root, "dist/sitemap.xml");
  const sitemap = await readFile(sitemapPath, "utf8");
  const extra = mod.sitemapUrls(pages, sitemap);
  if (extra) await writeFile(sitemapPath, sitemap.replace("</urlset>", `${extra}\n</urlset>`));

  console.log(`Prerendered ${pages.length} competition pages from ${comps.length} competitions.`);
}

try {
  await main();
} catch (error) {
  console.error(`Prerender failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await rm(outDir, { recursive: true, force: true });
}
// Supabase-klienten och tidsgränsen kan hålla processen vid liv; bygget väntar på den.
process.exit(process.exitCode || 0);
