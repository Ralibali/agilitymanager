#!/usr/bin/env node
/**
 * Sista, deterministiska byggsteget.
 *
 * - Säkerställer att sitemap-filer som genereras efter Vite faktiskt hamnar i dist.
 * - Lägger till /funktioner och ALLA publika V2-banbankskartor i sitemap-pages.xml.
 * - Skapar SEO-anpassad /funktioner/index.html.
 * - Korrigerar statisk metadata så startsidan och /banplanerare speglar den
 *   fulla gratis V2-planeraren och den faktiska Banbanken.
 * - Skapar statisk HTML för varje V2-karta i /banor/<id>/.
 * - Behåller åtta gamla bansides-URL:er som legacy-ingångar med canonical mot
 *   motsvarande V2-karta, men skickar inte de gamla URL:erna till sitemapen.
 *
 * Kritisk princip: PUBLIC_COURSE_CATALOG är samma katalog som klienten använder.
 * En separat Vitest-kontroll verifierar att katalogens id:n exakt matchar COURSE_BANK.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  LEGACY_COURSE_ALIASES,
  PUBLIC_COURSE_CATALOG,
  getPublicCourseMeta,
} from "../src/features/course-planner-v2/publicCourseCatalog.mjs";

const ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(ROOT, "public");
const DIST_DIR = path.resolve(ROOT, "dist");
const SITE_URL = "https://agilitymanager.se";
const FEATURES_URL = `${SITE_URL}/funktioner`;
const COURSE_PAGES = PUBLIC_COURSE_CATALOG;
const SWEDISH_COURSE_COUNT = COURSE_PAGES.filter((course) => !course.isHoopers).length;
const NOLLKLASS_COUNT = COURSE_PAGES.filter((course) => course.isNollklass).length;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

function replaceOrInsertHead(html, matcher, replacement) {
  if (matcher.test(html)) return html.replace(matcher, replacement);
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function setPageMeta(html, { title, description, canonical }) {
  const canonicalUrl = canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`;
  const fullTitle = title.includes("AgilityManager") ? title : `${title} | AgilityManager`;

  html = replaceOrInsertHead(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  html = replaceOrInsertHead(
    html,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(description)}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonicalUrl}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonicalUrl}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}">`,
  );
  html = replaceOrInsertHead(
    html,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  );
  return html;
}

function stripJsonLdType(html, typeName) {
  return html.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, (script) =>
    script.includes(`\"@type\":\"${typeName}\"`) || script.includes(`"@type":"${typeName}"`) ? "" : script,
  );
}

function appendJsonLd(html, schema) {
  const script = `<script type="application/ld+json">${safeJsonLd(schema)}</script>`;
  return html.replace("</head>", `    ${script}\n  </head>`);
}

function injectSeoContent(html, body) {
  if (!body) return html;
  const block = `<div id="course-seo-content" aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">${body}</div>`;
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `${block}<div id="root"></div>`);
  }
  return html.replace("</body>", `${block}</body>`);
}

function publicCourseDescription(course) {
  return `${course.description} ${course.arenaWidthM}×${course.arenaHeightM} m. Öppna och redigera gratis i AgilityManagers fulla V2-banplanerare.`;
}

function publicCourseSeoBody(course) {
  const tags = course.focus.map((focus) => `<li>${escapeHtml(focus)}</li>`).join("");
  const quality = course.isHoopers
    ? "Hoopers använder en separat regelprofil."
    : course.isNollklass
      ? "AgilityManager-original kontrollerat mot den maskinella Nollklass-grinden för 2026."
      : "AgilityManager-original kontrollerat mot den maskinella svenska klassgrinden.";
  return `<article>
    <h1>${escapeHtml(course.title)}</h1>
    <p>${escapeHtml(publicCourseDescription(course))}</p>
    <ul>
      <li>${escapeHtml(course.discipline)}</li>
      <li>${escapeHtml(course.level)}</li>
      <li>${course.arenaWidthM} × ${course.arenaHeightM} meter</li>
      <li>${course.passages} hinderpassager</li>
      <li>${escapeHtml(quality)}</li>
      ${tags}
    </ul>
    <p><a href="/banplanerare?course=${encodeURIComponent(course.id)}">Kopiera exakt V2-bana och redigera gratis</a></p>
    <p><a href="/banplanerare?view=bank">Se alla ${COURSE_PAGES.length} färdiga kartor i Banbanken</a></p>
  </article>`;
}

async function createFeaturesPage() {
  const sourcePath = path.join(DIST_DIR, "index.html");
  if (!(await exists(sourcePath))) throw new Error("dist/index.html saknas");

  let html = await fs.readFile(sourcePath, "utf8");
  html = setPageMeta(html, {
    title: "Funktioner – AgilityManager för agility och hoopers",
    description: "Träningslogg, gratis full V2-banplanerare, 25 färdiga kartor, tävlingskalender, statistik, mål och hundprofiler för svensk agility och hoopers.",
    canonical: FEATURES_URL,
  });

  const targetDir = path.join(DIST_DIR, "funktioner");
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
}

async function updatePlannerFirstStaticMeta() {
  const homePath = path.join(DIST_DIR, "index.html");
  if (await exists(homePath)) {
    let home = await fs.readFile(homePath, "utf8");
    home = setPageMeta(home, {
      title: "Gratis banplanerare för agility & hoopers | AgilityManager",
      description: `Rita agility och hoopers gratis utan konto i den fulla V2-planeraren. Meterskala, svensk regelcheck, PDF/3D och Banbank med ${COURSE_PAGES.length} färdiga kartor – varav ${NOLLKLASS_COUNT} Nollklasskartor.`,
      canonical: "/",
    });
    home = stripJsonLdType(home, "FAQPage");
    home = appendJsonLd(home, {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AgilityManager Banplanerare",
      applicationCategory: "SportsApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
      description: `Gratis full V2-banplanerare för agility och hoopers med meterskala, regelkontroll, PDF/3D och ${COURSE_PAGES.length} färdiga kartor.`,
    });
    home = appendJsonLd(home, {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        ["Är AgilityManagers banplanerare gratis?", "Ja. Du kan rita, flytta och rotera hinder, använda Banbanken, spara lokalt, använda 3D och exportera utan att skapa konto."],
        ["Måste jag logga in för att rita en agilitybana?", "Nej. Inloggning behövs inte för den fulla öppna V2-banplaneraren. Konto används först för kontobundna funktioner som molnsynk och klubbdelning."],
        ["Vilka banor finns i Banbanken?", `Banbanken innehåller ${COURSE_PAGES.length} färdiga V2-kartor: ${SWEDISH_COURSE_COUNT} svenska agility/hopp/Nollklass-kartor samt en Hoopers-karta. ${NOLLKLASS_COUNT} av kartorna är Nollklass-original och spegelvarianter.`],
        ["Kontrollerar verktyget svenska agilityregler?", "Ja, verktyget kontrollerar sådant som kan avgöras maskinellt från planritningen och den beräknade hundlinjen. Det ersätter inte fysisk kontroll på plats."],
        ["Kan jag ändra en bana från Banbanken?", "Ja. När du väljer en karta öppnas exakt samma V2-layout som i Banbanken som en egen redigerbar kopia."],
      ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
    });
    await fs.writeFile(homePath, home, "utf8");
  }

  const plannerPath = path.join(DIST_DIR, "banplanerare", "index.html");
  if (await exists(plannerPath)) {
    let planner = await fs.readFile(plannerPath, "utf8");
    planner = setPageMeta(planner, {
      title: "Rita agility- & hoopersbana gratis | AgilityManager",
      description: `Rita agility och hoopers gratis direkt i webbläsaren. Full V2-editor, meterskala, regelkontroll, PDF/3D, lokal autosparning och ${COURSE_PAGES.length} kopierbara kartor inklusive ${NOLLKLASS_COUNT} Nollklasskartor.`,
      canonical: "/banplanerare",
    });
    planner = stripJsonLdType(planner, "FAQPage");
    planner = appendJsonLd(planner, {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AgilityManager Banplanerare",
      applicationCategory: "SportsApplication",
      operatingSystem: "Web",
      url: `${SITE_URL}/banplanerare`,
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
    });
    await fs.writeFile(plannerPath, planner, "utf8");
  }
}

async function createCoursePage(template, course, targetId = course.id, canonicalId = course.id) {
  const canonicalUrl = `${SITE_URL}/banor/${canonicalId}`;
  let html = stripJsonLdType(template, "FAQPage");
  html = stripJsonLdType(html, "SoftwareApplication");
  html = setPageMeta(html, {
    title: `${course.title} – gratis ${course.isHoopers ? "Hoopersbana" : course.isNollklass ? "Nollklassbana" : "agilitybana"} | AgilityManager`,
    description: publicCourseDescription(course),
    canonical: canonicalUrl,
  });
  html = appendJsonLd(html, {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: course.title,
    description: publicCourseDescription(course),
    url: canonicalUrl,
    creator: { "@type": "Organization", name: "AgilityManager" },
    about: [course.discipline, course.level, ...course.focus],
    isAccessibleForFree: true,
    spatialCoverage: `${course.arenaWidthM}×${course.arenaHeightM} m`,
  });
  html = injectSeoContent(html, publicCourseSeoBody(course));

  const targetDir = path.join(DIST_DIR, "banor", targetId);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
}

async function createCoursePages() {
  const sourcePath = path.join(DIST_DIR, "index.html");
  if (!(await exists(sourcePath))) throw new Error("dist/index.html saknas för bansidor");
  const template = await fs.readFile(sourcePath, "utf8");

  for (const course of COURSE_PAGES) {
    await createCoursePage(template, course);
  }

  // Backward compatibility för URL:er som redan kan ligga i Google, delningar
  // eller bokmärken. De får canonical mot nya V2-id:t och ligger inte i sitemap.
  for (const [legacyId, targetId] of Object.entries(LEGACY_COURSE_ALIASES)) {
    const target = getPublicCourseMeta(targetId);
    if (!target) throw new Error(`Legacy-bana ${legacyId} pekar på okänt V2-id ${targetId}`);
    await createCoursePage(template, target, legacyId, targetId);
  }
}

function addUrlToSitemap(xml, { url, changefreq = "monthly", priority = "0.8" }) {
  if (xml.includes(`<loc>${url}</loc>`)) return xml;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  return xml.replace("</urlset>", `${entry}</urlset>`);
}

function enrichPagesSitemap(xml) {
  xml = addUrlToSitemap(xml, { url: FEATURES_URL, priority: "0.9" });
  for (const course of COURSE_PAGES) {
    xml = addUrlToSitemap(xml, { url: `${SITE_URL}/banor/${course.id}`, changefreq: "monthly", priority: course.isNollklass ? "0.8" : "0.8" });
  }
  return xml;
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
      contents = enrichPagesSitemap(contents);
      await fs.writeFile(sourcePath, contents, "utf8");
    }
    await fs.writeFile(targetPath, contents, "utf8");
  }

  return sitemapFiles.length;
}

async function main() {
  if (COURSE_PAGES.length !== 25) {
    throw new Error(`Förväntade 25 V2-kartor i publik katalog, fick ${COURSE_PAGES.length}`);
  }
  await updatePlannerFirstStaticMeta();
  await createFeaturesPage();
  await createCoursePages();
  const sitemapCount = await copySitemaps();
  console.log(`✓ Slutförde build: full V2-metadata + /funktioner + ${COURSE_PAGES.length} V2-bansidor + ${Object.keys(LEGACY_COURSE_ALIASES).length} legacy-URL:er + ${sitemapCount} sitemap-filer`);
}

main().catch((error) => {
  console.error("❌ finalize-build misslyckades:", error);
  process.exit(1);
});
