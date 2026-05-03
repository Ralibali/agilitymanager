# AgilityManager

AgilityManager är en svensk webbapp för agility- och hoopersförare. Produkten samlar träningslogg, banplanerare, mål, tävlingskalender, resultat, hundprofiler, hälsa, klubbar och coachning i ett mobilanpassat gränssnitt.

Målet med repot är att kännas som en riktig produkt: snabbt, stabilt, SEO-vänligt, lätt att vidareutveckla och tydligt för både användare och utvecklare.

## Produktfokus

- **Mobil först:** alla viktiga flöden ska vara läsbara, tryckvänliga och utan horisontell scroll på små skärmar.
- **Publik SEO:** startsida, blogg, raser, hoopers, agilityinformation, banplanerare och tävlingssidor ska kunna indexeras korrekt.
- **Appupplevelse:** inloggade användare ska snabbt kunna logga pass, följa hundar, planera banor och analysera utveckling.
- **Trovärdighet:** tydlig metadata, canonical, sitemap, robots, 404, datakällor och ansvarsfriskrivningar.
- **Prestanda:** Vite-baserad build, lazy loading av tunga app-sidor och cache headers för statiska assets.

## Teknik

- React 18
- TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/ui + Radix UI
- Supabase
- TanStack Query
- react-helmet-async för SEO-metadata
- Vitest för tester
- Vercel-konfiguration för headers, rewrites och redirects

## Kom igång lokalt

```bash
npm install
npm run dev
```

Öppna sedan den lokala Vite-adressen som visas i terminalen.

## Viktiga scripts

```bash
npm run dev          # Startar lokal utvecklingsserver
npm run build        # Produktionsbuild + statiska sidor + sitemap
npm run build:no-snap # Endast Vite-build
npm run lint         # ESLint
npm run test         # Vitest
npm run preview      # Förhandsgranska produktionsbuild lokalt
```

## Struktur på hög nivå

```text
src/
  components/        Återanvändbara UI-, landing-, app- och SEO-komponenter
  contexts/          Autentisering och global app-state
  lib/               Hjälpfunktioner, analytics, motion, utilities
  pages/             Publika sidor, auth-sidor och app-sidor
  pages/v3/          Inloggad produktupplevelse
  styles/            Globala polish- och hardening-lager
scripts/             Build-, sitemap- och innehållskontroller
public/              Robots, manifest, ikoner, OG-assets och genererade sitemaps
```

## Routing och SEO

Publika routes hanteras i React Router och viktiga legacy-URL:er fångas även i `vercel.json` så att gamla länkar kan redirectas innan React laddas. Gemensam SEO-logik finns i `src/components/SEO.tsx` och ska användas för publika sidor som behöver title, meta description, canonical, Open Graph, Twitter Cards och JSON-LD.

Sitemap genereras via:

```bash
node scripts/generate-sitemap.mjs
```

Robots-regler finns i `public/robots.txt`.

## Kvalitetskrav innan deploy

Kör minst:

```bash
npm run lint
npm run test
npm run build
```

Kontrollera därefter manuellt:

- startsidan på mobil och desktop
- auth-flöde
- 404-sida
- publika SEO-sidor, särskilt `/`, `/blogg`, `/banplanerare`, `/tavlingar`, `/raser` och `/hoopers`
- att sitemap och robots exponeras korrekt i produktion
- att viktiga redirects fungerar via Vercel

## Deployment

Projektet är förberett för Vercel med `vercel.json`:

- `npm run build` som build-kommando
- `dist` som output
- SPA-rewrite till `index.html`
- cache headers för assets och sitemap
- security headers
- legacy redirects för SEO och gamla app-routes

## Kodprinciper

- Skriv mobile-first CSS och undvik horisontell overflow.
- Använd gemensamma komponenter och tokens innan nya engångslösningar skapas.
- Lägg inte publik SEO direkt i många separata Helmet-block om `SEO`-komponenten täcker behovet.
- Behåll befintliga användarflöden vid refaktorering.
- Undvik TODO-kommentarer som ersätter riktig implementation.
- Gör små, tydliga commits med verifierbara ändringar.
