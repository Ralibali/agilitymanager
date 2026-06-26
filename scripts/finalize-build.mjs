#!/usr/bin/env node
/**
 * Sista, deterministiska byggsteget.
 *
 * - Säkerställer att sitemap-filer som genereras efter Vite faktiskt hamnar i dist.
 * - Lägger till /funktioner i sitemap-pages.xml.
 * - Skapar en direktladdningsbar, SEO-anpassad /funktioner/index.html.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(ROOT, "public");
const DIST_DIR = path.resolve(ROOT, "dist");
const FEATURES_URL = "https://agilitymanager.se/funktioner";

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function replaceMeta(html, matcher, replacement) {
  return matcher.test(html) ? html.replace(matcher, replacement) : html;
}

async function createFeaturesPage() {
  const sourcePath = path.join(DIST_DIR, "index.html");
  if (!(await exists(sourcePath))) throw new Error("dist/index.html saknas");

  let html = await fs.readFile(sourcePath, "utf8");
  html = replaceMeta(
    html,
    /<title>[^<]*<\/title>/i,
    "<title>Funktioner – AgilityManager för agility och hoopers</title>",
  );
  html = replaceMeta(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    '<meta name="description" content="Träningslogg, banplanerare, tävlingskalender, statistik, mål och hundprofiler för svensk agility och hoopers.">',
  );
  html = replaceMeta(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${FEATURES_URL}">`,
  );
  html = replaceMeta(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    '<meta property="og:title" content="Funktioner – AgilityManager">',
  );
  html = replaceMeta(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    '<meta property="og:description" content="Ett komplett, enkelt träningssystem för agility och hoopers.">',
  );
  html = replaceMeta(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${FEATURES_URL}">`,
  );

  const targetDir = path.join(DIST_DIR, "funktioner");
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
}

function addFeaturesToSitemap(xml) {
  if (xml.includes(`<loc>${FEATURES_URL}</loc>`)) return xml;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `  <url>\n    <loc>${FEATURES_URL}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  return xml.replace("</urlset>", `${entry}</urlset>`);
}

async function copySitemaps() {
  const entries = await fs.readdir(PUBLIC_DIR, { withFileTypes: true });
  const sitemapFiles = entries
    .filter((entry) => entry.isFile() && /^sitemap(?:-[a-z0-9-]+)?\.xml$/i.test(entry.name))
    .map((entry) => entry.name);

  await fs.mkdir(DIST_DIR, { recursive: true });
  for (const fileName of sitemapFiles) {
    const sourcePath = path.join(PUBLIC_DIR, fileName);
    const targetPath = path.join(DIST_DIR, fileName);
    let contents = await fs.readFile(sourcePath, "utf8");
    if (fileName === "sitemap-pages.xml") {
      contents = addFeaturesToSitemap(contents);
      await fs.writeFile(sourcePath, contents, "utf8");
    }
    await fs.writeFile(targetPath, contents, "utf8");
  }

  return sitemapFiles.length;
}

async function main() {
  await createFeaturesPage();
  const sitemapCount = await copySitemaps();
  console.log(`✓ Slutförde build: /funktioner + ${sitemapCount} sitemap-filer i dist`);
}

main().catch((error) => {
  console.error("❌ finalize-build misslyckades:", error);
  process.exit(1);
});
