#!/usr/bin/env node
/**
 * Genererar public/sitemap.xml från verkliga publika routes:
 *  - statiska routes ur src/lib/routes.ts (PUBLIC_ROUTES)
 *  - bloggartiklar ur src/content/articles.ts (slug + updatedAt)
 *
 * Körs automatiskt före build (npm run prebuild). Ingen extern dependency —
 * källfilerna har ett kontrollerat, parsbart format.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://agilitymanager.se";

const routesSrc = readFileSync(join(root, "src/lib/routes.ts"), "utf8");
const articlesSrc = readFileSync(join(root, "src/content/articles.ts"), "utf8");

// Statiska routes: { path: "/", priority: 1.0, changefreq: "weekly" },
const staticRoutes = [];
for (const m of routesSrc.matchAll(
  /\{\s*path:\s*"([^"]+)",\s*priority:\s*([\d.]+),\s*changefreq:\s*"([^"]+)"\s*\}/g,
)) {
  staticRoutes.push({ path: m[1], priority: m[2], changefreq: m[3] });
}

// Artiklar: slug + updatedAt (fältordningen är stabil i källfilen)
const articles = [];
for (const m of articlesSrc.matchAll(
  /slug:\s*"([^"]+)",[\s\S]*?updatedAt:\s*"([^"]+)"/g,
)) {
  articles.push({ slug: m[1], updatedAt: m[2] });
}

if (staticRoutes.length === 0 || articles.length === 0) {
  console.error(
    `generate-sitemap: oväntat få träffar (routes=${staticRoutes.length}, articles=${articles.length}) — har källfilernas format ändrats?`,
  );
  process.exit(1);
}

const url = (loc, extra = "") => `  <url>\n    <loc>${SITE}${loc}</loc>\n${extra}  </url>`;

const entries = [
  ...staticRoutes.map((r) =>
    url(
      r.path,
      `    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n`,
    ),
  ),
  ...articles.map((a) =>
    url(`/blogg/${a.slug}`, `    <lastmod>${a.updatedAt}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n`),
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Genererad av scripts/generate-sitemap.mjs — redigera inte för hand.
     Endast riktiga publika, indexerbara routes. /bana/:id (noindex) och
     redirectade legacy-routes (/tavlingar, /priser, /auth m.fl.) är utelämnade. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`sitemap.xml: ${staticRoutes.length} routes + ${articles.length} artiklar`);
