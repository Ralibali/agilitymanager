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
  {
    route: '/tavlingar',
    title: 'Agility- och hooperstävlingar i Sverige',
    description:
      'Komplett översikt över kommande agility- och hooperstävlingar i Sverige. Uppdateras dagligen från Agilitydata.se.',
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

async function fetchUpcomingCompetitions() {
  const today = new Date().toISOString().split('T')[0];
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const [agilityRes, hoopersRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/competitions?select=id,competition_name,club_name,location,region,date_start,date_end,classes_agility,classes_hopp,source_url,status&date_start=gte.${today}&order=date_start.asc&limit=500`,
      { headers },
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/hoopers_competitions_public?select=competition_id,competition_name,club_name,location,county,date,classes,source_url,registration_status&date=gte.${today}&order=date.asc&limit=200`,
      { headers },
    ),
  ]);
  const agility = agilityRes.ok ? await agilityRes.json() : [];
  const hoopers = hoopersRes.ok ? await hoopersRes.json() : [];
  const stripHtml = (s) => (s ? String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');
  const a = agility.map((r) => ({
    name: stripHtml(r.competition_name) || 'Tävling',
    club: stripHtml(r.club_name),
    location: stripHtml(r.location),
    region: r.region,
    date_start: r.date_start,
    date_end: r.date_end,
    sport: 'Agility',
    classes: [...(r.classes_agility || []), ...(r.classes_hopp || [])],
    source_url: r.source_url,
  }));
  const h = hoopers.map((r) => ({
    name: stripHtml(r.competition_name) || 'Hooperstävling',
    club: stripHtml(r.club_name),
    location: stripHtml(r.location),
    region: r.county,
    date_start: r.date,
    date_end: null,
    sport: 'Hoopers',
    classes: r.classes || [],
    source_url: r.source_url,
  }));
  return [...a, ...h].sort((x, y) => x.date_start.localeCompare(y.date_start));
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

  // 1) Hämta tävlingar för pre-rendering av /tavlingar
  let competitions = [];
  try {
    competitions = await fetchUpcomingCompetitions();
    console.log(`🏆 Hämtade ${competitions.length} kommande tävlingar`);
  } catch (err) {
    console.error('⚠️  Kunde inte hämta tävlingar:', err.message);
  }

  const buildCompetitionsBody = (items) => {
    if (!items.length) {
      return `      <article>
        <h1>Tävlingar i Sverige</h1>
        <p>Inga kommande tävlingar registrerade just nu.</p>
      </article>`;
    }
    const rows = items
      .slice(0, 300)
      .map((c) => {
        const dateStr = c.date_end && c.date_end !== c.date_start
          ? `${c.date_start} – ${c.date_end}`
          : c.date_start;
        const classes = c.classes.length ? ` (${c.classes.join(', ')})` : '';
        const loc = [c.location, c.region].filter(Boolean).join(', ');
        const link = c.source_url
          ? ` — <a href="${escapeHtml(c.source_url)}" rel="nofollow noopener">Anmäl</a>`
          : '';
        return `<li><strong>${escapeHtml(dateStr)}</strong> · ${escapeHtml(c.sport)} · ${escapeHtml(c.name)} — ${escapeHtml(c.club)}, ${escapeHtml(loc)}${escapeHtml(classes)}${link}</li>`;
      })
      .join('\n        ');
    return `      <article>
        <h1>Tävlingar i Sverige</h1>
        <p>Komplett översikt över ${items.length} kommande agility- och hooperstävlingar i Sverige enligt Agilitydata.se.</p>
        <ul>
        ${rows}
        </ul>
      </article>`;
  };

  // 2) Statiska sidor
  console.log(`📄 Genererar ${STATIC_PAGES.length} statiska sidor…`);
  for (const page of STATIC_PAGES) {
    const isCompetitions = page.route === '/tavlingar';
    const extraJsonLd = isCompetitions
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Tävlingar i Sverige',
            description: page.description,
            url: `${SITE_URL}/tavlingar`,
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
          },
        ]
      : [];
    const html = buildPageHtml({
      template,
      title: page.title,
      description: page.description,
      canonical: page.route === '/' ? '/' : page.route,
      ogType: 'website',
      jsonLdScripts: extraJsonLd,
      prerenderedBody: isCompetitions ? buildCompetitionsBody(competitions) : '',
    });
    await writeRoute(page.route, html);
    console.log(`   ✓ ${page.route}${isCompetitions ? ` (${competitions.length} tävlingar)` : ''}`);
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

  // 3) Tävlingsdetalj-sidor (agility + hoopers) — Fas 2B
  const slugifyComp = (s) => {
    if (!s) return '';
    return String(s).toLowerCase()
      .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
      .replace(/é|è|ê/g, 'e').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  };
  const buildCompSlug = ({ club, name, location, date }) => {
    const parts = [];
    if (club) parts.push(slugifyComp(club));
    else if (name) parts.push(slugifyComp(name));
    if (location) parts.push(slugifyComp(location));
    if (date) parts.push(date.slice(0, 10));
    return parts.filter(Boolean).join('-') || 'tavling';
  };

  let detailCount = 0;
  for (const c of competitions) {
    const isHoopers = c.sport === 'Hoopers';
    const idRaw = c.source_url || c.name; // saknar id i unified-objektet — hämtar separat
    // Vi behöver id, så hämta från råvärden
  }
  // Hämta detalj-data separat för att få id
  try {
    const today = new Date().toISOString().split('T')[0];
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
    const [agRes, hoRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/competitions?select=id,competition_name,club_name,location,region,date_start,date_end,classes_agility,classes_hopp,judges,indoor_outdoor,source_url,fetched_at&date_start=gte.${today}&order=date_start.asc&limit=2000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/hoopers_competitions_public?select=competition_id,competition_name,club_name,location,county,date,classes,source_url,fetched_at&date=gte.${today}&order=date.asc&limit=500`, { headers }),
    ]);
    const ag = agRes.ok ? await agRes.json() : [];
    const ho = hoRes.ok ? await hoRes.json() : [];
    const stripHtml = (s) => (s ? String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '');

    for (const r of ag) {
      const name = stripHtml(r.competition_name) || 'Agilitytävling';
      const club = stripHtml(r.club_name);
      const location = stripHtml(r.location);
      const date = r.date_start
        ? new Date(r.date_start).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      const slug = buildCompSlug({ club, name, location, date: r.date_start });
      const route = `/tavlingar/${encodeURIComponent(r.id)}/${slug}`;
      const allClasses = [...(r.classes_agility || []), ...(r.classes_hopp || [])];
      const title = `${name} – ${club}, ${location} ${date}`.trim();
      const description = `Agilitytävling arrangerad av ${club || 'en svensk klubb'} i ${location || 'Sverige'}${date ? ` den ${date}` : ''}. ${allClasses.length} klasser.`;
      const eventSchema = {
        '@context': 'https://schema.org', '@type': 'SportsEvent',
        name, description, startDate: r.date_start, endDate: r.date_end || r.date_start,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: location || club, address: { '@type': 'PostalAddress', addressLocality: location, addressRegion: r.region, addressCountry: 'SE' } },
        organizer: club ? { '@type': 'Organization', name: club } : undefined,
        sport: 'Agility', url: `${SITE_URL}${route}`,
      };
      const breadcrumb = buildBreadcrumbSchema([
        { name: 'Hem', url: '/' }, { name: 'Tävlingar', url: '/tavlingar' }, { name, url: route },
      ]);
      const judgesHtml = (r.judges || []).map((j) => `<li>${escapeHtml(j)}</li>`).join('');
      const classesHtml = allClasses.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
      const prerenderedBody = `      <article>
        <header>
          <h1>${escapeHtml(name)}</h1>
          <p>Arrangör: ${escapeHtml(club)}</p>
          <p>Datum: ${escapeHtml(date)} · Plats: ${escapeHtml(location)}</p>
        </header>
        ${classesHtml ? `<h2>Klasser</h2><ul>${classesHtml}</ul>` : ''}
        ${judgesHtml ? `<h2>Domare</h2><ul>${judgesHtml}</ul>` : ''}
        ${r.source_url ? `<p><a href="${escapeHtml(r.source_url)}" rel="nofollow noopener">Anmäl via Agilitydata.se</a></p>` : ''}
      </article>`;
      const html = buildPageHtml({
        template, title, description, canonical: route, ogType: 'article',
        jsonLdScripts: [eventSchema, breadcrumb], prerenderedBody,
      });
      await writeRoute(route, html);
      detailCount++;
    }

    for (const r of ho) {
      const name = stripHtml(r.competition_name) || 'Hooperstävling';
      const club = stripHtml(r.club_name);
      const location = stripHtml(r.location);
      const date = r.date
        ? new Date(r.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      const slug = buildCompSlug({ club, name, location, date: r.date });
      const route = `/tavlingar/hoopers/${encodeURIComponent(r.competition_id)}/${slug}`;
      const title = `${name} – Hooperstävling, ${club}, ${location} ${date}`.trim();
      const description = `Hooperstävling arrangerad av ${club || 'en svensk klubb'} i ${location || 'Sverige'}${date ? ` den ${date}` : ''}. ${(r.classes || []).length} klasser.`;
      const eventSchema = {
        '@context': 'https://schema.org', '@type': 'SportsEvent',
        name, description, startDate: r.date,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: { '@type': 'Place', name: location || club, address: { '@type': 'PostalAddress', addressLocality: location, addressRegion: r.county, addressCountry: 'SE' } },
        organizer: club ? { '@type': 'Organization', name: club } : undefined,
        sport: 'Hoopers', url: `${SITE_URL}${route}`,
      };
      const breadcrumb = buildBreadcrumbSchema([
        { name: 'Hem', url: '/' }, { name: 'Tävlingar', url: '/tavlingar' }, { name, url: route },
      ]);
      const classesHtml = (r.classes || []).map((c) => `<li>${escapeHtml(c)}</li>`).join('');
      const prerenderedBody = `      <article>
        <header>
          <h1>${escapeHtml(name)}</h1>
          <p>Arrangör: ${escapeHtml(club)}</p>
          <p>Datum: ${escapeHtml(date)} · Plats: ${escapeHtml(location)}</p>
        </header>
        ${classesHtml ? `<h2>Klasser</h2><ul>${classesHtml}</ul>` : ''}
        ${r.source_url ? `<p><a href="${escapeHtml(r.source_url)}" rel="nofollow noopener">Anmäl via SHoK</a></p>` : ''}
      </article>`;
      const html = buildPageHtml({
        template, title, description, canonical: route, ogType: 'article',
        jsonLdScripts: [eventSchema, breadcrumb], prerenderedBody,
      });
      await writeRoute(route, html);
      detailCount++;
    }
    console.log(`   ✓ ${detailCount} tävlingsdetalj-sidor skrivna`);
  } catch (err) {
    console.error('⚠️  Kunde inte prerender tävlingsdetalj-sidor:', err.message);
  }

  console.log('✅ Statisk HTML-generering klar');
  console.log(`   Totalt: ${STATIC_PAGES.length + posts.length + detailCount} sidor under dist/`);
}

main().catch((err) => {
  console.error('❌ generate-static-pages failade:', err);
  process.exit(1);
});
