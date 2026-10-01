import {readFile,writeFile,mkdir} from 'node:fs/promises';
import ts from 'typescript';
const editorial=JSON.parse(await readFile('src/content/editorial.generated.json','utf8'));
const source=(await readFile('src/content/articles.ts','utf8')).replace('import editorialArticles from "./editorial.generated.json";', `const editorialArticles = ${JSON.stringify(editorial)};`);
const javascript=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {ARTICLES}=await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const template=await readFile('dist/index.html','utf8');
const esc=(v)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=(text)=>esc(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,href)=>`<a href="${href}">${label}</a>`);
for(const a of ARTICLES){
 const canonical=`https://agilitymanager.se/blogg/${a.slug}`;
 const schema=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description:a.description,datePublished:a.publishedAt,dateModified:a.updatedAt,inLanguage:'sv-SE',mainEntityOfPage:canonical,author:{'@type':'Organization',name:'AgilityManager'}}).replace(/</g,'\\u003c');
 let html=template.replace(/<title>[\s\S]*?<\/title>/i,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,'');
 html=html.replace('</head>',`<title>${esc(a.title)} | AgilityManager</title><meta name="description" content="${esc(a.description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.description)}"><meta property="og:url" content="${canonical}"><script type="application/ld+json">${schema}</script></head>`);
 const body=a.blocks.map(b=>b.type==='ul'?`<ul>${b.items.map(t=>`<li>${inline(t)}</li>`).join('')}</ul>`:b.type==='h2'?`<h2>${esc(b.text)}</h2>`:`<p>${inline(b.text)}</p>`).join('');
 html=html.replace('<div id="root"></div>',`<div id="root"><main class="mx-auto max-w-3xl px-6 py-16"><a href="/blogg">Alla artiklar</a><article class="prose"><h1>${esc(a.title)}</h1><p>${esc(a.description)}</p><time datetime="${a.publishedAt}">${a.publishedAt}</time>${body}<h2>${esc(a.cta.heading)}</h2><p>${esc(a.cta.text)}</p><a href="${esc(a.cta.to)}">${esc(a.cta.label)}</a></article></main></div>`);
 await mkdir(`dist/blogg/${a.slug}`,{recursive:true}); await writeFile(`dist/blogg/${a.slug}/index.html`,html);
}
console.log(`Prerendered ${ARTICLES.length} complete blog articles.`);

// Static hosts may ignore redirect configuration. Preserve the complete article
// and its canonical in the first response, with an immediate redirect fallback.
const legacyRedirects = JSON.parse(await readFile('src/content/legacyArticleRedirects.json', 'utf8'));
for (const [from, to] of Object.entries(legacyRedirects)) {
  if (!/^[a-z0-9-]+$/.test(from) || !/^[a-z0-9-]+$/.test(to) || from === to) {
    throw new Error(`Invalid legacy article redirect: ${from}`);
  }
  const articleHtml = await readFile(`dist/blogg/${to}/index.html`, 'utf8');
  if (!articleHtml.includes(`href="https://agilitymanager.se/blogg/${to}"`) || !articleHtml.includes('<h1>')) {
    throw new Error(`Missing complete canonical article for ${from}`);
  }
  const redirectHtml = articleHtml.replace('</head>', `<meta http-equiv="refresh" content="0; url=/blogg/${to}"></head>`);
  await mkdir(`dist/blogg/${from}`, { recursive: true });
  await writeFile(`dist/blogg/${from}/index.html`, redirectHtml);
  await writeFile(`dist/blogg/${from}.html`, redirectHtml);
}
console.log(`Preserved ${Object.keys(legacyRedirects).length} legacy article URLs.`);
