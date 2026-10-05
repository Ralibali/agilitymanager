/**
 * Manifest över sajtens publika, indexerbara routes.
 * Används av scripts/generate-sitemap.mjs för att hålla public/sitemap.xml i
 * sync med verkliga routes. Titlar och beskrivningar finns i src/lib/pageSeo.ts
 * och förrenderas av scripts/prerender-competitions.mjs.
 *
 *  - Indexeras:  routes nedan, bloggartiklar (/blogg/:slug) samt tävlingar,
 *                län och klubbar (förrenderas när tävlingsdatan kan hämtas).
 *  - NOINDEX:    /bana/:id, /mitt-agilitymanager, /traning, /instruktor, /elev,
 *                /tavlingar/favoriter (personliga eller tunna sidor).
 *  - REDIRECT:   /gratis → /priser, /konto, /auth, /logga-in → /mitt-agilitymanager.
 */
export interface PublicRoute {
  path: string;
  priority: number;
  changefreq: "weekly" | "monthly";
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/blogg", priority: 0.9, changefreq: "weekly" },
  { path: "/jamfor-hundforsakring", priority: 0.8, changefreq: "monthly" },
  { path: "/banplanerare", priority: 0.9, changefreq: "monthly" },
  { path: "/banor", priority: 0.8, changefreq: "weekly" },
  { path: "/delade-banor", priority: 0.7, changefreq: "weekly" },
  { path: "/funktioner", priority: 0.6, changefreq: "monthly" },
  { path: "/tavlingar", priority: 0.9, changefreq: "weekly" },
  { path: "/priser", priority: 0.6, changefreq: "monthly" },
  { path: "/resultat", priority: 0.6, changefreq: "monthly" },
  { path: "/klubbar", priority: 0.8, changefreq: "weekly" },
];

export const blogArticlePath = (slug: string) => `/blogg/${slug}`;
