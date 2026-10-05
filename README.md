# AgilityManager

Ett smartare sätt att planera, träna och tävla i agility och hoopers — på svenska.

AgilityManager samlar:

- **Banplaneraren** — rita banor i meterskala med regelkontroll, hundlinje, 3D-vy, PDF/PNG-export och delningslänkar.
  Gratis och utan konto. Fungerar på dator, surfplatta och mobil.
  - Regelkontroll mot SAgiK/SKK 2022–2026 (klass 1–3, hopp, lag och Nollklass), SHoK hoopers och FCI hoopers:
    6–8 m längs hundens väg, hinderantal, start och mål med hopp/hoop, slalom med 12 pinnar, bankant och ansats.
  - Hinder i verklig storlek (balansbom ≈ 10,7 m, A-hinder ≈ 4,2 m) och tunnlar 2–6 m som kan böjas till U.
  - Banbyggarverktyg: numreringsläge (klicka hindren i ordning), flerval med markeringsruta, gruppflytt/-rotation,
    justera och fördela, kopiera/klistra in, piltangenter, egenskapspanel med exakta mått, måttband och avstånd
    mellan hinder längs banan.
- **Banbibliotek & delade banor** — färdiga agility- och hoopersbanor att utgå från.
- **Tävlingskalender** — svenska agility- och hooperstävlingar med filter, favoriter och hundmatchning.
- **Träning** — träningsplaner, historik samt instruktörs- och elevflöden med uppgifter och feedback.
- **Kunskapsbank** — blogg och guider om bandesign, regler och träningsupplägg.
- **Mitt AgilityManager** — konto, banprofil och de personliga ytorna på ett ställe.

## Teknik

- React 19 + TypeScript + Vite 7
- Tailwind CSS 3 + shadcn/ui (Radix)
- React Router 7
- three.js / react-three-fiber (3D-vy), jsPDF (PDF-export)
- Supabase (databas, auth, edge functions) via Lovable Cloud
- Vitest (enhetstester) + Playwright (browserregression)

## Kom igång

```bash
npm install
npm run dev        # http://localhost:3000
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

Regelverken ligger versionerade i `src/features/course-planner-v2/rules/` med
källhänvisning per värde (`verifiedFields`). Regelkontrollen finns i
`validation.ts`; `courseBank.test.ts` kör varje färdig bana i biblioteket genom
den och kräver noll fel och varningar. Hindrens mått hämtas alltid via
`obstacleSize.ts` så att 2D, hundväg, PDF och 3D stämmer överens.
Redigeringslogiken (numrering, flerval, justering, urklipp, avståndsetiketter) ligger
som rena funktioner i `src/features/course-planner-v2/editorOps.ts` och testas både
med Vitest och i webbläsaren (`e2e/planner-tools.e2e.ts`).

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
Titlar och beskrivningar för de statiska sidorna finns i `src/lib/pageSeo.ts`.
Publika routes listas i `src/lib/routes.ts` och genererar `public/sitemap.xml` vid build.
Bygget förrenderar alla publika sidor (egen head, H1 och interna länkar), bloggartiklar
och — när datan kan hämtas — tävlingar, län och klubbar, så att sökmotorer och
länkförhandsvisningar ser rätt innehåll utan JavaScript.
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
