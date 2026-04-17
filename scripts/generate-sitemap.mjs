#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 *
 * Bygger public/sitemap.xml från:
 *  - Statiska publika rutter (verifierade mot App.tsx — endast icke-skyddade,
 *    icke-token-baserade rutter inkluderas).
 *  - Publicerade blogginlägg från Supabase via anon-nyckel + RLS-policyn
 *    "Anyone can read published blog posts" (drafts + framtida datum filtreras bort).
 *  - Förberedda fetcher-stubs för programmatiska sidor (tävlingar, klubbar,
 *    raser) som fylls på i Fas 2B–2D efter Vercel-flytten.
 *
 * Skalning: en sitemap-fil räcker upp till 50 000 URL:er. Vid den punkten
 * ska scriptet splittras till sitemap-index + delsitemaps.
 *
 * Körs automatiskt vid `vite build` via vite-plugin (vite.config.ts).
 * Manuellt: `node scripts/generate-sitemap.mjs`
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT = resolve(ROOT, 'public/sitemap.xml');

const SITE_URL = 'https://agilitymanager.se';
const SUPABASE_URL = 'https://rcubbmnosawdtaupixnm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA';

const BUILD_DATE = new Date().toISOString().slice(0, 10);
const SITEMAP_URL_LIMIT = 50_000;

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

/* ─────────────────────────────────────────────────────────────────────
   Main
   ───────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('📋 Genererar sitemap.xml...');

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

  const allEntries = [...staticEntries, ...blog, ...competitions, ...clubs, ...breeds];

  if (allEntries.length > SITEMAP_URL_LIMIT) {
    console.warn(
      `⚠️  ${allEntries.length} URL:er överstiger ${SITEMAP_URL_LIMIT} — dags att splitta till sitemap-index.`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(urlBlock).join('\n')}
</urlset>
`;

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, xml, 'utf8');

  console.log(`✓ Skrev ${OUTPUT}`);
  console.log(`  - ${staticEntries.length} statiska rutter`);
  console.log(`  - ${blog.length} blogginlägg`);
  console.log(`  - ${competitions.length} tävlingar (Fas 2B)`);
  console.log(`  - ${clubs.length} klubbar (Fas 2C)`);
  console.log(`  - ${breeds.length} raser (Fas 2D)`);
  console.log(`  - Totalt: ${allEntries.length} URL:er`);
}

main().catch((err) => {
  console.error('❌ Sitemap-generering misslyckades:', err);
  process.exit(1);
});
