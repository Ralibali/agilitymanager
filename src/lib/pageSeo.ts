// ── SEO för sajtens statiska sidor ─────────────────────────────────────────
// En enda källa för titel, beskrivning, canonical och förrenderad ingress.
// Används både av React-sidorna (<Seo>) och av byggets förrendering, så att
// HTML:en sökmotorer och länkförhandsvisningar läser utan JavaScript alltid
// stämmer med sidan besökaren ser.
import { FIRST_BYTE_ROUTES } from "./firstByteSeo";

export interface StaticPageSeo {
  title: string;
  description: string;
  canonicalPath: string;
  /** Rubrik och ingress i den förrenderade HTML:en. */
  h1: string;
  intro: string;
}

export const PAGE_SEO = {
  home: {
    title: FIRST_BYTE_ROUTES["/"].title,
    description: FIRST_BYTE_ROUTES["/"].description,
    canonicalPath: "/",
    h1: "Hitta tävlingen. Bygg träningen.",
    intro: "AgilityManager samlar banplanerare, tävlingskalender, träning och kunskapsbank för agility och hoopers i Sverige.",
  },
  planner: {
    title: FIRST_BYTE_ROUTES["/banplanerare"].title,
    description: FIRST_BYTE_ROUTES["/banplanerare"].description,
    canonicalPath: "/banplanerare",
    h1: "Banplanerare för agility och hoopers",
    intro: "Rita banor i meterskala med regelkontroll enligt SAgiK, SHoK och FCI, hundens linje, 3D-vy, PDF-export och delningslänkar.",
  },
  features: {
    title: "Funktioner — allt banplaneraren kan | AgilityManager",
    description: "Hindereditor i meterskala, regelkontroll, live banlinje, PDF- och PNG-export, delningslänkar, nivåmärkt banbibliotek och kunskapsbank för agility och hoopers. Gratis, utan konto.",
    canonicalPath: "/funktioner",
    h1: "Allt banplaneraren kan",
    intro: "Från första hindret till färdig domarbana: rita i meterskala, kontrollera mot regelverket, visa hundens väg och dela banan med gruppen.",
  },
  pricing: {
    title: "Priser — banplaneraren är gratis | AgilityManager",
    description: "Banplaneraren för agility och hoopers är gratis: alla hinder, mallar, export, delningslänkar, banbibliotek och tävlingskalender. Inget konto eller kort behövs.",
    canonicalPath: "/priser",
    h1: "Banplaneraren är gratis.",
    intro: "Ingen provperiod, inget konto och inget kort för att rita, exportera och dela banor.",
  },
  courses: {
    title: "Banbibliotek — färdiga banor för agility och hoopers | AgilityManager",
    description: "Färdiga banor för agility, Nollklass och hoopers som klarar planerarens regelkontroll. Öppna direkt i banplaneraren, justera och exportera — gratis utan konto.",
    canonicalPath: "/banor",
    h1: "Banbibliotek",
    intro: "Färdiga banor för svenska klass 1–3, Nollklass och hoopers. Öppna en bana i planeraren och bygg vidare.",
  },
  sharedCourses: {
    title: "Delade banor — banor från communityn | AgilityManager",
    description: "Bläddra bland banor som andra förare delat: agility och hoopers, med betyg och kommentarer. Öppna direkt i banplaneraren och bygg vidare — gratis.",
    canonicalPath: "/delade-banor",
    h1: "Delade banor",
    intro: "Banor som förare och instruktörer har delat publikt. Betygsätt, kommentera och bygg vidare i banplaneraren.",
  },
  results: {
    title: "Resultatlogg för agility och hoopers — meriter och uppflyttning | AgilityManager",
    description: "Logga dina tävlingslopp i agility, hopp och hoopers. Se felfria lopp, placeringar, bästa tider och hur många meriter som återstår till nästa klass. Gratis, utan konto.",
    canonicalPath: "/resultat",
    h1: "Resultatlogg för agility och hoopers",
    intro: "Samla dina lopp, se felfria starter och placeringar och följ hur många meriter som återstår till nästa klass.",
  },
  blog: {
    title: "Blogg & kunskapsbank — agility, hoopers och banbyggande | AgilityManager",
    description: "Guider om agility, hoopers, regler och bandesign på svenska. Lär dig rita säkra träningsbanor, förstå regelverken och planera träningen smartare.",
    canonicalPath: "/blogg",
    h1: "Blogg & kunskapsbank",
    intro: "Guider om bandesign, agility, hoopers och regler — skrivna för svenska förare och klubbar.",
  },
  cookies: {
    title: "Cookies och lokal lagring | AgilityManager",
    description: "Så använder AgilityManager nödvändig lokal lagring och valfri statistik (Google Analytics 4) — och hur du ändrar ditt val.",
    canonicalPath: "/cookies",
    h1: "Cookies och lokal lagring",
    intro: "Vilken lagring som behövs för tjänsten, vad som är valfri statistik och hur du ändrar ditt val.",
  },
} satisfies Record<string, StaticPageSeo>;

/** Bara de fält <Seo> tar emot. */
export function seoProps(page: StaticPageSeo) {
  return { title: page.title, description: page.description, canonicalPath: page.canonicalPath };
}

/** Shared by the rendered home page and its first-byte HTML. Verified identities only. */
export const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://agilitymanager.se/#organization", name: "Aurora Media AB", url: "https://agilitymanager.se/", identifier: "559272-0220" },
    { "@type": "WebSite", "@id": "https://agilitymanager.se/#website", name: "AgilityManager.se", url: "https://agilitymanager.se/", inLanguage: "sv-SE", description: PAGE_SEO.home.description, publisher: { "@id": "https://agilitymanager.se/#organization" } },
  ],
};
