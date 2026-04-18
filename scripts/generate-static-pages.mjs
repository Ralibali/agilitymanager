#!/usr/bin/env node
/**
 * Statisk HTML-generator för Vercel — utan headless browser.
 *
 * Hämtar publicerade blogg-artiklar från Supabase och bygger en statisk
 * HTML-sida per slug under dist/blogg/<slug>/index.html. Renderar markdown
 * till HTML via 'marked' och injicerar all SEO-metadata (title, meta,
 * canonical, OG, Twitter, JSON-LD Article + Breadcrumb + valfri FAQ) direkt
 * i <head>. Pre-rendered content placeras i <div id="seo-content"> utanför
 * #root så React fortsätter rendera normalt med createRoot, utan
 * hydration-mismatch.
 *
 * Lägger också statiska sidor (/, /blogg, /hoopers, ...) som speglar
 * mall-html med korrekt canonical så de kan deployas på rena URL:er.
 *
 * Körs som postbuild-steg efter `vite build`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const SUPABASE_URL = 'https://rcubbmnosawdtaupixnm.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA';
const SITE_URL = 'https://agilitymanager.se';
const SITE_NAME = 'AgilityManager';
const DIST_DIR = path.resolve(process.cwd(), 'dist');

/** Statiska routes som ska få egen index.html med korrekt canonical/title */
const STATIC_PAGES = [
  {
    route: '/',
    title: 'AgilityManager – Träningsapp för agility och hoopers',
    description:
      'Logga träningspass, följ framsteg och analysera din hund i agility och hoopers. Stöd för SHoK:s officiella klasser och SKK:s regelverk.',
  },
  {
    route: '/blogg',
    title: 'Kunskapsbank – guider om agility och hoopers',
    description:
      'Allt om agility och hoopers: nybörjarguider, träningsupplägg, kontaktfält, slalom, regler och utrustning. Skrivet för svenska hundförare.',
  },
  {
    route: '/hoopers',
    title: 'Hoopers för hund – kom igång med sporten',
    description:
      'Hoopers är en hundsport utan hopp som passar alla raser. Lär dig grunderna, klasserna och hur du börjar träna hoopers i Sverige.',
  },
  {
    route: '/hoopers-regler',
    title: 'Hoopers-regler – SHoK:s officiella regelverk',
    description:
      'Komplett guide till hoopers-regelverket från Svenska Hoopersklubben (SHoK). Klasser, hinder, dirigering och poängberäkning.',
  },
  {
    route: '/om-agility',
    title: 'Om agility – sportens historia, regler och hinder',
    description:
      'Allt om agility: sportens ursprung, SAgiK:s regelverk, hindertyper, klasser och hur du tävlar i Sverige.',
  },
  {
    route: '/hundforsakring',
    title: 'Hundförsäkring för agility-hundar – jämför bolagen',
    description:
      'Vilken hundförsäkring passar en aktiv agility-hund? Vi jämför villkor, ersättning och premier hos de stora bolagen i Sverige.',
  },
  {
    route: '/integritetspolicy',
    title: 'Integritetspolicy',
    description: 'AgilityManagers integritetspolicy enligt GDPR och svensk dataskyddslagstiftning.',
  },
  {
    route: '/cookiepolicy',
    title: 'Cookiepolicy',
    description: 'Information om cookies och spårningstekniker som används på AgilityManager.',
  },
];

// ---------------- Supabase ----------------

async function fetchPublishedPosts() {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,title,excerpt,content,category,read_time,date,author,seo_title,seo_description,updated_at&published=eq.true`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------------- HTML helpers ----------------

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonLd(obj) {
  // Säker inbäddning av JSON-LD i en <script>-tag
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function buildArticleSchema({ post, url }) {
  const seoTitle = (post.seo_title && post.seo_title.trim()) || post.title;
  const seoDesc = (post.seo_description && post.seo_description.trim()) || post.excerpt;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seoTitle.slice(0, 110),
    description: seoDesc,
    image: [`${SITE_URL}/og-default.png`],
    datePublished: post.date,
    dateModified: post.updated_at ?? post.date,
    author: {
      '@type': 'Person',
      name: post.author ?? SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    url,
    articleSection: post.category,
  };
}

function buildBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Bygger den färdiga HTML-strängen för en sida genom att modifiera
 * mall-HTML från dist/index.html. Strategin:
 *  - Byt <title> och <meta name="description">
 *  - Byt canonical
 *  - Lägg till/ersätt OG/Twitter title+desc+url
 *  - Lägg till JSON-LD-skript i <head>
 *  - Injicera pre-rendered content i en <div id="seo-content"> precis efter
 *    <div id="root"> (osynlig för användare, fullt läsbar för crawlers)
 */
function buildPageHtml({
  template,
  title,
  description,
  canonical,
  ogType = 'website',
  jsonLdScripts = [],
  prerenderedBody = '',
}) {
  let html = template;
  const fullTitle = title.endsWith(`| ${SITE_NAME}`) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`;

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);

  // meta description
  html = html.replace(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(description)}" />`,
  );

  // canonical
  html = html.replace(
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );

  // OG title/description/url + type
  html = html.replace(
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${canonicalUrl}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:type"[^>]*>/,
    `<meta property="og:type" content="${ogType}" />`,
  );

  // Twitter title/desc
  html = html.replace(
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );

  // Lägg in extra JSON-LD (artikel + breadcrumb + faq) precis före </head>
  if (jsonLdScripts.length > 0) {
    const scripts = jsonLdScripts
      .map((schema) => `    <script type="application/ld+json">${escapeJsonLd(schema)}</script>`)
      .join('\n');
    html = html.replace('</head>', `${scripts}\n  </head>`);
  }

  // Pre-rendered body, dolt visuellt men crawler-vänligt. Placera precis
  // före <div id="root"> så React-trädet aldrig krockar med vår markup
  // (vi använder inte hydration på prerendered-content, bara för SEO).
  if (prerenderedBody) {
    const seoBlock = `
    <div id="seo-content" aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">
${prerenderedBody}
    </div>`;
    html = html.replace('<div id="root"></div>', `${seoBlock}\n    <div id="root"></div>`);
  }

  return html;
}

// ---------------- Output helpers ----------------

async function writeRoute(routePath, html) {
  // route '/' -> dist/index.html (redan finns; skriv över med ny canonical)
  // route '/blogg' -> dist/blogg/index.html
  // route '/blogg/<slug>' -> dist/blogg/<slug>/index.html
  const cleanRoute = routePath.replace(/^\/+|\/+$/g, '');
  const targetDir = cleanRoute ? path.join(DIST_DIR, cleanRoute) : DIST_DIR;
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, 'index.html'), html, 'utf-8');
}

// ---------------- Main ----------------

async function main() {
  console.log('🏗️  Statisk HTML-generator startar…');

  const templatePath = path.join(DIST_DIR, 'index.html');
  let template;
  try {
    template = await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    console.error('❌ Kunde inte läsa dist/index.html. Har vite build körts?', err.message);
    process.exit(1);
  }

  // 1) Statiska sidor
  console.log(`📄 Genererar ${STATIC_PAGES.length} statiska sidor…`);
  for (const page of STATIC_PAGES) {
    const html = buildPageHtml({
      template,
      title: page.title,
      description: page.description,
      canonical: page.route === '/' ? '/' : page.route,
      ogType: 'website',
    });
    await writeRoute(page.route, html);
    console.log(`   ✓ ${page.route}`);
  }

  // 2) Blogginlägg från Supabase
  let posts = [];
  try {
    posts = await fetchPublishedPosts();
    console.log(`📚 Hämtade ${posts.length} publicerade artiklar från Supabase`);
  } catch (err) {
    console.error('⚠️  Kunde inte hämta blogg-artiklar:', err.message);
    console.error('   Bygget fortsätter, men inga blogg-sidor pre-genereras.');
  }

  for (const post of posts) {
    const route = `/blogg/${post.slug}`;
    const url = `${SITE_URL}${route}`;
    const seoTitle = (post.seo_title && post.seo_title.trim()) || post.title;
    const seoDesc = (post.seo_description && post.seo_description.trim()) || post.excerpt;

    // Markdown → HTML
    const contentHtml = marked.parse(post.content || '', { gfm: true, breaks: false });

    // OBS: seo-content är CSS-gömt (position:absolute;left:-9999px) så
    // navigationen "← Kunskapsbank" som tidigare låg här blev både osynlig
    // för användaren OCH onödig (SPA:n renderar egen header). Vi inkluderar
    // bara <article> med rubrik/excerpt/content så crawlers kan indexera.
    const prerenderedBody = `      <article>
        <header>
          <p>${escapeHtml(post.category)} · ${escapeHtml(post.read_time ?? '')} min läsning</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p>${escapeHtml(post.excerpt)}</p>
          <p>Av ${escapeHtml(post.author ?? SITE_NAME)} · ${escapeHtml(post.date ?? '')}</p>
        </header>
        <div>${contentHtml}</div>
      </article>`;

    const jsonLd = [
      buildArticleSchema({ post, url }),
      buildBreadcrumbSchema([
        { name: 'Hem', url: '/' },
        { name: 'Kunskapsbank', url: '/blogg' },
        { name: post.title, url: route },
      ]),
    ];

    const html = buildPageHtml({
      template,
      title: seoTitle,
      description: seoDesc,
      canonical: route,
      ogType: 'article',
      jsonLdScripts: jsonLd,
      prerenderedBody,
    });
    await writeRoute(route, html);
  }
  console.log(`   ✓ ${posts.length} blogg-sidor skrivna`);

  console.log('✅ Statisk HTML-generering klar');
  console.log(`   Totalt: ${STATIC_PAGES.length + posts.length} sidor under dist/`);
}

main().catch((err) => {
  console.error('❌ generate-static-pages failade:', err);
  process.exit(1);
});
