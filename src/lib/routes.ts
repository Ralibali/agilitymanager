/**
 * Manifest över sajten publika, indexerbara routes.
 * Används av nav/SEO-arbete och av scripts/generate-sitemap.mjs
 * för att hålla public/sitemap.xml i sync med verkliga routes.
 *
 * Routeschema (scope: blogg/kunskap + banplanerare):
 *  - KEEP:     /, /funktioner, /blogg, /blogg/:slug, /banplanerare, /banor, /delade-banor
 *  - NOINDEX:  /bana/:id (dynamiskt/tunt innehåll, undvik massindexering)
 *  - REDIRECT: /priser, /gratis -> /banplanerare (pricing out of scope)
 *              /tavlingar/* -> / (tävling out of scope)
 *              /auth, /logga-in -> /banplanerare (auth-ytor out of scope)
 */
export interface PublicRoute {
  path: string;
  priority: number;
  changefreq: "weekly" | "monthly";
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },
  { path: "/blogg", priority: 0.9, changefreq: "weekly" },
  { path: "/banplanerare", priority: 0.9, changefreq: "monthly" },
  { path: "/banor", priority: 0.8, changefreq: "weekly" },
  { path: "/delade-banor", priority: 0.7, changefreq: "weekly" },
  { path: "/funktioner", priority: 0.6, changefreq: "monthly" },
];

export const blogArticlePath = (slug: string) => `/blogg/${slug}`;
