#!/usr/bin/env node
/**
 * Prerenderar den publika /banor-indexsidan efter finalize-build.
 * React visar den interaktiva banken; detta steg ger sökmotorer korrekt head,
 * CollectionPage-JSON-LD och crawlbara länkar till alla 25 V2-kartor.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { PUBLIC_COURSE_CATALOG } from "../src/features/course-planner-v2/publicCourseCatalog.mjs";

const ROOT = process.cwd();
const DIST_DIR = path.resolve(ROOT, "dist");
const PUBLIC_DIR = path.resolve(ROOT, "public");
const SITE_URL = "https://agilitymanager.se";
const ROUTE = "/banor";
const URL = `${SITE_URL}${ROUTE}`;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function replaceOrInsertHead(html, matcher, replacement) {
  if (matcher.test(html)) return html.replace(matcher, replacement);
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function setMeta(html) {
  const title = "Banbank – 25 gratis agility-, Nollklass- & Hoopersbanor | AgilityManager";
  const description = "Utforska 25 gratis färdiga V2-kartor: agilityklass, hoppklass, 12 Nollklasskartor, spegelbanor och Hoopers. Öppna exakt samma layout i den fulla gratis banplaneraren.";
  html = replaceOrInsertHead(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceOrInsertHead(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(description)}">`);
  html = replaceOrInsertHead(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${URL}">`);
  html = replaceOrInsertHead(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="25 gratis banor i AgilityManagers Banbank">`);
  html = replaceOrInsertHead(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}">`);
  html = replaceOrInsertHead(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${URL}">`);

  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "AgilityManager Banbank",
    description,
    url: URL,
    hasPart: PUBLIC_COURSE_CATALOG.map((course) => ({
      "@type": "CreativeWork",
      name: course.title,
      url: `${SITE_URL}/banor/${course.id}`,
      isAccessibleForFree: true,
    })),
  }).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  return html.replace("</head>", `    <script type="application/ld+json">${schema}</script>\n  </head>`);
}

function injectLinks(html) {
  const links = PUBLIC_COURSE_CATALOG.map((course) =>
    `<li><a href="/banor/${encodeURIComponent(course.id)}">${escapeHtml(course.title)}</a> – ${escapeHtml(course.discipline)}, ${escapeHtml(course.level)}, ${course.arenaWidthM}×${course.arenaHeightM} m, ${course.passages} passager</li>`,
  ).join("");
  const body = `<div id="course-bank-seo-content" aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden"><article><h1>AgilityManager Banbank – 25 gratis V2-kartor</h1><p>12 klass 1–3-kartor, 12 Nollklasskartor och en Hoopers-karta. Kartorna öppnas direkt i den fulla gratis V2-banplaneraren.</p><ul>${links}</ul><p><a href="/banplanerare">Rita en egen bana gratis</a></p></article></div>`;
  return html.includes('<div id="root"></div>')
    ? html.replace('<div id="root"></div>', `${body}<div id="root"></div>`)
    : html.replace("</body>", `${body}</body>`);
}

function addBankUrl(xml) {
  if (xml.includes(`<loc>${URL}</loc>`)) return xml;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `  <url>\n    <loc>${URL}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  return xml.replace("</urlset>", `${entry}</urlset>`);
}

async function updateSitemap(filePath) {
  try {
    const xml = await fs.readFile(filePath, "utf8");
    await fs.writeFile(filePath, addBankUrl(xml), "utf8");
  } catch {
    // Sitemap kan saknas i lokala delbyggen; huvudbygget verifierar filen i CI.
  }
}

async function main() {
  if (PUBLIC_COURSE_CATALOG.length !== 25) throw new Error(`Förväntade 25 publika V2-kartor, fick ${PUBLIC_COURSE_CATALOG.length}`);
  const sourcePath = path.join(DIST_DIR, "index.html");
  let html = await fs.readFile(sourcePath, "utf8");
  html = injectLinks(setMeta(html));

  const targetDir = path.join(DIST_DIR, "banor");
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");

  await updateSitemap(path.join(PUBLIC_DIR, "sitemap-pages.xml"));
  await updateSitemap(path.join(DIST_DIR, "sitemap-pages.xml"));
  console.log(`✓ /banor prerenderad med ${PUBLIC_COURSE_CATALOG.length} crawlbara V2-kartor`);
}

main().catch((error) => {
  console.error("❌ finalize-course-bank-index misslyckades:", error);
  process.exit(1);
});
