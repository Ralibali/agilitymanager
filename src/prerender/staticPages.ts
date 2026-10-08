// ── Förrenderade statiska sidor ────────────────────────────────────────────
// Utan förrendering levererades startsidans titel, beskrivning och canonical
// ("/") för t.ex. /funktioner och /blogg tills JavaScript körts. Sökmotorer
// och länkförhandsvisningar som inte kör JS såg då alla sidor som kopior av
// startsidan. Här får varje publik sida sin egen head och ett crawlbart
// innehåll (rubrik, ingress och interna länkar). React ersätter innehållet.
import { ARTICLES } from "@/content/articles";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import { getClassTemplate } from "@/features/course-planner-v2/config";
import { calendarSeo, clubsSeo } from "@/lib/competitionSeo";
import { SITE_ORIGIN } from "@/lib/firstByteSeo";
import { PAGE_SEO, HOME_JSON_LD, type StaticPageSeo } from "@/lib/pageSeo";
import { blogArticlePath } from "@/lib/routes";
import { COUNTIES } from "@/lib/swedishCounties";
import { esc, type PrerenderedPage } from "./competitionPages";

const NAV = `<nav aria-label="Huvudmeny"><a href="/">AgilityManager</a> · <a href="/banplanerare">Banplaneraren</a> · <a href="/tavlingar">Tävlingar</a> · <a href="/banor">Banbibliotek</a> · <a href="/blogg">Blogg</a> · <a href="/funktioner">Funktioner</a></nav>`;

function page(seo: StaticPageSeo, content = "", jsonLd?: Record<string, unknown>): PrerenderedPage {
  return {
    title: seo.title,
    description: seo.description,
    canonicalPath: seo.canonicalPath,
    jsonLd,
    body: `<main class="mx-auto max-w-5xl space-y-6 px-6 py-16">${NAV}<h1>${esc(seo.h1)}</h1><p>${esc(seo.intro)}</p>${content}</main>`,
  };
}

const links = (items: Array<[string, string]>) =>
  `<ul>${items.map(([href, label]) => `<li><a href="${esc(href)}">${esc(label)}</a></li>`).join("")}</ul>`;

function blogPage(): PrerenderedPage {
  const sorted = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const list = `<ul>${sorted
    .map((a) => `<li><a href="${esc(blogArticlePath(a.slug))}">${esc(a.title)}</a> — ${esc(a.description)}</li>`)
    .join("")}</ul>`;
  return page(PAGE_SEO.blog, `<h2>Alla artiklar</h2>${list}`, {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "AgilityManager — blogg & kunskapsbank",
    url: `${SITE_ORIGIN}/blogg`,
    inLanguage: "sv-SE",
    blogPost: sorted.map((a) => ({
      "@type": "BlogPosting",
      headline: a.title,
      description: a.description,
      datePublished: a.publishedAt,
      dateModified: a.updatedAt,
      url: `${SITE_ORIGIN}${blogArticlePath(a.slug)}`,
    })),
  });
}

function coursesPage(): PrerenderedPage {
  const originals = COURSE_BANK.filter((c) => c.bankKind === "original");
  const list = `<ul>${originals
    .map((c) => {
      const level = getClassTemplate(c.classTemplate)?.label ?? "";
      return `<li><a href="/banplanerare?template=${esc(c.key)}">${esc(c.label)}</a>${level ? ` (${esc(level)})` : ""} — ${esc(c.description)}</li>`;
    })
    .join("")}</ul>`;
  return page(PAGE_SEO.courses, `<h2>Färdiga banor</h2>${list}`);
}

function competitionFallbacks(now: Date): PrerenderedPage[] {
  // Ersätts av den fullständiga tävlingsförrenderingen när datan går att hämta.
  const counties = links(COUNTIES.map((c) => [`/tavlingar/lan/${c.slug}`, `Tävlingar i ${c.name} län`]));
  const calendar = calendarSeo(now);
  const clubs = clubsSeo();
  return [
    page({ ...calendar, h1: "Hitta er nästa start.", intro: "Agility- och hooperstävlingar över hela Sverige med anmälningsstatus, klasser, domare och plats." }, `<p><a href="/klubbar">Alla klubbar som arrangerar tävlingar</a></p><h2>Tävlingar per län</h2>${counties}`),
    page({ ...clubs, h1: "Hitta klubbarna.", intro: "Klubbar som arrangerar agility- och hooperstävlingar, län för län." }, `<h2>Tävlingar per län</h2>${counties}`),
  ];
}

export function buildStaticPages(now = new Date()): PrerenderedPage[] {
  return [
    page(PAGE_SEO.home, `<section><h2>Hitta nästa mål</h2><p>Sök bland svenska agility- och hooperstävlingar, filtrera på län och klass och spara favoriter för säsongen.</p><a href="/tavlingar">Hitta nästa tävling</a></section>
      <section><h2>Välj vad ni ska träna</h2><p>Utgå från en färdig agility- eller hoopersbana i banbiblioteket. Justera hinder och linjer för träningsgruppen i banplaneraren.</p><a href="/banor">Välj en träningsbana</a></section>
      <section><h2>Bygg. Analysera. Dela.</h2><p>Rita i meterskala, se hundens linje, exportera banan och dela upplägget. Banplaneraren är gratis utan konto. Konto behövs för synk mellan enheter.</p><a href="/banplanerare">Öppna banplaneraren</a></section>
      <h2>Guider för träning och tävling</h2>${links([...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6).map(a => [blogArticlePath(a.slug), a.title]))}
      ${links([["/priser", "Priser och vad konto ger"], ["/klubbar", "Hitta klubbar"], ["/resultat", "Samla dina resultat"]])}
      <footer>Aurora Media AB · Org.nr 559272-0220 · <a href="/cookies">Integritet och cookies</a></footer>`, HOME_JSON_LD),
    page(PAGE_SEO.planner, links([
      ["/funktioner", "Alla funktioner i banplaneraren"],
      ["/banor", "Färdiga banor att börja från"],
      ["/blogg/regelverk-agility-hoopers-sverige", "Regelverken för agility och hoopers i korthet"],
      ["/blogg/bygga-saker-traningsbana-agility", "Bygg en säker träningsbana"],
    ])),
    page(PAGE_SEO.features, links([
      ["/banplanerare", "Öppna banplaneraren — gratis, utan konto"],
      ["/banor", "Banbibliotek"],
      ["/priser", "Priser"],
    ])),
    page(PAGE_SEO.pricing, links([["/banplanerare", "Börja rita gratis"], ["/funktioner", "Se alla funktioner"]])),
    coursesPage(),
    page(PAGE_SEO.sharedCourses, links([["/banplanerare", "Rita och dela en egen bana"], ["/banor", "Banbibliotek"]])),
    page(PAGE_SEO.results, links([["/tavlingar", "Hitta nästa tävling"], ["/blogg/planera-tavlingssasong-agility", "Planera tävlingssäsongen"]])),
    blogPage(),
    page(PAGE_SEO.cookies),
    ...competitionFallbacks(now),
  ];
}
