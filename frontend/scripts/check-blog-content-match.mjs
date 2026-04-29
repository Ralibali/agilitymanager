#!/usr/bin/env node
/**
 * CI-check: blog_posts content sanity.
 *
 * Hämtar alla publicerade blogginlägg från Supabase och flaggar inlägg där
 * de första 200 tecknen av `content` inte verkar matcha `slug` + `title`.
 *
 * Bakgrund: vid migration har vi sett fall där fel artikelinnehåll fastnat
 * på fel slug (t.ex. content om "klicker-träning" på slug
 * "hoopers-hund"). Den här checken körs i CI före deploy så att
 * mismatches fångas innan de når produktion.
 *
 * Heuristik:
 *   1. Tokenisera title + slug till nyckelord (>= 4 tecken, rensa
 *      stoppord och vanliga ord).
 *   2. Tokenisera de första 200 tecknen av content (markdown-rensat).
 *   3. Kräv att MINST 1 nyckelord från title eller slug förekommer i
 *      content-prefixet. Inlägg utan match flaggas som mismatch.
 *
 * Exit-koder:
 *   0 = alla OK (eller bara warnings)
 *   1 = en eller flera mismatches → CI failar
 *
 * Kör manuellt:  node scripts/check-blog-content-match.mjs
 * Strikt mode:   node scripts/check-blog-content-match.mjs --strict
 *                (warnings → errors)
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://rcubbmnosawdtaupixnm.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA';

const PREFIX_LENGTH = 200;
const MIN_KEYWORD_LENGTH = 4;
const STRICT = process.argv.includes('--strict');

// Vanliga svenska/engelska ord som inte bidrar till matchning.
const STOPWORDS = new Set([
  'och', 'eller', 'att', 'det', 'den', 'med', 'för', 'från', 'till', 'som',
  'vid', 'när', 'där', 'här', 'inte', 'inom', 'över', 'under', 'mellan',
  'efter', 'före', 'genom', 'utan', 'samt', 'eller', 'sina', 'sitt', 'sin',
  'detta', 'denna', 'dessa', 'dem', 'deras', 'vara', 'blir', 'blev', 'kan',
  'ska', 'skall', 'skulle', 'man', 'mig', 'dig', 'sig', 'oss', 'ert', 'era',
  'guide', 'guiden', 'allt', 'alla', 'mer', 'mest', 'mycket', 'lite',
  'this', 'that', 'with', 'from', 'have', 'will', 'your', 'about',
]);

/** Markdown → ren text: ta bort headings, länkar, formatering, kodblock. */
function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')           // kodblock
    .replace(/`[^`]*`/g, ' ')                  // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')     // bilder
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // länkar → linktext
    .replace(/^#{1,6}\s+/gm, '')               // headings
    .replace(/[*_~>#-]/g, ' ')                 // formatering
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokenisera till lowercased nyckelord >= MIN_KEYWORD_LENGTH, exkl. stoppord. */
function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/[\s-]+/)
      .filter((w) => w.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(w)),
  );
}

async function fetchPublishedPosts() {
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=id,slug,title,content&published=eq.true&order=date.desc`;
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

function checkPost(post) {
  const titleTokens = tokenize(post.title);
  const slugTokens = tokenize(post.slug.replace(/-/g, ' '));
  const expected = new Set([...titleTokens, ...slugTokens]);

  if (expected.size === 0) {
    return { status: 'warn', reason: 'inga indexbara nyckelord i title/slug' };
  }

  const prefix = stripMarkdown(post.content || '').slice(0, PREFIX_LENGTH);
  if (prefix.length < 30) {
    return { status: 'warn', reason: `content för kort (${prefix.length} tecken)` };
  }

  const prefixTokens = tokenize(prefix);
  const matches = [...expected].filter((t) => prefixTokens.has(t));

  if (matches.length === 0) {
    return {
      status: 'error',
      reason: 'inga nyckelord från title/slug i content-prefix',
      expected: [...expected].slice(0, 6),
      preview: prefix.slice(0, 120),
    };
  }
  return { status: 'ok', matches };
}

async function main() {
  console.log('🔍 Kontrollerar blog_posts content-matchning…');
  const posts = await fetchPublishedPosts();
  console.log(`   Hämtade ${posts.length} publicerade inlägg`);

  let errors = 0;
  let warnings = 0;

  for (const post of posts) {
    const result = checkPost(post);
    if (result.status === 'ok') continue;

    if (result.status === 'error') {
      errors++;
      console.error(`\n❌ MISMATCH  /${post.slug}`);
      console.error(`   Title:    ${post.title}`);
      console.error(`   Reason:   ${result.reason}`);
      console.error(`   Expected: ${result.expected.join(', ')}`);
      console.error(`   Preview:  "${result.preview}…"`);
    } else {
      warnings++;
      console.warn(`\n⚠️  WARNING  /${post.slug} — ${result.reason}`);
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`Totalt: ${posts.length} inlägg, ${errors} mismatches, ${warnings} warnings`);

  if (errors > 0 || (STRICT && warnings > 0)) {
    console.error('\n💥 Content-check misslyckades — fixa innan deploy.');
    process.exit(1);
  }
  console.log('✅ Alla inlägg ser ut att matcha sin slug + title.\n');
}

main().catch((err) => {
  console.error('💥 Content-check kraschade:', err);
  process.exit(1);
});
