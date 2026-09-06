import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const files = readdirSync('content/editorial/articles').filter(f => f.endsWith('.json')).sort();
const entries = files.map(f => JSON.parse(readFileSync(`content/editorial/articles/${f}`, 'utf8')));
const keys = new Set();
const legacy = readFileSync('src/content/articles.ts', 'utf8');
const fail = message => { throw new Error(message); };
for (const a of entries) {
  if (a.schema_version !== 1 || a.site !== 'agilitymanager' || a.author !== 'ChatGPT' || a.status !== 'ready') fail('Unreviewed article or wrong site');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || legacy.includes(`slug: "${a.slug}"`)) fail('Invalid or duplicate slug');
  if (a.title.length < 15 || a.title.length > 140 || a.description.length < 60 || a.description.length > 180) fail('Invalid metadata');
  if (!['Banbyggande','Hoopers','Regler','Träning','Verktyg'].includes(a.category)) fail('Invalid category');
  if (!a.search_intent || !a.source_urls?.length || !Number.isFinite(Date.parse(a.sources_checked_at))) fail('Research evidence missing');
  for (const date of [a.publishedAt,a.updatedAt,a.sources_checked_at]) if (!Number.isFinite(Date.parse(date)) || Date.parse(date) > Date.now()) fail('Invalid or future date');
  const texts = a.blocks.flatMap(b => b.type === 'ul' ? b.items : [b.text]);
  if (a.blocks.some(b => !['p','h2','ul','callout'].includes(b.type)) || texts.some(t => typeof t !== 'string' || /[<>]/.test(t))) fail('Invalid article blocks');
  const count = texts.join(' ').split(/\s+/).length;
  if (count < 450 || count > 2200 || a.blocks.filter(b => b.type === 'h2').length < 3) fail('Article needs substantive sections');
  for (const source of a.source_urls) if (new URL(source).protocol !== 'https:') fail('Invalid source');
  for (const t of texts) for (const m of t.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const u = new URL(m[1], 'https://agilitymanager.se');
    if (u.protocol !== 'https:' || u.username || u.password || m[1].startsWith('//') || m[1].includes('\\')) fail('Unsafe link');
    if (u.origin !== 'https://agilitymanager.se' && !a.source_urls.includes(u.href)) fail('Unchecked external link');
  }
  if (!/^\/(?!\/)[a-z0-9/_?=&%-]*$/.test(a.cta.to)) fail('Invalid product CTA');
  for (const [kind,value] of Object.entries({slug:a.slug,id:a.content_id,intent:a.search_intent.toLowerCase().trim(),hash:createHash('sha256').update(JSON.stringify(a.blocks)).digest('hex')})) {
    const k = `${kind}:${value}`; if (keys.has(k)) fail(`Duplicate ${kind}`); keys.add(k);
  }
}
const generated = JSON.parse(readFileSync('src/content/editorial.generated.json','utf8'));
if (JSON.stringify(entries) !== JSON.stringify(generated)) fail('Regenerate editorial.generated.json from the reviewed, sorted article files');
console.log(`Editorial check OK: ${entries.length} article(s)`);
