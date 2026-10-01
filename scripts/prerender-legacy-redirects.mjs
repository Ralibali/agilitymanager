// Statiska omdirigeringssidor för gamla adresser (se src/lib/legacyRedirects.ts).
// Hostingen saknar 301-regler, så varje gammal adress får en liten HTML-sida
// med canonical och meta refresh som sökmotorer följer utan JavaScript.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const SITE = "https://agilitymanager.se";
const src = await readFile("src/lib/legacyRedirects.ts", "utf8");
const block = src.slice(src.indexOf("LEGACY_REDIRECTS"), src.indexOf("};", src.indexOf("LEGACY_REDIRECTS")));
const pairs = [...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

for (const [from, to] of pairs) {
  const target = `${SITE}${to}`;
  const html = `<!doctype html><html lang="sv"><head><meta charset="UTF-8"><title>Sidan har flyttat | AgilityManager</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(target)}"><meta http-equiv="refresh" content="0; url=${esc(to)}"><script>location.replace(${JSON.stringify(to)})</script></head><body><p>Sidan har flyttat till <a href="${esc(to)}">${esc(target)}</a>.</p></body></html>`;
  await mkdir(`dist${from}`, { recursive: true });
  await writeFile(`dist${from}/index.html`, html);
}
console.log(`Prerendered ${pairs.length} legacy redirects.`);
