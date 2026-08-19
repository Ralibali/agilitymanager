# Zoom, panorering och Spara/Öppna i banplaneraren

Två saker: fri zoom på banan (idag bara 100–225 % via knappar, ingen panorering, inget scrollhjul/nyp) och en tydlig meny för att spara banan och öppna den igen efter att du dragit runt hinder.

## 1. Zoom och panorering på banan

- Zoomintervall 25 %–400 % (idag min 100 %) med steg via knappar, `+`/`-`/`0` samt en "Passa skärmen"-knapp.
- Scrollhjul och styrplattans nyp-gest zoomar mot muspekaren/fingrarna, så punkten under pekaren står still. Native icke-passiv wheel-lyssnare (React `onWheel` kan inte blockera sidscroll), skalning med `Math.exp` mot deltamagnitud så trackpad inte slår i taket direkt.
- Nyp med två fingrar på mobil zoomar och panorerar samtidigt.
- Panorering: dra med mellanknapp, mellanslag+drag, eller ett finger på tom yta när inget hinder är valt/placeras. Panorering klampas så banan aldrig försvinner helt ur bild.
- Zoomindikatorn i verktygsraden visar procent och nollställer vid klick; samma zoomknappar läggs även i mobildockan (idag finns de bara på desktop).
- Linjaler, rutnät, springlinje och hinder-träffytor följer med den nya zoom/pan-vyn.

## 2. Meny för Spara och Öppna

Ny knapp "Bana" i headern (och i mobildockan) med:

- **Spara** – sparar aktuell bana under sitt namn. Inloggad: till kontot (moln). Ej inloggad: till en lokal lista i webbläsaren, så det fungerar utan konto.
- **Spara som…** – frågar efter nytt namn och skapar en ny kopia.
- **Öppna bana…** – lista med dina sparade banor (moln + lokala), senast ändrad först, med tidpunkt, hinderantal och sport. Klick laddar banan i planeraren.
- **Ny bana** – tom bana (bekräftelse om osparade ändringar finns).
- Menyn visar sparstatus: "Sparad HH:MM" / "Osparade ändringar", så det syns direkt efter att du dragit hinder.
- Kommandopaletten (Ctrl+K) och kortkommandon Ctrl+S (spara) / Ctrl+O (öppna) kopplas till samma åtgärder.

Autospar av det pågående utkastet behålls som idag, men blir nu tydligt skilt från namngivna sparade banor.

## Teknisk sammanfattning

- `src/pages/PlannerPage.tsx`: byt `zoom`-state mot ett viewport-state (`zoom`, `panX`, `panY`) enligt mönstret i `src/features/course-planner-v2/useCanvasViewport.ts`; viewBox räknas från pan+zoom. Ankarmatematik: `newViewMin = kursPunkt − fraktion × nyBredd`.
- Wheel/pinch: native `addEventListener("wheel", …, { passive: false })` på canvas-wrappern, pekargester via befintliga hjälpare i `gestures.ts`/`gestureMath.ts`; state läses via ref för att undvika stale closure.
- `src/components/course-planner-v2/CanvasRulers.tsx` får pan-medvetna `viewMinXM/viewMinYM` (redan i propsen) — ingen ny prop krävs.
- Ny fil `src/features/course-planner-v2/localCourses.ts` för lokala namngivna banor i localStorage (lista, spara, uppdatera, radera).
- Nytt UI: `src/components/course-planner-v2/CourseMenu.tsx` (dropdown) + öppningsdialog som återanvänder befintlig `CourseLibraryDialog`-lista där det går; molnsparning via befintlig `saveToCloud`/`saved_courses`.
- Inga databasändringar behövs.
