#!/usr/bin/env node
/**
 * Sista, deterministiska byggsteget.
 *
 * - Säkerställer att sitemap-filer som genereras efter Vite faktiskt hamnar i dist.
 * - Lägger till /funktioner och Banbankens publika banor i sitemap-pages.xml.
 * - Skapar SEO-anpassad /funktioner/index.html.
 * - Korrigerar äldre statisk metadata så startsidan och /banplanerare speglar
 *   den nya gratis banplanerar-pivoten.
 * - Skapar statisk HTML för varje AgilityManager-original i /banor/<id>/.
 */
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(ROOT, "public");
const DIST_DIR = path.resolve(ROOT, "dist");
const SITE_URL = "https://agilitymanager.se";
const FEATURES_URL = `${SITE_URL}/funktioner`;

// Hålls i synk med src/features/free-planner/courseBank.ts.
const COURSE_PAGES = [
  {
    id: "klass-1-agility-grundflyt",
    title: "Klass 1 agility – Grundflyt",
    description: "Gratis agilitybana för klass 1 med tre olika kontakthinder, slalom och mjuka riktningsbyten. Kopiera banan och redigera direkt utan konto.",
    kind: "Agilityklass",
    className: "Klass 1",
    focus: "Flyt och kontaktfält",
  },
  {
    id: "klass-1-hopp-flyt",
    title: "Klass 1 hopp – Flyt & fokus",
    description: "Gratis hoppbana för klass 1 med slalom, tunnel, däck och långhopp. Kopiera banan och anpassa den gratis i AgilityManager.",
    kind: "Hoppklass",
    className: "Klass 1",
    focus: "Flyt och fart",
  },
  {
    id: "klass-1-agility-kontaktpass",
    title: "Klass 1 agility – Kontaktpasset",
    description: "Gratis agilitybana för klass 1 med tre kontakthinder och fokus på kontaktbeteende, handling och helhetsflyt.",
    kind: "Agilityklass",
    className: "Klass 1",
    focus: "Kontaktfält och handling",
  },
  {
    id: "klass-2-agility-linjeval",
    title: "Klass 2 agility – Linjeval",
    description: "Gratis agilitybana för klass 2 med oxer, kontakthinder och flera linjeval för handlingsträning. Öppna en egen redigerbar kopia utan konto.",
    kind: "Agilityklass",
    className: "Klass 2",
    focus: "Handling och teknik",
  },
  {
    id: "klass-2-hopp-tempo",
    title: "Klass 2 hopp – Tempo & byte",
    description: "Gratis hoppbana för klass 2 med oxer, slalom och tunnelpassager för fart, framförbyten och bakombyten.",
    kind: "Hoppklass",
    className: "Klass 2",
    focus: "Fart och handling",
  },
  {
    id: "klass-3-agility-teknik",
    title: "Klass 3 agility – Teknik & rytm",
    description: "Gratis agilitybana för klass 3 med fyra kontaktpassager, oxer och varierad hinderbild för teknisk träning.",
    kind: "Agilityklass",
    className: "Klass 3",
    focus: "Teknik och kontaktfält",
  },
  {
    id: "klass-3-hopp-teknik",
    title: "Klass 3 hopp – Teknisk fart",
    description: "Gratis hoppbana för klass 3 med oxer, slalom, däck, långhopp och tunnelpartier för tekniska linjer i högre tempo.",
    kind: "Hoppklass",
    className: "Klass 3",
    focus: "Teknik och fart",
  },
  {
    id: "klass-2-agility-tunnelflyt",
    title: "Klass 2 agility – Tunnel & flyt",
    description: "Gratis agilitybana för klass 2 med kontakthinder, tunnelpassager och tydliga linjer för fartfylld flytträning.",
    kind: "Agilityklass",
    className: "Klass 2",
    focus: "Flyt, fart och kontaktfält",
  },
];

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

async function createFeaturesPage() {
  const sourcePath = path.join(DIST_DIR, "index.html");
  if (!(await exists(sourcePath))) throw new Error("dist/index.html saknas");

  let html = await fs.readFile(sourcePath, "utf8");
  html = setPageMeta(html, {
    title: "Funktioner – AgilityManager för agility och hoopers",
    description: "Träningslogg, gratis banplanerare, tävlingskalender, statistik, mål och hundprofiler för svensk agility och hoopers.",
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
      title: "Gratis banplanerare för agility | AgilityManager",
      description: `Rita agilitybanor gratis utan konto. Riktig meterskala, svensk regelcheck, lokal autosparning och Banbank med ${COURSE_PAGES.length} originalbanor för klass 1–3.`,
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
      description: "Gratis webbaserad banplanerare för agility med meterskala, svensk regelcheck och Banbank.",
    });
    home = appendJsonLd(home, {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        ["Är AgilityManagers banplanerare gratis?", "Ja. Du kan börja rita, flytta och rotera hinder, använda Banbanken, spara lokalt och exportera utan att skapa konto."],
        ["Måste jag logga in för att rita en agilitybana?", "Nej. Inloggning behövs inte för den öppna banplaneraren. Konto är tänkt för funktioner som molnsynk och framtida publicering."],
        ["Vilka banor finns i Banbanken?", `Banbanken innehåller ${COURSE_PAGES.length} AgilityManager-original för agilityklass och hoppklass i klass 1, 2 och 3.`],
        ["Kontrollerar verktyget svenska agilityregler?", "Ja, det ger stöd för regler som kan avgöras från planritningen, exempelvis hinderantal, vissa hinderbegränsningar, kontaktpassager och avstånd. Det ersätter inte en domares kontroll på plats."],
        ["Kan jag ändra en bana från Banbanken?", "Ja. När du väljer en bana öppnas en egen redigerbar kopia som du kan flytta, rotera och anpassa efter din träningsyta."],
      ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
    });
    await fs.writeFile(homePath, home, "utf8");
  }

  const plannerPath = path.join(DIST_DIR, "banplanerare", "index.html");
  if (await exists(plannerPath)) {
    let planner = await fs.readFile(plannerPath, "utf8");
    planner = setPageMeta(planner, {
      title: "Rita agilitybana gratis | AgilityManager",
      description: `Rita agilitybanor gratis direkt i webbläsaren. Ingen inloggning krävs. Meterskala, svensk regelcheck, lokal autosparning och ${COURSE_PAGES.length} kopierbara banor för klass 1–3.`,
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

async function createCoursePages() {
  const sourcePath = path.join(DIST_DIR, "index.html");
  if (!(await exists(sourcePath))) throw new Error("dist/index.html saknas för bansidor");
  const template = await fs.readFile(sourcePath, "utf8");

  for (const course of COURSE_PAGES) {
    const url = `${SITE_URL}/banor/${course.id}`;
    let html = stripJsonLdType(template, "FAQPage");
    html = stripJsonLdType(html, "SoftwareApplication");
    html = setPageMeta(html, {
      title: `${course.title} – gratis agilitybana | AgilityManager`,
      description: course.description,
      canonical: url,
    });
    html = appendJsonLd(html, {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: course.title,
      description: course.description,
      url,
      creator: { "@type": "Organization", name: "AgilityManager" },
      about: ["Agility", course.className, course.kind, course.focus],
      isAccessibleForFree: true,
    });
    html = injectSeoContent(
      html,
      `<article><h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.description)}</p><ul><li>${escapeHtml(course.kind)}</li><li>${escapeHtml(course.className)}</li><li>40 × 30 meter</li><li>20 hinderpassager</li><li>Fokus: ${escapeHtml(course.focus)}</li></ul><p><a href="/banplanerare?course=${encodeURIComponent(course.id)}">Kopiera och redigera banan gratis</a></p><p><a href="/banplanerare?view=bank">Se fler gratis agilitybanor i Banbanken</a></p></article>`,
    );

    const targetDir = path.join(DIST_DIR, "banor", course.id);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, "index.html"), html, "utf8");
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
    xml = addUrlToSitemap(xml, { url: `${SITE_URL}/banor/${course.id}`, changefreq: "monthly", priority: "0.8" });
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
  await updatePlannerFirstStaticMeta();
  await createFeaturesPage();
  await createCoursePages();
  const sitemapCount = await copySitemaps();
  console.log(`✓ Slutförde build: planner-first metadata + /funktioner + ${COURSE_PAGES.length} bansidor + ${sitemapCount} sitemap-filer`);
}

main().catch((error) => {
  console.error("❌ finalize-build misslyckades:", error);
  process.exit(1);
});
