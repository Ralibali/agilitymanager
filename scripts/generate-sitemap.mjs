#!/usr/bin/env node
/**
 * generate-sitemap.mjs
 *
 * Bygger public/sitemap.xml från:
 *  - Statiska publika rutter (hårdkodad lista)
 *  - Publicerade blogginlägg från Supabase (filtrerar bort drafts + framtida datum)
 *
 * <lastmod> hämtas från blog_posts.updated_at för artiklar, och från build-tiden för
 * statiska sidor. Körs automatiskt vid `vite build` via vite-plugin (vite.config.ts).
 *
 * Kan även köras manuellt: `node scripts/generate-sitemap.mjs`
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

// Statiska publika rutter (måste hållas i synk med App.tsx)
// /auth, /reset-password, /invite/*, /club-invite/* är medvetet exkluderade.
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/om-agility', changefreq: 'monthly', priority: '0.9' },
  { path: '/hundforsakring', changefreq: 'monthly', priority: '0.9' },
  { path: '/hoopers', changefreq: 'weekly', priority: '0.9' },
  { path: '/hoopers-regler', changefreq: 'monthly', priority: '0.9' },
  { path: '/blogg', changefreq: 'weekly', priority: '0.9' },
  { path: '/integritetspolicy', changefreq: 'yearly', priority: '0.3' },
  { path: '/cookiepolicy', changefreq: 'yearly', priority: '0.3' },
];

// Hoopers-relaterade slugs får priority 0.9 (huvudkategori), övriga 0.8
const HIGH_PRIORITY_SLUGS = new Set(['hoopers-hund']);

async function fetchPublishedPosts() {
  const today = new Date().toISOString().slice(0, 10);
  const url = new URL(`${SUPABASE_URL}/rest/v1/blog_posts`);
  url.searchParams.set('select', 'slug,updated_at,date');
  url.searchParams.set('published', 'eq.true');
  // Filtrera bort framtida publiceringsdatum (date > idag)
  url.searchParams.set('date', `lte.${today}`);
  url.searchParams.set('order', 'updated_at.desc');

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

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

async function main() {
  console.log('📋 Genererar sitemap.xml...');

  let posts = [];
  try {
    posts = await fetchPublishedPosts();
    console.log(`✓ Hämtade ${posts.length} publicerade inlägg från databasen`);
  } catch (err) {
    console.error('⚠️  Kunde inte hämta inlägg från Supabase:', err.message);
    console.error('   Sitemap genereras endast med statiska rutter.');
  }

  // Bygg URL-block
  const staticBlocks = STATIC_ROUTES.map((r) =>
    urlBlock({
      loc: `${SITE_URL}${r.path}`,
      lastmod: BUILD_DATE,
      changefreq: r.changefreq,
      priority: r.priority,
    })
  );

  // Deduplicera på slug (skydd mot dubbletter i DB)
  const seen = new Set();
  const blogBlocks = posts
    .filter((p) => {
      if (!p.slug || seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    })
    .map((p) =>
      urlBlock({
        loc: `${SITE_URL}/blogg/${p.slug}`,
        lastmod: (p.updated_at || p.date || BUILD_DATE).slice(0, 10),
        changefreq: 'monthly',
        priority: HIGH_PRIORITY_SLUGS.has(p.slug) ? '0.9' : '0.8',
      })
    );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticBlocks, ...blogBlocks].join('\n')}
</urlset>
`;

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, xml, 'utf8');

  console.log(`✓ Skrev ${OUTPUT}`);
  console.log(`  - ${staticBlocks.length} statiska rutter`);
  console.log(`  - ${blogBlocks.length} blogginlägg`);
  console.log(`  - Totalt: ${staticBlocks.length + blogBlocks.length} URL:er`);
}

main().catch((err) => {
  console.error('❌ Sitemap-generering misslyckades:', err);
  process.exit(1);
});
