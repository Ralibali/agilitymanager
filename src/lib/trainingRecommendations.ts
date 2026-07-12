/**
 * Ren, regelbaserad rekommendationsmotor för "Dagens pass".
 *
 * Motorn låtsas inte vara AI. Den mappar sport + fokusområden + senaste
 * träningshistorik till ett kort, konkret 10–20-minuters pass med tre steg,
 * utrustning och en pedagogisk motivering. Testbar, deterministisk, ren.
 */

export type RecSport = "Agility" | "Hoopers";

// Fokusområden — mappar 1:1 mot alternativen i onboardingens Personalisering.
export type AgilityFocus =
  | "weaves"
  | "contacts"
  | "starts"
  | "handling_turns"
  | "speed_confidence"
  | "competition_nerves";

export type HoopersFocus =
  | "directing"
  | "distance"
  | "lines_flow"
  | "tunnels"
  | "independence";

export type FocusArea = AgilityFocus | HoopersFocus;

/** Sammanfattning av en tidigare loggad session — endast fält motorn använder. */
export interface TrainingSessionSummary {
  date: string;
  duration_min: number | null;
  obstacles_trained?: string[] | null;
  overall_mood?: number | null;
  tags?: string[] | null;
  notes_good?: string | null;
  notes_improve?: string | null;
}

export interface RecInput {
  sport: RecSport;
  /** 1–2 fokusområden från onboardingen. Första prioriteras. */
  focus: FocusArea[];
  /** Sist loggade sessioner (nyast först). */
  recentSessions?: TrainingSessionSummary[];
  /** Frivilligt "seed" som växlar rotation utan att tappa determinism. */
  variant?: number;
}

/** Förifyllningar till loggningsformuläret när användaren startar från Dagens pass. */
export interface LogDefaults {
  type: string;
  durationMinutes: number;
  obstacles: string[];
  tags: string[];
  focusLabel: string;
}

/**
 * Transient UI/analytics-kontext för Logga pass — t.ex. att sheet:n öppnades
 * från banplaneraren. Sparas INTE i DB och blandar sig inte med defaults/formfält.
 * Kopplingen bana→pass är inte modellerad i schemat idag.
 */
export interface LogContext {
  source: "course-planner";
  courseName: string;
  sport: "Agility" | "Hoopers";
  /** Opak molnid om banan är sparad – används endast för analytics. */
  courseId?: string;
}


export interface EasierAlternative {
  id: string;
  title: string;
  durationMinutes: number;
  reason: string;
  steps: [string, string, string];
  equipment: string[];
  logDefaults: LogDefaults;
}

export interface TrainingRecommendation {
  id: string;
  title: string;
  /** Nyckel — samma som `focusKey`. */
  focus: FocusArea;
  focusLabel: string;
  durationMinutes: number;
  equipment: string[];
  steps: [string, string, string];
  reason: string;
  easierAlternative: EasierAlternative;
  logDefaults: LogDefaults;

  // ── Bakåtkompatibla alias — behåll så äldre call-sites inte bryts.
  focusKey: FocusArea;
  minutes: number;
  why: string;
  alternative: {
    id: string;
    title: string;
    minutes: number;
    why: string;
  };
}

/** Bakåtkompatibelt namn. */
export type Recommendation = TrainingRecommendation;

/** Läsbara etiketter för svenska. */
export const FOCUS_LABELS: Record<FocusArea, string> = {
  weaves: "Slalom",
  contacts: "Kontaktfält",
  starts: "Starter",
  handling_turns: "Handling & vändningar",
  speed_confidence: "Fart & självförtroende",
  competition_nerves: "Tävlingsnervositet",
  directing: "Dirigering",
  distance: "Distans",
  lines_flow: "Linjer & flow",
  tunnels: "Tunnlar",
  independence: "Självständighet",
};

export const AGILITY_FOCUS_KEYS: AgilityFocus[] = [
  "weaves",
  "contacts",
  "starts",
  "handling_turns",
  "speed_confidence",
  "competition_nerves",
];

export const HOOPERS_FOCUS_KEYS: HoopersFocus[] = [
  "directing",
  "distance",
  "lines_flow",
  "tunnels",
  "independence",
];

const FOCUS_SYNONYMS: Record<string, FocusArea> = {
  // engelska
  weaves: "weaves",
  weave: "weaves",
  slalom: "weaves",
  contacts: "contacts",
  contact: "contacts",
  kontakt: "contacts",
  kontaktfält: "contacts",
  starts: "starts",
  start: "starts",
  handling_turns: "handling_turns",
  handling: "handling_turns",
  turns: "handling_turns",
  vändningar: "handling_turns",
  speed_confidence: "speed_confidence",
  speed: "speed_confidence",
  fart: "speed_confidence",
  competition_nerves: "competition_nerves",
  nerves: "competition_nerves",
  nervositet: "competition_nerves",
  directing: "directing",
  dirigering: "directing",
  distance: "distance",
  distans: "distance",
  lines_flow: "lines_flow",
  lines: "lines_flow",
  flow: "lines_flow",
  linjer: "lines_flow",
  tunnels: "tunnels",
  tunnel: "tunnels",
  tunnlar: "tunnels",
  independence: "independence",
  självständighet: "independence",
};

/**
 * Säker normalisering av fokusvärden. Accepterar svenska/engelska etiketter,
 * små bokstavsvariationer och okänt värde (→ null).
 */
export function normalizeFocus(value: string | null | undefined, sport?: RecSport): FocusArea | null {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/\s+/g, "_");
  const hit = FOCUS_SYNONYMS[key];
  if (!hit) return null;
  if (sport === "Agility" && !(AGILITY_FOCUS_KEYS as string[]).includes(hit)) return null;
  if (sport === "Hoopers" && !(HOOPERS_FOCUS_KEYS as string[]).includes(hit)) return null;
  return hit;
}

// ────────────────────────────────────────────────────────────────
// LogDefaults per fokus — används vid pre-fill i loggningsformuläret.
// ────────────────────────────────────────────────────────────────

function baseLogDefaults(focus: FocusArea, minutes: number): LogDefaults {
  const map: Record<FocusArea, { type: string; obstacles: string[]; tags: string[] }> = {
    weaves: { type: "Hinder", obstacles: ["Slalom"], tags: ["Slalom"] },
    contacts: { type: "Kontakt", obstacles: ["A-ram"], tags: ["Kontakt"] },
    starts: { type: "Bana", obstacles: ["Hopp"], tags: [] },
    handling_turns: { type: "Vändning", obstacles: ["Hopp"], tags: [] },
    speed_confidence: { type: "Bana", obstacles: ["Hopp"], tags: ["Snabb"] },
    competition_nerves: { type: "Bana", obstacles: [], tags: ["Fokuserad"] },
    directing: { type: "Dirigering", obstacles: ["Hoop", "Tunnel"], tags: [] },
    distance: { type: "Distans", obstacles: ["Hoop"], tags: ["Distans"] },
    lines_flow: { type: "Bana", obstacles: ["Hoop"], tags: [] },
    tunnels: { type: "Tunnel", obstacles: ["Tunnel"], tags: [] },
    independence: { type: "Dirigering", obstacles: ["Hoop"], tags: [] },
  };
  const m = map[focus];
  return {
    type: m.type,
    durationMinutes: minutes,
    obstacles: m.obstacles,
    tags: m.tags,
    focusLabel: FOCUS_LABELS[focus],
  };
}

// ────────────────────────────────────────────────────────────────
// Templates: ett pass per fokus, med lättare variant som har
// EGNA steg och utrustning.
// ────────────────────────────────────────────────────────────────

interface AltShape {
  title: string;
  minutes: number;
  reason: string;
  steps: [string, string, string];
  equipment: string[];
}

interface Template {
  key: FocusArea;
  variants: Array<{
    title: string;
    minutes: number;
    equipment: string[];
    steps: [string, string, string];
    reason: string;
  }>;
  alternative: AltShape;
}

const TEMPLATES: Record<FocusArea, Template> = {
  // ── Agility ────────────────────────────────────────────────
  weaves: {
    key: "weaves",
    variants: [
      {
        title: "Slalom-ingång från båda sidor",
        minutes: 12,
        equipment: ["6 slalompinnar (eller ledade guider)", "Godis eller leksak"],
        steps: [
          "Sätt hunden 3–4 meter från slalomens ingång, rakt fram. 4–6 upprepningar.",
          "Flytta dig till 45° höger, sedan 45° vänster. 3 reps på varje sida.",
          "Avsluta med två fulla slalom i lugnt tempo. Belöna vid utgång.",
        ],
        reason: "Du valde slalom som fokus, därför börjar vi med en kort ingångsövning från olika vinklar.",
      },
      {
        title: "Slalom + fart ut",
        minutes: 15,
        equipment: ["12 slalompinnar", "Belöningsleksak"],
        steps: [
          "Ladda ut belöning 3 m efter slalomens utgång. Kör 5 fulla reps.",
          "Väx sida vid utgång (höger/vänster) mellan varje rep.",
          "Avsluta med en lugn genomgång utan belöning – bara beröm.",
        ],
        reason: "Slalom är ditt fokus. Den här varianten bygger fart ut ur slalomen genom extern belöning.",
      },
    ],
    alternative: {
      title: "Kort ingångsrep utan hela slalomen",
      minutes: 8,
      reason: "Kortare och enklare variant för dagar då det behövs.",
      steps: [
        "Ställ upp 2–3 pinnar i rak linje.",
        "Kör 5 lugna ingångar med belöning direkt efter sista pinnen.",
        "Avsluta med beröm och en enkel lek.",
      ],
      equipment: ["2–3 slalompinnar", "Godis eller leksak"],
    },
  },
  contacts: {
    key: "contacts",
    variants: [
      {
        title: "Kontaktfält – position och release",
        minutes: 15,
        equipment: ["A-hinder eller gungbräda (låg)", "Matta för position"],
        steps: [
          "5 lugna passager. Stoppa i kontaktfältet på matta, håll 2 sek.",
          "Vary din egen position: vid sidan, framför, bakom hunden.",
          "Avsluta med 1 rep där du släpper till leksak framåt.",
        ],
        reason: "Kontakt är ditt fokus. Vi delar upp problemet: position först, release sedan.",
      },
      {
        title: "Kontaktfält i sekvens",
        minutes: 18,
        equipment: ["A-hinder", "Hopp före", "Hopp efter"],
        steps: [
          "Hopp → A-ram → belöning i kontaktzonen. 3 reps.",
          "Hopp → A-ram → hopp ut. 3 reps, belöning efter utgången.",
          "Filma 1 rep och kolla att hunden verkligen når zonen.",
        ],
        reason: "Sekvensen efterliknar tävlingssituationen och testar om kontakten håller under fart.",
      },
    ],
    alternative: {
      title: "Bara matt-arbete på plan mark",
      minutes: 8,
      reason: "Enkelt positionsarbete utan hinder — sänker svårighetsgraden.",
      steps: [
        "Lägg mattan på plan mark. Belöna hunden för att gå till mattan. 5 reps.",
        "Bygg på med kort distans: skicka hunden till mattan från 2 m. 5 reps.",
        "Håll positionen 2 sekunder innan release. 3 reps.",
      ],
      equipment: ["Matta", "Godis"],
    },
  },
  starts: {
    key: "starts",
    variants: [
      {
        title: "Startlinje – hunden väntar, du släpper",
        minutes: 10,
        equipment: ["1 hopp", "Belöning"],
        steps: [
          "Sitt-stay 2 m från hoppet. Du står bredvid. 3 reps.",
          "Öka avståndet: du går 5 m före hoppet innan release. 3 reps.",
          "Kombinera: du kör över själva startlinjen. 2 reps.",
        ],
        reason: "Du valde starter som fokus. En stabil startlinje ger lugn och trygghet innan första hindret.",
      },
      {
        title: "Start + första hindret snabbt",
        minutes: 12,
        equipment: ["Hopp", "Tunnel", "Belöning"],
        steps: [
          "Start → hopp → belöning. 4 reps med olika distans.",
          "Start → tunnel → belöning. 4 reps.",
          "Avsluta lugnt: 1 rep utan press.",
        ],
        reason: "Bygger fart in i första hindret utan att skynda själva starten.",
      },
    ],
    alternative: {
      title: "Bara sitt-stay-lek",
      minutes: 6,
      reason: "Ren kontroll på stay och release — inga hinder.",
      steps: [
        "Sitt-stay 1 m ifrån dig. Belöna vid release. 4 reps.",
        "Öka distansen: 3 m. 3 reps.",
        "Avsluta med en tydlig belöning för lugn väntan.",
      ],
      equipment: ["Godis eller leksak"],
    },
  },
  handling_turns: {
    key: "handling_turns",
    variants: [
      {
        title: "Front cross på 3 hopp",
        minutes: 15,
        equipment: ["3 hopp i böj", "Belöning"],
        steps: [
          "Kör mönstret utan front cross. Markera hur hunden svänger.",
          "Lägg in en front cross mellan hopp 1 och 2. 4 reps.",
          "Flytta crossen till mellan 2 och 3. 4 reps.",
        ],
        reason: "Du valde vändningar som fokus. Vi renodlar hanterandet utan slalom eller kontakt.",
      },
      {
        title: "Rear cross på 4 hopp",
        minutes: 15,
        equipment: ["4 hopp i mjuk kurva"],
        steps: [
          "Kör mönstret rakt. 2 reps.",
          "Lägg in en rear cross mellan hopp 3 och 4. 4 reps.",
          "Testa båda sidor.",
        ],
        reason: "Rear cross är känsligt för hundens självförtroende — kort och tydlig träning hjälper.",
      },
    ],
    alternative: {
      title: "2-hopp med krok",
      minutes: 8,
      reason: "Bara två hopp med en tydlig sväng emellan — kort och enkelt.",
      steps: [
        "Sätt två hopp i 90°-vinkel. Kör mönstret långsamt. 3 reps.",
        "Lägg in en front cross i vinkeln. 3 reps.",
        "Avsluta med en lugn belöning.",
      ],
      equipment: ["2 hopp", "Belöning"],
    },
  },
  speed_confidence: {
    key: "speed_confidence",
    variants: [
      {
        title: "Rakspår med leksak",
        minutes: 10,
        equipment: ["3 hopp på rak linje", "Belöningsleksak"],
        steps: [
          "Kasta leksaken efter hopp 3, hunden springer efter. 5 reps.",
          "Belöning direkt vid landning – ingen fördröjning.",
          "Avsluta med lugn belöning och beröm.",
        ],
        reason: "Fart och självförtroende är ditt fokus. Rakspår ger belöning framåt utan handling som distraherar.",
      },
      {
        title: "Tunnel-hopp-tunnel för fart",
        minutes: 12,
        equipment: ["Tunnel", "Hopp"],
        steps: [
          "Tunnel → hopp → belöning. 4 reps.",
          "Hopp → tunnel → belöning framifrån. 4 reps.",
          "En rep med extra distans mellan – hunden ska välja tempo själv.",
        ],
        reason: "Tunnlar drar oftast fart hos hunden och färgar hela sekvensen.",
      },
    ],
    alternative: {
      title: "Bara leksakslek utan hinder",
      minutes: 8,
      reason: "Relation och fart utan agility — bra på tunga dagar.",
      steps: [
        "Kasta leksaken kort. Belöna hunden för att komma tillbaka. 4 reps.",
        "Bygg på med en kort sprint efter leksaken. 3 reps.",
        "Avsluta med lugn belöning.",
      ],
      equipment: ["Leksak"],
    },
  },
  competition_nerves: {
    key: "competition_nerves",
    variants: [
      {
        title: "Tävlingsmiljö-simulering",
        minutes: 15,
        equipment: ["Enkel bansekvens (4–5 hinder)"],
        steps: [
          "Gå banan själv 2 gånger. Notera vart du blir stressad.",
          "Kör sekvensen med hunden i lugnt tempo. Belöning efter varje hinder.",
          "Kör sekvensen en gång i vanligt tempo. Belöning bara i mål.",
        ],
        reason: "Nerver kommer av osäkerhet. Kort session där du känner att du kan mönstret sänker pulsen.",
      },
      {
        title: "Kort start + mål-rutin",
        minutes: 10,
        equipment: ["3 hinder", "Leksak/godis vid mål"],
        steps: [
          "Bygg en 3-hinders start. Kör 3 reps.",
          "Kör med en tydlig mål-rutin: berömma → belöna på samma plats.",
          "Repetera precis rutinen inför en (låtsad) domare.",
        ],
        reason: "Rutinen före och efter passet ger tryggheten på tävling.",
      },
    ],
    alternative: {
      title: "Andningspaus + 1 hoppövning",
      minutes: 6,
      reason: "På dagar när nerverna redan känns — bara ett hopp och en långsam belöning.",
      steps: [
        "Andas lugnt i 30 sekunder tillsammans med hunden.",
        "Kör 3 lugna reps över ett hopp med belöning.",
        "Avsluta med en tydlig beröm och avslut.",
      ],
      equipment: ["1 hopp", "Godis"],
    },
  },

  // ── Hoopers ────────────────────────────────────────────────
  directing: {
    key: "directing",
    variants: [
      {
        title: "Dirigering – hoop, tunnel, tunna",
        minutes: 12,
        equipment: ["2 hoopar", "1 tunnel", "1 tunna", "Belöning"],
        steps: [
          "Sätt hunden mellan hindren. Peka ut hoop → belöning. 5 reps.",
          "Peka ut tunnel → belöning. 5 reps.",
          "Blanda 3 hinder i sekvens. 3 reps.",
        ],
        reason: "Dirigering är ditt fokus. Rena signaler byggs genom rena reps med tydlig belöning.",
      },
      {
        title: "Verbal + arm-signal",
        minutes: 15,
        equipment: ["2 hoopar", "1 tunnel"],
        steps: [
          "Träna verbal signal 'hoop' vid ett tydligt val (hoop vs tunnel).",
          "Byt: verbal 'tunnel' vid samma val.",
          "Testa utan att peka – bara verbal.",
        ],
        reason: "Ju renare verbaler, desto längre kan du stå kvar. Fokus på tydlighet, inte distans.",
      },
    ],
    alternative: {
      title: "Bara två val, en verbal",
      minutes: 8,
      reason: "Enklaste möjliga val — för dagar när det behöver kännas enkelt.",
      steps: [
        "Sätt en hoop och en tunnel med 2 m emellan.",
        "Dirigera hunden till hoopet 5 gånger med belöning.",
        "Dirigera hunden till tunneln 5 gånger med belöning.",
      ],
      equipment: ["1 hoop", "1 tunnel"],
    },
  },
  distance: {
    key: "distance",
    variants: [
      {
        title: "Distans till hoop",
        minutes: 12,
        equipment: ["1 hoop", "Belöning"],
        steps: [
          "Stå 2 m från hoopet, dirigera hunden. 5 reps.",
          "Backa till 4 m. 5 reps.",
          "Backa till 6 m – bara om det känns rent.",
        ],
        reason: "Distans är ditt fokus. Vi bygger i små steg — om ett steg fallerar går vi tillbaka utan drama.",
      },
      {
        title: "Distans i sekvens",
        minutes: 15,
        equipment: ["2 hoopar", "1 tunnel"],
        steps: [
          "Kör sekvensen med dig nära. 2 reps.",
          "Stå kvar vid start – låt hunden köra hela sekvensen. 3 reps.",
          "Om det bryts, gå tillbaka en nivå.",
        ],
        reason: "Sekvens-distans är hela poängen med hoopers på tävling.",
      },
    ],
    alternative: {
      title: "1 hoop, 2 meter",
      minutes: 6,
      reason: "Bygg tillbaka självförtroendet med enklast möjliga val.",
      steps: [
        "Stå 2 m från hoopet. Dirigera hunden. Belöna. 5 reps.",
        "Belöna varje gång hunden går rakt igenom.",
        "Avsluta med lugn belöning.",
      ],
      equipment: ["1 hoop", "Godis"],
    },
  },
  lines_flow: {
    key: "lines_flow",
    variants: [
      {
        title: "Ren linje – tre hindergrupper",
        minutes: 12,
        equipment: ["3 hoopar i böj", "Belöning"],
        steps: [
          "Kör linjen långsamt. 3 reps.",
          "Öka tempot. 3 reps.",
          "Belöning bara efter sista hindret.",
        ],
        reason: "Flow är ditt fokus. Kort linje, tydlig utgång.",
      },
      {
        title: "Linje med tunnel-vändning",
        minutes: 15,
        equipment: ["2 hoopar", "1 tunnel", "1 tunna"],
        steps: [
          "Hoop → tunnel → hoop. 4 reps.",
          "Vänd linjen: hoop → tunnel andra sidan → hoop. 4 reps.",
          "Avsluta med lugnt tempo.",
        ],
        reason: "Vändningar bryter flow om de inte tränas separat.",
      },
    ],
    alternative: {
      title: "2 hoopar, ren rak linje",
      minutes: 6,
      reason: "Bara två hoopar — ren linje utan valmoment.",
      steps: [
        "Sätt två hoopar 3 m isär. Kör linjen 5 gånger.",
        "Belöna efter sista hoopet.",
        "Avsluta med lugn belöning.",
      ],
      equipment: ["2 hoopar", "Belöning"],
    },
  },
  tunnels: {
    key: "tunnels",
    variants: [
      {
        title: "Tunnel-val",
        minutes: 12,
        equipment: ["1 tunnel", "1 hoop", "Belöning"],
        steps: [
          "Placera hunden så tunneln är valet. Dirigera → belöning. 5 reps.",
          "Byt så hoopet är valet. 5 reps.",
          "Blanda: dirigera skarpt olika hinder. 3 reps.",
        ],
        reason: "Tunnlar är ditt fokus. Kort renodling av val ger stor effekt.",
      },
      {
        title: "Tunnel + linje efter",
        minutes: 15,
        equipment: ["1 tunnel", "2 hoopar"],
        steps: [
          "Tunnel → hoop rak framåt. 4 reps.",
          "Tunnel → hoop åt sidan. 4 reps.",
          "Blanda – hunden ska läsa sig ut.",
        ],
        reason: "Utgången ur tunneln är där det brukar bli fel på tävling.",
      },
    ],
    alternative: {
      title: "Bara tunnel-igenom",
      minutes: 6,
      reason: "Utan hinder efteråt — för att bara belöna fart igenom tunneln.",
      steps: [
        "Kort tunnel, 2 m. Belöna vid utgång. 5 reps.",
        "Öka tempot. 3 reps.",
        "Avsluta med lugn belöning.",
      ],
      equipment: ["1 tunnel", "Belöning"],
    },
  },
  independence: {
    key: "independence",
    variants: [
      {
        title: "Självständigt val",
        minutes: 12,
        equipment: ["2 hoopar", "1 tunnel"],
        steps: [
          "Stå still. Dirigera hunden. Belöna varje rent val.",
          "Vänta 1 sekund extra med signalen. Låt hunden 'tänka'.",
          "Avsluta med 3 reps där du står helt still.",
        ],
        reason: "Självständighet är ditt fokus. Den byggs av tid, inte av avstånd.",
      },
      {
        title: "Sekvens där du står kvar",
        minutes: 15,
        equipment: ["3 hoopar", "1 tunnel"],
        steps: [
          "Bygg en 4-hinderssekvens.",
          "Kör den med dig nära hunden. 2 reps.",
          "Kör den där du står vid start hela vägen. 3 reps.",
        ],
        reason: "Riktig hoopers är att hunden kan sekvenser utan att du rör dig mycket.",
      },
    ],
    alternative: {
      title: "1 val, tydlig belöning",
      minutes: 6,
      reason: "Enklaste möjliga val — bara belöna att hunden svarade.",
      steps: [
        "Sätt en hoop 2 m ifrån dig. Dirigera. Belöna. 5 reps.",
        "Vänta 1 sekund extra innan signal. 3 reps.",
        "Avsluta med lugn belöning.",
      ],
      equipment: ["1 hoop", "Belöning"],
    },
  },
};

// ────────────────────────────────────────────────────────────────
// Publikt API
// ────────────────────────────────────────────────────────────────

/** Returnerar default-fokus om användaren inte valt något. */
export function defaultFocus(sport: RecSport): FocusArea {
  return sport === "Hoopers" ? "directing" : "weaves";
}

/** Väljer primärt fokus – roterar mellan användarens val om det finns flera. */
export function pickPrimaryFocus(input: RecInput): FocusArea {
  const valid = input.focus.filter((f) =>
    input.sport === "Hoopers"
      ? (HOOPERS_FOCUS_KEYS as string[]).includes(f)
      : (AGILITY_FOCUS_KEYS as string[]).includes(f),
  );
  if (valid.length === 0) return defaultFocus(input.sport);
  if (valid.length === 1) return valid[0];
  const idx = ((input.variant ?? 0) % valid.length + valid.length) % valid.length;
  return valid[idx];
}

/**
 * Om senaste session hade låg mood eller mycket lång duration – välj lättare variant.
 */
export function shouldSuggestLighterVariant(input: RecInput): boolean {
  const last = input.recentSessions?.[0];
  if (!last) return false;
  const mood = last.overall_mood ?? 3;
  const dur = last.duration_min ?? 0;
  return mood <= 2 || dur >= 60;
}

/** Hela rekommendationen. */
export function recommendDailyPlan(input: RecInput): TrainingRecommendation {
  const focus = pickPrimaryFocus(input);
  const template = TEMPLATES[focus];
  const variantIdx =
    ((input.variant ?? 0) % template.variants.length + template.variants.length) %
    template.variants.length;
  const chosen = template.variants[variantIdx];
  const lighter = shouldSuggestLighterVariant(input);
  const alt = template.alternative;

  // Om lättare variant ska användas: använd alternativets EGNA steg + utrustning.
  const active = lighter
    ? {
        title: alt.title,
        minutes: alt.minutes,
        equipment: alt.equipment,
        steps: alt.steps,
        reason: `Senaste passet såg tungt ut, så vi föreslår ett lättare upplägg. ${alt.reason}`,
      }
    : chosen;

  const logDefaults = baseLogDefaults(focus, active.minutes);
  const altLogDefaults = baseLogDefaults(focus, alt.minutes);

  const easierAlternative: EasierAlternative = {
    id: `${focus}-alt`,
    title: alt.title,
    durationMinutes: alt.minutes,
    reason: alt.reason,
    steps: alt.steps,
    equipment: alt.equipment,
    logDefaults: altLogDefaults,
  };

  return {
    id: `${focus}-${variantIdx}${lighter ? "-lite" : ""}`,
    title: active.title,
    focus,
    focusKey: focus,
    focusLabel: FOCUS_LABELS[focus],
    durationMinutes: active.minutes,
    minutes: active.minutes,
    equipment: active.equipment,
    steps: active.steps,
    reason: active.reason,
    why: active.reason,
    easierAlternative,
    alternative: {
      id: easierAlternative.id,
      title: easierAlternative.title,
      minutes: easierAlternative.durationMinutes,
      why: easierAlternative.reason,
    },
    logDefaults,
  };
}

/** Byter till en annan variant (används av "Byt övning"). */
export function swapRecommendation(current: TrainingRecommendation, input: RecInput): TrainingRecommendation {
  return recommendDailyPlan({ ...input, variant: (input.variant ?? 0) + 1 });
}

/**
 * Genererar en kort, ärlig insikt baserat på ett nyligen loggat pass.
 * Regelbaserad — påstår aldrig mer än vad användaren matat in.
 */
export function buildFirstInsight(session: {
  dogName: string;
  focusLabel?: string | null;
  mood: number;
  notesGood?: string | null;
  notesImprove?: string | null;
  obstacles?: string[] | null;
}): string {
  const dog = session.dogName?.trim() || "Din hund";
  const focus = (session.focusLabel ?? session.obstacles?.[0] ?? "träningen").toLowerCase();
  const good = session.notesGood?.trim();
  const improve = session.notesImprove?.trim();

  if (session.mood >= 4) {
    const tail = good ? ` Du noterade: "${good.slice(0, 90)}".` : "";
    return `${dog} kändes stark i ${focus}.${tail}`;
  }
  if (session.mood <= 2) {
    const tail = improve
      ? ` Nästa gång tar vi med: "${improve.slice(0, 90)}".`
      : " Kör ett kortare, enklare pass nästa gång — bygg tillbaka självförtroendet.";
    return `${dog} kämpade lite.${tail}`;
  }
  const tail = improve
    ? ` Nästa gång följer vi upp: "${improve.slice(0, 90)}".`
    : ` Fortsätt med samma fokus (${focus}) och notera vad som ändras.`;
  return `${dog} är i gång.${tail}`;
}
