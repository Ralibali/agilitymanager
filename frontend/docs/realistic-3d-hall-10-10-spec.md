# Realistisk 3D-hundhall i banplaneraren — 10/10-spec

## Syfte

3D-läget i AgilityManager ska kännas som att användaren kliver in i en riktig agilityhall. Det ska inte kännas som en teknisk WebGL-demo. Målet är en premiumfunktion där användaren kan bygga banan i 2D, öppna exakt samma bana i en realistisk 3D-hall och sedan gå banan i first-person.

## Produktmål

Användaren ska kunna:

1. Välja banstorlek i 2D.
2. Bygga bana med hinder, nummer och ritad linje.
3. Öppna 3D och se en hall med samma mått som vald bana.
4. Se alla hinder på rätt plats, med rätt rotation och nummer.
5. Se väggar, konstgräs, sarg, takbalkar, ljus och väggreklam.
6. Gå banan i first-person på desktop och mobil.

## Grundregel

2D, 3D och PDF ska alltid använda samma bandata. 3D får inte ha en separat bana.

```ts
type PlannerDocument = {
  title: string;
  sport: 'agility' | 'hoopers';
  width: number;
  height: number;
  obstacles: Obstacle[];
  paths: DrawPath[];
  numbers: FreeNumber[];
};
```

## Hallens mått

Hallen ska byggas utifrån användarens valda banstorlek.

Exempel:

- 20 × 40 m i 2D ska bli ett 20 × 40 m golv i 3D.
- 30 × 30 m i 2D ska bli ett 30 × 30 m golv i 3D.
- Väggarna ska alltid ligga precis runt banans yta.
- Måttetiketter ska visa vald bredd och höjd i meter.

### Acceptans

- När användaren byter banstorlek i 2D ska 3D-hallens golv, väggar, kamera och rutnät följa med.
- Hinderplacering ska fortfarande stämma efter storleksbyte.

## Visuell hallkänsla

3D-hallen ska innehålla:

- grönt konstgräs med textur
- ljusa väggar
- låg sarg längs golvet
- takbalkar
- ljusrader i taket
- mjuk ambient light
- tydliga banlinjer/rutnät
- väggreklam
- korrekt skala i förhållande till hinder

### Färg- och materialkänsla

- Golv: grönt konstgräs, flera gröna nyanser, lätt fiberstruktur.
- Väggar: varm ljus beige/grå, inte svart.
- Sarg: mörkare grå/grön sarg längst ner på väggarna.
- Takbalkar: ljusgrå/offwhite.
- Ljusrader: varm vit ton.
- Reklam: vit/beige skylt med grön, mörkblå eller orange accent.

## Väggreklam

Väggreklam ska stärka realism och varumärke utan att bli plottrig.

### Skyltar

Minst 6 skyltar ska finnas:

1. Agilitymanager — Bygg bana · Träna smartare
2. Gå banan i 3D — Se linjerna innan passet
3. Följ utvecklingen — Träning · mål · statistik
4. Agilitymanager — Din digitala hundhall
5. Träna smartare — Planera varje bana
6. Bygg din bana — Exportera PDF och dela

### Placering

- 2 skyltar på främre långväggen.
- 2 skyltar på bakre långväggen.
- 1 skylt på vänster kortvägg.
- 1 skylt på höger kortvägg.

Skyltarna ska sitta på väggarna, inte flyta i luften.

### Acceptans

- Reklamen ska synas i 3D-översikten.
- Texten ska vara läsbar från normal kameravy.
- Skyltarna ska skala med hallens storlek.

## Hinder i 3D

Alla hinder ska renderas som 3D-objekt, inte platta ikoner.

### Agility

- Hopp
- Oxer
- Långhopp
- Muren
- Tunnel
- A-hinder
- Brygga/balans
- Vipp
- Slalom
- Däck
- Start
- Mål

### Hoopers

- Hoop
- Tunnel
- Tunna
- Gate/staket
- Förarzon
- Start
- Mål

### Krav per hinder

Varje hinder ska:

- använda samma x/y-position som 2D.
- använda samma rotation som 2D.
- ha ungefärlig fysisk form och höjd.
- ha tydligt nummer om hindret är numrerat.
- kunna highlightas i Gå banan-läge.

## Kamera

### 3D-översikt

Startkameran ska visa hela hallen direkt.

Rekommenderad logik:

```ts
const overviewCamera = isMobile
  ? [width * 0.48, max(width, height) * 0.48, height * 0.88]
  : [width * 0.58, max(width, height) * 0.52, height * 0.75];
```

Kameran ska:

- starta högt nog för att visa hela banan.
- inte börja inuti vägg eller hinder.
- kunna roteras och zoomas.
- ha ljus scenbakgrund.

### Gå banan

Gå banan ska:

- starta vid hinder 1.
- titta mot nästa hinder.
- använda first-person-kamera.
- visa aktuellt hinder och nästa hinder.
- highlighta aktuellt/nästa hinder.

## Mobilkrav

På mobil ska 3D alltid vara fullskärm.

### Får inte synas i 3D

- appens vanliga bottom-nav
- appens vanliga sidebar
- stora paneler
- Lovable-specifika kontroller är utanför appens ansvar, men appen får inte lägga egen nav ovanpå 3D

### Ska synas

- Avsluta
- 3D/Gå banan-toggle
- eventuell liten hint
- joystick i Gå banan
- sprint-knapp i Gå banan
- pilar för föregående/nästa hinder

### Touchkontroller

- Vänster joystick: rörelse.
- Dra på vyn: titta runt.
- Sprint-knapp: snabbare gång.
- Avsluta-knapp: tillbaka till 2D.

## Prestanda

- 3D ska lazy-loadas.
- 2D ska inte bli långsammare.
- Mobil ska använda lägre dpr än desktop.
- Texturer ska genereras effektivt.
- Inga externa tunga GLB-modeller i första versionen.

## Felhantering

Om WebGL inte fungerar ska appen visa en tydlig fallback:

> 3D-läget kan inte visas. Din enhet eller webbläsare stöder inte WebGL.

Ingen blank skärm.

## QA-checklista

### 2D

- Bygg bana.
- Lägg till 10 hinder.
- Rita röd linje.
- Numrera hinder.
- Exportera PDF.

### 3D

- Öppna 3D.
- Se ljus hall direkt.
- Kontrollera att hallens mått stämmer.
- Kontrollera att väggar finns.
- Kontrollera att reklam syns på väggarna.
- Kontrollera att hinder syns och är placerade rätt.
- Kontrollera att nummer syns.
- Kontrollera att röd linje syns på golvet.

### Gå banan

- Starta Gå banan.
- Kontrollera att kameran startar vid hinder 1.
- Kontrollera att nästa hinder visas.
- Testa pilar för föregående/nästa.
- Testa WASD på desktop.
- Testa joystick på mobil.
- Testa Avsluta.

### Mobil

- iPhone 390 px bredd.
- iPhone 430 px bredd.
- iPad/tablet bredd.
- 3D ska vara fullskärm.
- Ingen app-bottomnav ska synas.

## Definition of Done

Funktionen är klar först när:

- 3D-hallen har korrekt mått från vald bana.
- Hallen har realistisk inomhuskänsla.
- Väggreklam finns och sitter på väggarna.
- Alla hinder renderas i 3D.
- Gå banan fungerar på desktop och mobil.
- 2D och PDF fungerar som innan.
- Ingen blank skärm eller runtime error uppstår.

## Nästa nivå efter denna version

När detta fungerar kan man bygga vidare med:

- valbara halltyper
- egna sponsorloggor
- exportera 3D-bild
- exportera walkthrough-video
- mer detaljerade 3D-modeller
- hundperspektiv
- coach-kommentarer i 3D
