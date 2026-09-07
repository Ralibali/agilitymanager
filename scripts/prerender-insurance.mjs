import { readFile, writeFile, mkdir } from "node:fs/promises";

// The same checked product data feeds the visible page and its indexable HTML.
const data = JSON.parse(await readFile("src/content/dog-insurance.json", "utf8"));
const partners = JSON.parse(await readFile("src/content/affiliate-partners.json", "utf8"));
const template = await readFile("dist/index.html", "utf8");
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const path = "/jamfor-hundforsakring";
const title = "Jämför hundförsäkring – villkor för aktiva hundar | AgilityManager";
const canonical = `https://agilitymanager.se${path}`;
const eligible = partners.filter((partner) => {
  if (partner.status !== "approved" || partner.channelId !== "2103592373" || !partner.verifiedAt || !partner.insuranceUrl) return false;
  try {
    return [partner.bannerUrl, partner.insuranceUrl].every((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && url.searchParams.get("as") === "2103592373";
    });
  } catch { return false; }
});
const disclosure = eligible.length ? '<p><strong>Annonsinformation:</strong> Länkar märkta ”Annonslänk” kan ge AgilityManager ersättning om du tecknar försäkring. Ersättningen ändrar inte den alfabetiska ordningen.</p>' : "";
const cards = data.providers.map((provider) => {
  const partner = eligible.find((item) => item.id === provider.id);
  return `<article><h2>${esc(provider.name)}</h2><p>${esc(provider.product)}</p><dl>${[
    ["Veterinärvård", `${provider.veterinary}. ${provider.levels}`],
    ["Självrisk", provider.deductible],
    ["Självriskperiod", provider.period],
    ["Rehabilitering", provider.rehab],
    ["Kontrollera särskilt", provider.check],
  ].map(([label, value]) => `<dt><strong>${label}</strong></dt><dd>${esc(value)}</dd>`).join("")}</dl>${partner ? '<p>Annonslänk</p>' : ""}<p><a href="${esc(partner?.insuranceUrl ?? provider.url)}"${partner ? ' rel="sponsored"' : ""}>Se pris hos ${esc(provider.name)}</a></p><p><a href="${esc(provider.termsUrl)}">Läs ${esc(provider.name)}s information och villkor</a></p></article>`;
}).join("");
const body = `<main class="mx-auto max-w-5xl space-y-6 px-6 py-16"><a href="/">AgilityManager</a><h1>${esc(data.title)}</h1><p>${esc(data.description)}</p><p>Uppgifter kontrollerade <time datetime="${data.checkedAt}">${data.checkedAt}</time>.</p><p>Ett urval av tre aktörer, i alfabetisk ordning. Översikten är ingen rangordning och täcker inte hela marknaden. Du får ett personligt pris direkt hos respektive bolag.</p>${disclosure}${cards}<p>Beloppen är ersättningsgränser, inte garanterade utbetalningar. Självrisk, delbelopp och undantag påverkar ersättningen. Läs bolagets aktuella förköpsinformation, villkor och ditt försäkringsbrev.</p><h2>För dig som tränar och tävlar</h2>${data.checklist.map((item) => `<h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>`).join("")}<h2>Så har vi jämfört</h2><p>Offentlig produktinformation från Lassie, Petson och Svedea, kontrollerad ${data.checkedAt}. Vi jämför inte individuella premier och har inte testat skadehanteringen eller satt egna betyg.</p><ul>${data.providers.map((provider) => `<li><a href="${esc(provider.url)}">Källa: ${esc(provider.name)}</a></li>`).join("")}<li><a href="${esc(data.guideSource)}">Konsumenternas: premie och självrisk</a></li></ul><a href="/banor">Till banbiblioteket</a></main>`;
let html = template.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi, "").replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, "").replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
html = html.replace("</head>", `<title>${esc(title)}</title><meta name="description" content="${esc(data.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(data.description)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"></head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
await mkdir(`dist${path}`, { recursive: true });
await writeFile(`dist${path}/index.html`, html);
console.log("Prerendered dog insurance comparison with checked source data.");
