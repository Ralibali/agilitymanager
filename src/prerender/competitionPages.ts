// ── Förrenderade tävlingssidor ─────────────────────────────────────────────
// Bygget skriver en HTML-fil per tävling, län och klubb med riktig titel,
// beskrivning och innehåll, så att sökmotorer ser sidan utan JavaScript.
// React ersätter innehållet i #root när appen startar.
import { buildClubDirectory, groupClubsByCounty } from "@/lib/clubs";
import { dateRange, longDate, monthLabel, type UnifiedCompetition } from "@/lib/competitionData";
import {
  calendarSeo,
  clubSeo,
  clubsSeo,
  competitionSeo,
  countySeo,
  type PageSeo,
} from "@/lib/competitionSeo";
import { slugify } from "@/lib/competitionSlug";
import { SITE_ORIGIN } from "@/lib/firstByteSeo";
import { COUNTIES, countySlug } from "@/lib/swedishCounties";

export interface PrerenderedPage extends PageSeo {
  body: string;
  jsonLd?: Record<string, unknown>;
}

export function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const MAIN = '<main class="mx-auto max-w-5xl space-y-6 px-6 py-16">';
const HOME = '<a href="/">AgilityManager</a>';

function compItem(c: UnifiedCompetition): string {
  const meta = [c.dateStart ? longDate(c.dateStart) : null, c.location, c.club].filter(Boolean).map(esc).join(" · ");
  return `<li><a href="${esc(c.path)}">${esc(c.name)}</a> — ${meta}</li>`;
}

function listByMonth(comps: UnifiedCompetition[]): string {
  const byMonth = new Map<string, UnifiedCompetition[]>();
  for (const c of comps) {
    const key = monthLabel(c.dateStart);
    byMonth.set(key, [...(byMonth.get(key) ?? []), c]);
  }
  return [...byMonth.entries()]
    .map(([month, list]) => `<h2>${esc(month)}</h2><ul>${list.map(compItem).join("")}</ul>`)
    .join("");
}

function itemList(name: string, comps: UnifiedCompetition[]): Record<string, unknown> | undefined {
  if (comps.length === 0) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: comps.slice(0, 25).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: `${SITE_ORIGIN}${c.path}`,
    })),
  };
}

const countyLinks = (exceptSlug?: string) =>
  `<ul>${COUNTIES.filter((c) => c.slug !== exceptSlug)
    .map((c) => `<li><a href="/tavlingar/lan/${c.slug}">Tävlingar i ${esc(c.name)} län</a></li>`)
    .join("")}</ul>`;

function calendarPage(comps: UnifiedCompetition[], now: Date): PrerenderedPage {
  return {
    ...calendarSeo(now),
    body: `${MAIN}${HOME}<h1>Hitta er nästa start.</h1><p>Agility och hoopers över hela landet — med anmälningsstatus, klasser, domare och plats. Uppdateras automatiskt från arrangörernas källor.</p><p><a href="/klubbar">Alla klubbar som arrangerar tävlingar</a></p>${listByMonth(comps)}<h2>Tävlingar per län</h2>${countyLinks()}</main>`,
  };
}

function countyPages(comps: UnifiedCompetition[], now: Date): PrerenderedPage[] {
  return COUNTIES.map((county) => {
    const list = comps.filter((c) => countySlug(c.county) === county.slug);
    const seo = countySeo(county, now);
    const label = `${county.name} län`;
    return {
      ...seo,
      jsonLd: itemList(seo.title, list),
      body: `${MAIN}${HOME}<h1>Agility &amp; hoopers i ${esc(county.name)}.</h1><p>Alla kommande agility- och hooperstävlingar i ${esc(label)} — med datum, klasser, domare och sista anmälningsdag.</p>${
        list.length ? listByMonth(list) : `<p>Inga kommande tävlingar i ${esc(label)} just nu.</p>`
      }<p><a href="/tavlingar">Alla tävlingar i Sverige</a></p><h2>Tävlingar i andra län</h2>${countyLinks(county.slug)}</main>`,
    };
  });
}

function pastList(list: UnifiedCompetition[]): string {
  if (list.length === 0) return "";
  return `<h2>Genomförda tävlingar</h2><ul>${list.slice(0, 30).map(compItem).join("")}</ul>`;
}

function clubPages(comps: UnifiedCompetition[], past: UnifiedCompetition[]): PrerenderedPage[] {
  return buildClubDirectory(comps, past).map((club) => {
    const list = comps.filter((c) => slugify(c.club) === club.slug);
    const previous = past.filter((c) => slugify(c.club) === club.slug);
    const seo = clubSeo(club.name, club.slug);
    const county = club.county
      ? `<p><a href="/tavlingar/lan/${countySlug(club.county)}">Alla tävlingar i ${esc(club.county)} län</a></p>`
      : "";
    return {
      ...seo,
      jsonLd: itemList(seo.title, [...list, ...previous]),
      body: `${MAIN}${HOME}<h1>${esc(club.name)} tävlingar.</h1><p>Kommande agility- och hooperstävlingar arrangerade av ${esc(club.name)} — datum, klasser, domare och sista anmälningsdag.</p><p>Tävlar i: ${esc(club.locations.join(", ") || "okänd ort")}.</p>${
        list.length ? listByMonth(list) : `<p>Inga kommande tävlingar från ${esc(club.name)} just nu.</p>`
      }${pastList(previous)}${county}<p><a href="/klubbar">Alla klubbar</a></p></main>`,
    };
  });
}

function clubsDirectoryPage(comps: UnifiedCompetition[], past: UnifiedCompetition[]): PrerenderedPage {
  const groups = groupClubsByCounty(buildClubDirectory(comps, past));
  return {
    ...clubsSeo(),
    body: `${MAIN}${HOME}<h1>Hitta klubbarna.</h1><p>Alla klubbar som arrangerar agility- och hooperstävlingar, län för län – även de som just nu saknar kommande tävlingar.</p>${groups
      .map(
        ([county, clubs]) =>
          `<h2>${esc(county ? `${county} län` : "Okänt län")}</h2><ul>${clubs
            .map(
              (c) =>
                `<li><a href="/tavlingar/klubb/${c.slug}">${esc(c.name)}</a> — ${
                  c.upcoming > 0
                    ? `${c.upcoming} ${c.upcoming === 1 ? "kommande tävling" : "kommande tävlingar"}`
                    : `${c.past} genomförda senaste året`
                }${c.locations.length ? `, ${esc(c.locations.slice(0, 3).join(", "))}` : ""}</li>`,
            )
            .join("")}</ul>`,
      )
      .join("")}</main>`,
  };
}

function competitionPage(c: UnifiedCompetition, now: Date): PrerenderedPage {
  const seo = competitionSeo(c, now);
  const facts: [string, string][] = [
    ["Arrangör", c.club || "Ej angiven"],
    ["Plats", [c.location, c.county].filter(Boolean).join(" · ") || "Ej angiven"],
    ["Datum", dateRange(c.dateStart, c.dateEnd)],
    ["Sista anmälningsdag", c.registrationCloses ? longDate(c.registrationCloses) : "Ej angiven"],
    ["Klasser", c.classes.join(", ") || "Ej angivna"],
    ["Domare", c.judges.join(", ") || "Ej publicerad"],
    ["Sport", c.sport === "agility" ? "Agility" : "Hoopers"],
  ];
  const clubSlug = slugify(c.club);
  const links = [
    c.sourceUrl ? `<a href="${esc(c.sourceUrl)}" rel="noopener">Till anmälan</a>` : "",
    clubSlug ? `<a href="/tavlingar/klubb/${clubSlug}">Alla tävlingar från ${esc(c.club)}</a>` : "",
    c.county ? `<a href="/tavlingar/lan/${countySlug(c.county)}">Tävlingar i ${esc(c.county)} län</a>` : "",
    '<a href="/tavlingar">Tävlingskalendern</a>',
  ].filter(Boolean);
  return {
    ...seo,
    body: `${MAIN}${HOME}<h1>${esc(c.name)}</h1><p>${esc(seo.description)}</p><dl>${facts
      .map(([k, v]) => `<dt><strong>${k}</strong></dt><dd>${esc(v)}</dd>`)
      .join("")}</dl><ul>${links.map((l) => `<li>${l}</li>`).join("")}</ul></main>`,
  };
}

/**
 * Alla förrenderade tävlingssidor. Genomförda tävlingar (`past`) får egna
 * sidor och håller kvar klubbsidorna, men visas inte i kalendern eller på
 * länssidorna. Tävlingar med ovanliga tecken i adressen hoppas över.
 */
export function buildCompetitionPages(
  comps: UnifiedCompetition[],
  now = new Date(),
  past: UnifiedCompetition[] = [],
): PrerenderedPage[] {
  const seen = new Set<string>();
  const detail = [...comps, ...past].filter((c) => {
    if (!/^\/[a-z0-9/_-]+$/i.test(c.path) || seen.has(c.path)) return false;
    seen.add(c.path);
    return true;
  });
  return [
    calendarPage(comps, now),
    clubsDirectoryPage(comps, past),
    ...countyPages(comps, now),
    ...clubPages(comps, past),
    ...detail.map((c) => competitionPage(c, now)),
  ];
}

/** Byter ut sidans huvudtaggar och lägger innehållet i #root. */
export function renderPage(template: string, page: PrerenderedPage): string {
  const canonical = `${SITE_ORIGIN}${page.canonicalPath}`;
  const jsonLd = page.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  const head = `<title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${esc(canonical)}"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:type" content="website">${jsonLd}`;
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b[^>]*(?:name="(?:description|robots)"|property="og:(?:title|description|url|type)")[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, "")
    .replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
}

/** Sitemap-poster för sidor som inte redan finns i den statiska sitemapen. */
export function sitemapUrls(pages: PrerenderedPage[], existing: string): string {
  return pages
    .map((p) => `${SITE_ORIGIN}${p.canonicalPath}`)
    .filter((url) => !existing.includes(`<loc>${url}</loc>`))
    .map((url) => `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`)
    .join("\n");
}
