# AgilityManager

Ett smartare sätt att planera, träna och tävla i agility och hoopers — på svenska.

AgilityManager samlar:

- **Banplaneraren** — rita banor i meterskala med regelkontroll, hundlinje, PDF/PNG-export och delningslänkar. Gratis och utan konto.
- **Banbibliotek & delade banor** — färdiga agility- och hoopersbanor att utgå från.
- **Tävlingskalender** — svenska agility- och hooperstävlingar med filter, favoriter och hundmatchning.
- **Träning** — träningsplaner, historik samt instruktörs- och elevflöden med uppgifter och feedback.
- **Kunskapsbank** — blogg och guider om bandesign, regler och träningsupplägg.
- **Mitt AgilityManager** — konto, banprofil och de personliga ytorna på ett ställe.

## Teknik

- React 18 + TypeScript + Vite 5
- Tailwind CSS + shadcn/ui (Radix)
- React Router
- Supabase (databas, auth, edge functions) via Lovable Cloud
- Vitest (enhetstester) + Playwright (browserregression)

## Kom igång

```bash
npm install
npm run dev        # http://localhost:8080
```

### Miljövariabler

Kopiera `.env.example` till `.env` och fyll i värdena för din backend:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Endast publika nycklar används i klienten. Hemligheter hör hemma i backend/edge functions.

## Skript

| Kommando | Gör |
| --- | --- |
| `npm run dev` | Utvecklingsserver med HMR |
| `npm run build` | Typkontroll + produktionsbuild (kör `prebuild`: redaktionell kontroll + sitemap) |
| `npm run preview` | Serverar produktionsbygget lokalt |
| `npm run lint` | ESLint över hela projektet |
| `npm test` | Vitest en gång |
| `npm run test:watch` | Vitest i watch-läge |
| `npm run test:e2e` | Playwright-regression för banplaneraren |
| `npm run editorial:check` | Kontrollerar redaktionellt innehåll |

## Arkitektur i korthet

```
src/
  pages/                  Sidor, en per route
  components/             Navigation, footer, SEO, delade UI-delar
  components/ui/          shadcn/ui-primitiver
  features/
    course-planner-v2/    Banplanerarens editor, geometri, regelverk, PDF, validering
    planner-social/       Banprofil, delning, kommentarer, feedback
    competitions/         Tävlingskalenderns vyer och filter
  lib/                    Domänlogik: tävlingsdata, favoriter, banor, analytics
  content/                Blogg/guider som typad data
supabase/functions/       Edge functions (bl.a. planner-social)
scripts/                  Sitemapgenerering och redaktionella kontroller
e2e/                      Playwright-tester
```

Banplanerarens geometri, PDF-export och validering är känslig kod med egna
regressionstester (`src/features/course-planner-v2/*.test.ts`) — ändra försiktigt.

## Viktiga routes

| Route | Innehåll |
| --- | --- |
| `/` | Startsida |
| `/banplanerare` | Banplaneraren |
| `/banor`, `/delade-banor`, `/bana/:id` | Banbibliotek och delade banor |
| `/tavlingar`, `/tavlingar/:id`, `/tavlingar/favoriter` | Tävlingskalender |
| `/traning`, `/instruktor`, `/elev` | Träning, instruktör och elev |
| `/blogg`, `/blogg/:slug`, `/jamfor-hundforsakring` | Kunskapsbank |
| `/funktioner`, `/priser` | Produkt och priser |
| `/mitt-agilitymanager` | Konto, banprofil och personliga ytor (noindex) |

## SEO

`src/components/Seo.tsx` sätter titel, beskrivning, canonical, OG och JSON-LD per sida.
Publika routes listas i `src/lib/routes.ts` och genererar `public/sitemap.xml` vid build.
Personliga ytor (konto, instruktör, elev, träning, favoriter) är `noindex` och blockeras
i `public/robots.txt`.

## Analys

`src/lib/analytics.ts` skickar produkthändelser till `window.plausible` om en mätsnutt
finns på sidan, annars är anropen tysta no-ops. Ingen extra beroende krävs.

## Deployment

Bygget är statiskt (`dist/`) och driftsätts via Lovable/Vercel (`vercel.json` hanterar
SPA-rewrites). `npm run build` kör typkontroll, sitemapgenerering och produktionsbygge.

## Kvalitet

Kör före varje release:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```
