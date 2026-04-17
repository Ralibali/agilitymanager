#!/usr/bin/env node
/**
 * Hämtar alla publicerade blogg-slugs från Supabase och bygger en
 * komplett routes-lista för react-snap. Skriver till package.json's
 * "reactSnap.include"-fält INNAN vite-bygget körs.
 *
 * Körs som första steg i build-pipeline (Vercel build container).
 * Använder anon key (RLS: published=true är public SELECT).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = 'https://rcubbmnosawdtaupixnm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA';

const STATIC_ROUTES = [
  '/',
  '/blogg',
  '/hoopers',
  '/hoopers-regler',
  '/om-agility',
  '/hundforsakring',
  '/integritetspolicy',
  '/cookiepolicy',
];

async function fetchBlogSlugs() {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug&published=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText}`);
  }
  const rows = await res.json();
  return rows.map((r) => r.slug).filter(Boolean);
}

async function main() {
  console.log('🔍 Hämtar publicerade blogg-slugs från Supabase...');
  let blogSlugs = [];
  try {
    blogSlugs = await fetchBlogSlugs();
    console.log(`✅ Hittade ${blogSlugs.length} publicerade artiklar`);
  } catch (err) {
    console.error('⚠️  Kunde inte hämta slugs, faller tillbaka till bara statiska routes:', err.message);
  }

  const blogRoutes = blogSlugs.map((s) => `/blogg/${s}`);
  const allRoutes = [...STATIC_ROUTES, ...blogRoutes];

  // Uppdatera package.json med routes-listan
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkgRaw = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgRaw);

  pkg.reactSnap = {
    ...(pkg.reactSnap ?? {}),
    source: 'dist',
    include: allRoutes,
    puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    skipThirdPartyRequests: true,
    inlineCss: false,
    crawl: false,
    waitFor: 1500,
  };

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`📝 Skrev ${allRoutes.length} routes till package.json (reactSnap.include)`);
  console.log('   Statiska:', STATIC_ROUTES.length);
  console.log('   Blogg:   ', blogRoutes.length);
}

main().catch((err) => {
  console.error('❌ generate-snap-routes failade:', err);
  process.exit(1);
});
