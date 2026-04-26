# QA-checklista – AgilityManager

Den här checklistan används innan större publiceringar. Målet är att säkerställa att publika sidor, inloggad v3-app, formulär, snabbåtgärder och tomlägen fungerar och känns trovärdiga.

## 1. Automatiska kontroller

Kör lokalt eller via CI:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm run test
npm run build:no-snap
```

För full produktion/build med statiska sidor och sitemap:

```bash
npm run build
```

## 2. Publika sidor

### Startsida `/`
- [ ] Sidan laddar utan inloggning.
- [ ] Primär CTA leder till registrering/inloggning.
- [ ] Sekundär CTA till gratis banplanerare fungerar.
- [ ] Navigationen fungerar på desktop.
- [ ] Mobilmenyn öppnas och stängs.
- [ ] Blogg-länk fungerar.
- [ ] Inget kort eller knapp ser klickbart ut utan att göra något.

### Gratis banplanerare `/banplanerare`
- [ ] Sidan laddar utan inloggning.
- [ ] Det går att lägga till hinder upp till maxgränsen.
- [ ] Maxgränsen visas tydligt när gränsen nås.
- [ ] Det går att välja hinder.
- [ ] Det går att flytta valt hinder med kontrollerna.
- [ ] Det går att rotera valt hinder.
- [ ] Det går att ta bort valt hinder.
- [ ] Återställ demo fungerar.
- [ ] Vattenstämpeln säger exakt: `Skapad med AgilityManager.se`.
- [ ] CTA till konto fungerar.
- [ ] Ingen sparning/export visas som tillgänglig i gratisläget.

### SEO-redirects
- [ ] `/gratis-banplanerare-agility` redirectar till `/banplanerare`.
- [ ] `/agility-bana-ritverktyg` redirectar till `/banplanerare`.

## 3. Auth och routing

### Auth `/auth`
- [ ] Login-formulär visas korrekt.
- [ ] Registreringsläge via `/auth?mode=signup` fungerar.
- [ ] Ej inloggad användare som går till `/v3` skickas till `/auth?redirect=/v3`.
- [ ] Inloggad användare som går till `/auth` skickas till `/v3`.

### Gamla redirects
Kontrollera att gamla skyddade rutter skickar till v3:

- [ ] `/dashboard` → `/v3`
- [ ] `/training` → `/v3/training`
- [ ] `/competition` → `/v3/competition`
- [ ] `/dogs` → `/v3/dogs`
- [ ] `/goals` → `/v3/goals`
- [ ] `/stats` → `/v3/stats`
- [ ] `/health` → `/v3/health`
- [ ] `/settings` → `/v3/settings`

## 4. Inloggad v3-layout

### Sidebar desktop
- [ ] Sidebar visas på desktop.
- [ ] Fäll ihop/expandera fungerar.
- [ ] Läget sparas efter refresh.
- [ ] Logga pass-knappen öppnar träningsloggen.
- [ ] Alla navlänkar går till rätt sida.
- [ ] Admin syns bara för admin.
- [ ] Det finns inga klickbara knappar utan funktion.

### Mobilnavigation
- [ ] Bottom nav visas på mobil.
- [ ] Hem, Träning och Tävlingar fungerar.
- [ ] Plus-knappen öppnar snabbåtgärder.
- [ ] Mer-knappen öppnar Mer-menyn.
- [ ] Mer-menyn kan stängas med X/backdrop/ESC.
- [ ] Alla länkar i Mer-menyn fungerar.

### Snabbåtgärder
- [ ] Logga träningspass öppnar träningsloggen.
- [ ] Lägg till tävling går till `/v3/competition?action=new` och öppnar rätt flöde.
- [ ] Sätt nytt mål går till `/v3/goals?action=new` och öppnar rätt flöde.
- [ ] Hälsanteckning går till `/v3/health?action=new` och öppnar rätt flöde.
- [ ] Lägg till hund går till `/v3/dogs?action=new` och öppnar rätt flöde.
- [ ] Starta tidtagarur går till `/v3/stopwatch`.

## 5. Dashboard `/v3`

### Med hund men utan loggad data
- [ ] Hero-copy känns trovärdig och säger inte att användaren gjort saker som inte finns.
- [ ] Streak = 0 visar kom-igång-copy.
- [ ] Klarade lopp = 0 visar kom-igång/resultat-copy, inte “bra jobbat”.
- [ ] Veckans översikt visar inga fejkade pass.
- [ ] Det finns ingen död “Visa vecka”-knapp.
- [ ] Logga pass öppnar träningsloggen.

### Med befintlig data
- [ ] Hero-copy varierar över tid men är fortfarande relevant.
- [ ] Streak visar rätt värde.
- [ ] Klarade lopp denna månad visar rätt värde.
- [ ] Senaste aktiviteter visas.
- [ ] Nästa upp är relevant och knappar leder rätt.

## 6. Träning `/v3/training`

- [ ] Sidan laddar med aktiv hund.
- [ ] Logga pass öppnar formulär.
- [ ] CSV-knapp är disabled eller visar info när det saknas pass.
- [ ] Periodfilter fungerar.
- [ ] Sportfilter fungerar.
- [ ] Statistikkort uppdateras när filter ändras.
- [ ] Lista visar pass.
- [ ] Tomläge visas korrekt när inga pass finns.
- [ ] Coach-feedback laddar utan att krascha sidan.

## 7. Tävlingar `/v3/competition`

- [ ] Sidan laddar med aktiv hund.
- [ ] Flikarna Kommande, Resultat och Hitta fungerar.
- [ ] Planera tävling öppnar sheet.
- [ ] Logga resultat öppnar sheet.
- [ ] Import från SBK visas och fungerar enligt förväntat flöde.
- [ ] CSV/PDF är disabled eller visar info när det saknas resultat.
- [ ] Resultatlista visar badges för godkänd/disk/ej godkänd.
- [ ] Ta bort resultat fungerar efter bekräftad åtgärd.

## 8. Hundar `/v3/dogs`

- [ ] Sidan laddar.
- [ ] Ny hund öppnar formulär.
- [ ] Det går att skapa hund.
- [ ] Det går att redigera hund.
- [ ] Hundkort visar namn, ålder, ras, sport och nivåer korrekt.
- [ ] Tomläge visas när användaren saknar hundar.
- [ ] `?action=new` öppnar ny-hund-flöde.

## 9. Mål `/v3/goals`

- [ ] Sidan laddar med aktiv hund.
- [ ] Nytt mål öppnar formulär.
- [ ] Det går att skapa mål.
- [ ] Filter Aktiva, Avklarade och Alla fungerar.
- [ ] Markera klart fungerar.
- [ ] Återställ fungerar.
- [ ] Redigera fungerar.
- [ ] Ta bort fungerar.
- [ ] Badges visas utan att låtsas vara upplåsta när de inte är det.
- [ ] `?action=new` öppnar nytt-mål-flöde.

## 10. Statistik `/v3/stats`

- [ ] Sidan laddar med aktiv hund.
- [ ] Diagram laddar utan konsolfel.
- [ ] Tomläge visas rimligt när data saknas.
- [ ] Filter eller tidsperioder fungerar om de finns.
- [ ] Inga siffror presenteras som framgång om värdet är 0.

## 11. Hälsa `/v3/health`

- [ ] Sidan laddar med aktiv hund.
- [ ] Ny hälsologg öppnar formulär.
- [ ] Det går att spara hälsologg.
- [ ] Tomläge visas korrekt.
- [ ] `?action=new` öppnar ny-logg-flöde.

## 12. Coach `/v3/coach`

- [ ] Sidan laddar.
- [ ] Pro/lock-state är tydlig om funktionen inte är gratis.
- [ ] Inga knappar ser aktiva ut om funktionen saknar backend.
- [ ] Eventuella uppladdningsflöden hanterar fel tydligt.

## 13. Kurser `/v3/courses`

- [ ] Sidan laddar.
- [ ] Kurskort visas korrekt.
- [ ] Tomläge fungerar.
- [ ] CTA:er leder till riktig vy eller visas som låsta/kommande.

## 14. Banplanerare inloggad `/v3/course-planner`

- [ ] Sidan laddar.
- [ ] Det går att lägga till/flytta hinder enligt befintligt flöde.
- [ ] Spara/export fungerar om funktionen är aktiv.
- [ ] Om en funktion inte är aktiv ska den vara tydligt låst eller dold.

## 15. Tidtagarur `/v3/stopwatch`

- [ ] Start fungerar.
- [ ] Paus/stopp fungerar.
- [ ] Reset fungerar.
- [ ] Varv/tider sparas eller visas enligt tänkt flöde.

## 16. Inställningar `/v3/settings`

- [ ] Sidan laddar.
- [ ] Profiluppgifter visas.
- [ ] Utloggning fungerar.
- [ ] Plan/uppgradera visas korrekt.
- [ ] Inga dolda adminfunktioner visas för vanlig användare.

## 17. Visuell QA

Kontrollera desktop och mobil:

- [ ] Samma spacing och kortstil på alla v3-sidor.
- [ ] Inga stora mörka block staplas på varandra i onödan.
- [ ] Inga emojis används där de kan se oprofessionella/trasiga ut.
- [ ] Tomlägen känns trovärdiga.
- [ ] Text säger inte “bra jobbat” när användaren inte har data.
- [ ] Inga knappar finns utan funktion.
- [ ] Ingen text kapas på ett fult sätt i vanliga vyer.
- [ ] Allt går att använda på mobil.

## 18. Kritisk release-regel

Publicera inte om något av detta stämmer:

- Build misslyckas.
- Login eller `/v3` misslyckas.
- Snabbåtgärder leder till trasiga flöden.
- En synlig CTA inte gör något.
- Dashboarden visar fejkad positiv feedback för användare utan data.
- Publika startsidan eller `/banplanerare` kraschar.
