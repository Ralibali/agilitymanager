# 3D-banplanerare och “Gå banan” — 10/10 produktspec

## Målbild

AgilityManager ska ha en banplanerare där användaren först bygger sin bana snabbt i 2D och sedan kan växla till en realistisk 3D-hundhall. I 3D-läget ska användaren kunna inspektera banan, gå banan ur förarperspektiv och exportera/visa banan på ett professionellt sätt.

Det här ska inte vara en gimmick. Det ska kännas som en digital hundhall.

## Viktigaste principen

2D-banplaneraren är fortfarande huvudverktyget för att bygga banan. 3D-läget är ett visualiserings-, analys- och walkthrough-läge som använder exakt samma bandata.

Det får aldrig finnas två separata sanningar för banan.

```ts
type PlannerDocument = {
  id: string;
  title: string;
  sport: 'agility' | 'hoopers';
  arena: ArenaConfig;
  obstacles: ObstacleItem[];
  paths: DrawPath[];
  numbers: NumberItem[];
  measurements: MeasurementItem[];
  createdAt: string;
  updatedAt: string;
};
```

Både 2D-rendering, PDF-export och 3D-rendering ska läsa från samma `PlannerDocument`.

---

## Produktupplevelse

### Primära lägen

Banplaneraren ska ha tre tydliga lägen:

1. **2D** — bygg och redigera banan.
2. **3D** — se banan i realistisk hundhall.
3. **Gå banan** — first-person-läge där användaren går banan i hinderordning.

UI i toppen:

- 2D
- 3D
- Gå banan
- Spara
- Öppna
- Exportera PDF
- Fullskärm

På mobil ska 3D och Gå banan alltid öppnas i fullskärmsläge.

---

## 3D-hallen

### Hallen ska innehålla

- Golv med realistiskt konstgräs/matta.
- Väggar runt hallen.
- Tydlig ljussättning.
- Diskret rutnät/markeringar som kan slås på/av.
- Måttskala.
- Kamera som kan roteras, panoreras och zoomas.
- Hallstorlek från banans inställningar, till exempel 20 × 40 m eller 30 × 40 m.

### Hallinställningar

```ts
type ArenaConfig = {
  widthMeters: number;
  heightMeters: number;
  wallHeightMeters: number;
  surface: 'artificial_turf' | 'sand' | 'rubber' | 'indoor_carpet';
  lighting: 'soft_indoor' | 'competition_bright' | 'training_evening';
  wallStyle: 'light' | 'dark' | 'wood' | 'fabric';
  showGrid: boolean;
  showNumbers: boolean;
  showPath: boolean;
};
```

### Standardvärden

- `surface`: `artificial_turf`
- `lighting`: `competition_bright`
- `wallStyle`: `light`
- `wallHeightMeters`: `3`
- `showGrid`: `true`
- `showNumbers`: `true`
- `showPath`: `true`

---

## Hinder i 3D

Alla hinder som finns i 2D-planeraren ska ha 3D-representation. Inga platta ikoner i 3D-läget.

### Agilityhinder

Följande ska finnas som 3D-modeller:

- Hopp
- Oxer
- Långhopp
- Muren
- Tunnel
- A-hinder
- Balansbom / brygga
- Vippbräda
- Slalom
- Däck
- Start
- Mål

### Hoopershinder

Följande ska finnas som 3D-modeller:

- Hoop
- Hoopers-tunnel
- Tunna
- Staket / gate
- Förarzon
- Start
- Mål

### Modellkrav

Varje hinder ska:

- placeras från samma `x/y` som i 2D.
- roteras från samma `rotation` som i 2D.
- ha tydlig visuell form.
- ha rätt ungefärlig skala i meter.
- ha nummerflagga/nummerbricka om hindret är numrerat.
- kunna markeras i 3D.
- visa tooltip/kort med namn och nummer vid klick.

### Exempel på dimensioner

```ts
type Obstacle3DDimensions = {
  width: number;
  depth: number;
  height: number;
};
```

Rekommenderade startvärden:

| Hinder | Bredd | Djup | Höjd |
|---|---:|---:|---:|
| Hopp | 1.2 m | 0.15 m | 0.7 m |
| Tunnel | 0.8 m | 4.0 m | 0.8 m |
| Slalom | 6.0 m | 0.1 m | 1.0 m |
| A-hinder | 3.0 m | 1.2 m | 1.7 m |
| Balansbom | 4.0 m | 0.4 m | 1.2 m |
| Vipp | 3.6 m | 0.35 m | 0.7 m |
| Däck | 1.0 m | 0.2 m | 1.2 m |
| Hoop | 1.0 m | 0.15 m | 0.9 m |
| Tunna | 0.65 m | 0.65 m | 0.9 m |
| Gate | 1.2 m | 0.15 m | 0.85 m |

Dimensionerna behöver inte vara tävlingsjuridiskt perfekta i MVP, men de ska kännas rimliga och realistiska.

---

## “Gå banan”-läge

Detta är premiumkänslan.

### Funktioner

- Starta vid hinder 1.
- First-person-kamera i förarhöjd.
- Tangentbord på desktop:
  - W/S fram/bak
  - A/D sidled
  - mus för att titta runt
  - Shift för snabbare gång
  - Esc för att lämna läget
- Touch på mobil:
  - vänster joystick: rörelse
  - höger drag: titta runt
  - knapp: nästa hinder
  - knapp: föregående hinder
- Visa nästa hinder med diskret highlight.
- Visa aktuell hinderordning i liten overlay.
- Visa ritad linje/ideal linje som röd linje på golvet.

### Kamera

```ts
type WalkModeCamera = {
  heightMeters: number; // default 1.65
  speedMetersPerSecond: number; // default 2.2
  sprintMultiplier: number; // default 1.7
  startAtObstacleNumber: number; // default 1
};
```

### Overlay i gå-läge

- Titel på banan
- Sport
- Aktuellt hinder, till exempel “Hinder 4: Tunnel”
- Nästa hinder
- Mini-karta uppe till höger
- Avsluta-knapp

---

## 2D till 3D-mappning

### Koordinater

2D-planen använder procentkoordinater 0–100.
3D-hallen använder meter.

```ts
function map2DTo3D(xPercent: number, yPercent: number, arena: ArenaConfig) {
  return {
    x: (xPercent / 100 - 0.5) * arena.widthMeters,
    z: (yPercent / 100 - 0.5) * arena.heightMeters,
    y: 0,
  };
}
```

### Rotation

2D-rotation i grader ska bli Y-rotation i 3D.

```ts
const rotationY = THREE.MathUtils.degToRad(obstacle.rotation);
```

---

## Teknisk rekommendation

### Bibliotek

Rekommenderat:

- `three`
- `@react-three/fiber`
- `@react-three/drei`
- eventuellt `zustand` för planner-state om state växer

### Föreslagen struktur

```txt
src/features/course-planner/
  model/
    plannerTypes.ts
    coordinateMapping.ts
    obstacleDimensions.ts
  2d/
    CoursePlanner2D.tsx
    ObstaclePalette.tsx
    PlannerToolbar.tsx
  3d/
    CoursePlanner3D.tsx
    Arena3D.tsx
    Obstacles3D.tsx
    WalkModeControls.tsx
    MiniMap.tsx
    materials.ts
    obstacleModels/
      Jump3D.tsx
      Tunnel3D.tsx
      Weave3D.tsx
      AFrame3D.tsx
      DogWalk3D.tsx
      Seesaw3D.tsx
      Tire3D.tsx
      Hoop3D.tsx
      Barrel3D.tsx
      Gate3D.tsx
  export/
    exportPlannerPdf.ts
  V3CoursePlannerPage.tsx
```

På sikt bör dagens stora `V3CoursePlannerPageFixed.tsx` brytas upp enligt ovan. Det gör funktionen mycket lättare att kvalitetssäkra.

---

## MVP — första byggbara versionen

MVP ska vara imponerande men inte överbyggd.

### Måste finnas i MVP

- Knapp: `3D` i banplaneraren.
- Knapp: `Gå banan`.
- 3D-hall med golv, väggar och ljus.
- 3D-modeller för alla nuvarande hinder, även om modellerna är byggda av enkla geometrier.
- Placering och rotation ska komma från samma 2D-state.
- Hinder med nummer ska visa nummer i 3D.
- Röd ritad linje ska synas i 3D på golvet.
- Kamera: orbit-kamera i 3D-läge.
- Kamera: first-person i Gå banan-läge.
- Mobil: 3D-läget öppnas i fullskärm med touch-kontroller.
- Fallback: om 3D inte kan laddas ska användaren få ett snyggt meddelande, inte blank skärm.

### Ska inte ingå i MVP

- Import av externa 3D-modeller.
- Videoexport.
- AI-genererad väg.
- Multiplayer.
- Riktig VR.

Det kan komma senare.

---

## Premiumfunktioner efter MVP

- Spara egna hundhallar.
- Välj mellan olika hallar.
- Exportera 3D-bild.
- Exportera 3D-video / walkthrough.
- Visa rekommenderad handling line.
- Visa avstånd mellan hinder.
- Spela upp hinderordningen automatiskt.
- Hundperspektiv.
- Instruktörsläge där coach kan kommentera banan.
- Dela 3D-bana via länk.

---

## Designkrav

### 3D-läge

- Kännas lugnt, realistiskt och premium.
- Inte för mörkt.
- Inte för speligt.
- Hinder ska vara tydliga även på avstånd.
- Nummer måste vara läsbara.
- Kameran ska starta i snygg översiktsvinkel.

### Gå banan

- Minimalt UI.
- Stor avsluta-knapp.
- Nästa hinder ska vara tydligt men inte skrikigt.
- På mobil ska kontrollerna inte täcka nästa hinder.

---

## Prestandakrav

- 3D-läge ska lazy-loadas.
- 2D-banplaneraren får inte bli långsammare.
- Geometrier ska återanvändas med instancing där det är rimligt.
- Skuggor ska vara enkla i MVP.
- Mobil ska ha lägre grafiknivå.

### Acceptanskriterier

- 2D-läge laddar lika snabbt som tidigare.
- 3D-läge öppnas utan blank skärm.
- 3D-läge fungerar med minst 30 hinder.
- Mobil öppnar 3D i fullskärm.
- Gå banan-läget går att lämna med tydlig knapp och Esc på desktop.

---

## Risker

### Risk: 3D gör banplaneraren instabil

Lösning: 3D ska vara lazy-loaded och isolerat i egna komponenter.

### Risk: hinder i 3D matchar inte 2D

Lösning: en gemensam mapping-funktion från 2D till meterkoordinater.

### Risk: mobil blir för tung

Lösning: mobil får enklare material, lägre skuggkvalitet och inga tunga modeller i MVP.

### Risk: användaren fattar inte hur man går banan

Lösning: första gången visas en kort overlay:

- “Dra för att titta runt”
- “Använd joysticken för att gå”
- “Följ nästa markerade hinder”

---

## Exakt Lovable-prompt

Bygg en 3D-visualisering för v3-banplaneraren utan att förstöra befintlig 2D-funktionalitet.

Krav:

1. Lägg till lägesväxlare i banplaneraren: `2D`, `3D`, `Gå banan`.
2. 2D-läget ska fortsätta fungera exakt som nu.
3. 3D-läget ska lazy-loada en ny React Three Fiber-vy.
4. Installera/använd `three`, `@react-three/fiber` och `@react-three/drei`.
5. Skapa en realistisk hundhall med golv, väggar, ljus och kamera.
6. Alla hinder från 2D-state ska renderas som 3D-hinder: hopp, tunnel, slalom, A-hinder, brygga, vipp, däck, hoop, tunna, gate, start och mål.
7. Hinder ska placeras från samma x/y/rotation som i 2D.
8. Hinder med nummer ska visa nummerbricka i 3D.
9. Ritad röd linje från 2D ska visas som röd linje på golvet i 3D.
10. Gå banan-läget ska använda first-person-kamera med desktopkontroller och mobil touchkontroller.
11. På mobil ska 3D och Gå banan öppnas i fullskärm.
12. Om WebGL/3D inte kan laddas ska en snygg fallback visas.
13. Behåll nuvarande PDF-export.
14. Skapa tydlig komponentstruktur under `src/features/course-planner/3d/`.
15. Säkerställ att 2D, 3D och PDF använder samma bandata.

Acceptans:

- Användaren kan bygga en bana i 2D och direkt se samma hinder i 3D.
- Användaren kan klicka “Gå banan” och röra sig i hallen.
- Alla hinder syns i 3D, inte som platta ikoner.
- Mobil fungerar utan att layouten går sönder.
- Ingen blank skärm eller router-error.

---

## Definition of Done

Funktionen är klar när:

- 2D-banplaneraren fungerar som tidigare.
- 3D-läge visar samma bana korrekt.
- Alla hinder har 3D-representation.
- Gå banan-läge fungerar på desktop.
- Mobil har fungerande fullskärmsvy.
- PDF-exporten påverkas inte negativt.
- Inga runtime errors i Lovable preview.
- Användaren förstår direkt hur man växlar mellan 2D, 3D och Gå banan.
