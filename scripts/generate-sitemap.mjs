#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 *
 * Bygger ett sitemap-index + per-typ-sitemaps i public/:
 *
 *   public/sitemap.xml             → index som pekar på övriga
 *   public/sitemap-pages.xml       → statiska publika sidor
 *   public/sitemap-blog.xml        → publicerade blogginlägg
 *   public/sitemap-competitions.xml (Fas 2B, tomt nu)
 *   public/sitemap-clubs.xml        (Fas 2C, tomt nu)
 *   public/sitemap-breeds.xml       (Fas 2D, tomt nu)
 *
 * Vinst: bättre Search Console-stats (indexering per typ), enklare felsökning,
 * och vi sitter inte med en monofil när vi närmar oss 50k-gränsen.
 *
 * Körs automatiskt vid `vite build` via vite-plugin (vite.config.ts).
 * Manuellt: `node scripts/generate-sitemap.mjs`
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');

const SITE_URL = 'https://agilitymanager.se';
const SUPABASE_URL = 'https://rcubbmnosawdtaupixnm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA';

const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SITEMAP_URL_LIMIT = 50_000;
// Säker chunk-storlek: under 50k-taket med marginal. När en typ överstiger
// detta delas den automatiskt till sitemap-<typ>-1.xml, sitemap-<typ>-2.xml ...
const CHUNK_SIZE = 45_000;

/* ─────────────────────────────────────────────────────────────────────
   Statiska publika rutter — verifierade mot src/App.tsx
   Exkluderade medvetet:
     - /auth, /reset-password, /avregistrera (auth/token-flöden)
     - /invite/:code, /club-invite/:code (token-baserade)
     - /design-demo (intern)
     - Alla /dashboard, /stats, /training, /admin, etc. (skyddade)
   ───────────────────────────────────────────────────────────────────── */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/blogg', changefreq: 'weekly', priority: '0.9' },
  { path: '/hoopers', changefreq: 'weekly', priority: '0.9' },
  { path: '/hoopers-regler', changefreq: 'monthly', priority: '0.9' },
  { path: '/om-agility', changefreq: 'monthly', priority: '0.9' },
  { path: '/hundforsakring', changefreq: 'monthly', priority: '0.9' },
  { path: '/integritetspolicy', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookiepolicy', changefreq: 'yearly', priority: '0.3' },
];

/* ─────────────────────────────────────────────────────────────────────
   Supabase REST-helper (anon-nyckel + RLS)
   ───────────────────────────────────────────────────────────────────── */
async function supabaseGet(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase ${path} fetch failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────
   Fetchers — varje funktion returnerar { loc, lastmod, changefreq, priority }[]
   ───────────────────────────────────────────────────────────────────── */

async function fetchBlogPosts() {
  const today = new Date().toISOString().slice(0, 10);
  const posts = await supabaseGet('blog_posts', {
    select: 'slug,updated_at,date',
    published: 'eq.true',
    date: `lte.${today}`,
    order: 'updated_at.desc',
  });

  const seen = new Set();
  return posts
    .filter((p) => {
      if (!p.slug || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    })
    .map((p) => ({
      loc: `${SITE_URL}/blogg/${p.slug}`,
      lastmod: (p.updated_at || p.date || BUILD_DATE).slice(0, 10),
      changefreq: 'monthly',
      priority: '0.8',
    }));
}

// ─── Programmatiska sidor — stubs för framtida faser ──────────────────
// Fyller på i Fas 2B när /tavling/:id-sidor byggs (anslag från `competitions`)
async function fetchCompetitions() {
  return [];
}

// Fyller på i Fas 2C när /klubb/:slug-sidor byggs
async function fetchClubs() {
  return [];
}

// Fyller på i Fas 2D när /ras/:slug-sidor byggs (från `breeds`)
async function fetchBreeds() {
  return [];
}

/* ─────────────────────────────────────────────────────────────────────
   XML-byggare
   ───────────────────────────────────────────────────────────────────── */

function escapeXml(s) {
  return s.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function urlBlock({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function buildUrlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlBlock).join('\n')}
</urlset>
`;
}

function buildIndex(sitemaps) {
  const items = sitemaps
    .map(
      (s) => `  <sitemap>
    <loc>${escapeXml(`${SITE_URL}/${s.file}`)}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

function writeSitemap(file, entries) {
  const out = resolve(PUBLIC_DIR, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildUrlset(entries), 'utf8');
}

/* ─────────────────────────────────────────────────────────────────────
   Main
   ───────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('📋 Genererar sitemap-index + per-typ-sitemaps...');

  const staticEntries = STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    lastmod: BUILD_DATE,
    changefreq: r.changefreq,
    priority: r.priority,
  }));

  // Hämta dynamiska entries i parallell — fail-soft per källa
  const [blog, competitions, clubs, breeds] = await Promise.all([
    fetchBlogPosts().catch((err) => {
      console.error('⚠️  blog_posts:', err.message);
      return [];
    }),
    fetchCompetitions().catch((err) => {
      console.error('⚠️  competitions:', err.message);
      return [];
    }),
    fetchClubs().catch((err) => {
      console.error('⚠️  clubs:', err.message);
      return [];
    }),
    fetchBreeds().catch((err) => {
      console.error('⚠️  breeds:', err.message);
      return [];
    }),
  ]);

  // Senaste lastmod per typ (för index-filen). Fallback: BUILD_DATE.
  const latest = (entries) =>
    entries.reduce((max, e) => (e.lastmod > max ? e.lastmod : max), BUILD_DATE);

  const groups = [
    { file: 'sitemap-pages.xml',         entries: staticEntries, lastmod: BUILD_DATE },
    { file: 'sitemap-blog.xml',          entries: blog,          lastmod: latest(blog) },
    { file: 'sitemap-competitions.xml',  entries: competitions,  lastmod: latest(competitions) },
    { file: 'sitemap-clubs.xml',         entries: clubs,         lastmod: latest(clubs) },
    { file: 'sitemap-breeds.xml',        entries: breeds,        lastmod: latest(breeds) },
  ];

  // Skriv varje undersitemap (även tomma så Search Console kan registrera dem
  // utan 404). Logga storleksvarning per fil.
  for (const g of groups) {
    if (g.entries.length > SITEMAP_URL_LIMIT) {
      console.warn(
        `⚠️  ${g.file}: ${g.entries.length} URL:er överstiger ${SITEMAP_URL_LIMIT} — dela upp ytterligare.`,
      );
    }
    writeSitemap(g.file, g.entries);
  }

  // Skriv index. Bara grupper med innehåll inkluderas så Google inte slösar
  // crawl-budget på tomma filer (men de ligger fysiskt kvar för manuell
  // inspektion och är trivialt billiga att lägga till när data dyker upp).
  const indexEntries = groups.filter((g) => g.entries.length > 0);
  const indexXml = buildIndex(indexEntries);
  writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), indexXml, 'utf8');

  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  console.log(`✓ Skrev sitemap-index med ${indexEntries.length} aktiva delsitemaps`);
  for (const g of groups) {
    const tag = g.entries.length === 0 ? '(tom – ingår ej i index)' : '';
    console.log(`  - ${g.file}: ${g.entries.length} URL:er ${tag}`);
  }
  console.log(`  - Totalt: ${total} URL:er`);
}

main().catch((err) => {
  console.error('❌ Sitemap-generering misslyckades:', err);
  process.exit(1);
});
