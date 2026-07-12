/**
 * Ren, regelbaserad rekommendationsmotor för "Dagens pass".
 *
 * Motorn låtsas inte vara AI. Den mappar sport + fokusområden + senaste
 * träningshistorik till ett kort, konkret 10–20-minuters pass med tre steg,
 * utrustning och en tydlig motivering. Testbar, deterministisk, ren.
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

export interface RecInput {
  sport: RecSport;
  /** 1–2 fokusområden från onboardingen. Första prioriteras. */
  focus: FocusArea[];
  /** Sist loggade sessioner (nyast först). Endast fält vi använder. */
  recentSessions?: Array<{
    date: string;
    duration_min: number | null;
    obstacles_trained?: string[] | null;
    overall_mood?: number | null;
    tags?: string[] | null;
  }>;
  /** Frivilligt "seed" som växlar rotation utan att tappa determinism. */
  variant?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  focusLabel: string;
  focusKey: FocusArea;
  minutes: number;
  equipment: string[];
  steps: [string, string, string];
  why: string;
  alternative: {
    id: string;
    title: string;
    minutes: number;
    why: string;
  };
}

/** Läsbara etiketter för svenska. */
export const FOCUS_LABELS: Record<FocusArea, string> = {
  // Agility
  weaves: "Slalom",
  contacts: "Kontaktfält",
  starts: "Starter",
  handling_turns: "Handling & vändningar",
  speed_confidence: "Fart & självförtroende",
  competition_nerves: "Tävlingsnervositet",
  // Hoopers
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

// ────────────────────────────────────────────────────────────────
// Templates: ett pass per fokus. Två varianter per fokus växlas via "variant".
// Extremt pragmatiskt – uppdateras när vi lär oss mer om användarna.
// ────────────────────────────────────────────────────────────────

interface Template {
  key: FocusArea;
  variants: Array<{
    title: string;
    minutes: number;
    equipment: string[];
    steps: [string, string, string];
    why: string;
  }>;
  alternative: {
    title: string;
    minutes: number;
    why: string;
  };
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
        why: "Slalomingången är den enskilt vanligaste feltyp i K1–K2. Kort session med tydlig belöning fäster mönstret.",
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
        why: "Fart ut ur slalom är svårt att träna på plats. Extern belöning drar ut hunden framåt.",
      },
    ],
    alternative: {
      title: "Kort ingångsrep utan hela slalomen",
      minutes: 8,
      why: "Om hunden känns trött eller osäker – bara 2–3 pinnar och belöning direkt.",
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
        why: "Konsekvent kontakt kräver att hunden kan hålla position oavsett vad du gör. Delar upp problemet till hanterbara steg.",
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
        why: "Kontakt i sekvens är närmare tävlingssituationen än isolerad kontaktträning.",
      },
    ],
    alternative: {
      title: "Bara matt-arbete på plan mark",
      minutes: 8,
      why: "Kort mattfokus utan hinder – lugnar hunden och sätter positionen inför nästa pass.",
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
        why: "En stabil startlinje är gratis säkerhet på tävling. Kort och tydlig, byggd på lugn.",
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
        why: "Bygger fart in i första hindret utan att skynda i själva starten.",
      },
    ],
    alternative: {
      title: "Bara sitt-stay-lek",
      minutes: 6,
      why: "Utan hinder – bara kontroll på stay och release.",
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
        why: "Vändningar avgör tider på tävling. Renodlar hanterandet utan slalom eller kontakt.",
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
        why: "Rear cross är mest känsligt för hundens självförtroende – kort och tydlig träning betalar.",
      },
    ],
    alternative: {
      title: "2-hopp med krok",
      minutes: 8,
      why: "Bara två hopp med en tydlig sväng emellan – för dagar med kort tid.",
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
        why: "Fart byggs av att hunden känner att det lönar sig framåt. Ingen handling som distraherar.",
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
        why: "Tunnlar drar oftast fart hos hunden och färgar hela sekvensen.",
      },
    ],
    alternative: {
      title: "Bara leksakslek utan hinder",
      minutes: 8,
      why: "Relation och fart utan agility – bra på tunga dagar.",
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
        why: "Nerver kommer av osäkerhet. Kort session där du känner att du kan mönstret sänker pulsen på riktigt.",
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
        why: "Rutinen före och efter passet ger tryggheten på tävling – inte antalet reps.",
      },
    ],
    alternative: {
      title: "Andningspaus + 1 hoppövning",
      minutes: 6,
      why: "På dagar när nerverna redan känns – bara ett hopp och en långsam belöning.",
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
        why: "Dirigering är kärnan i hoopers. Rena signaler byggs genom rena reps med tydlig belöning.",
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
        why: "Ju renare verbaler, desto längre kan du stå kvar. Fokus på tydlighet, inte distans.",
      },
    ],
    alternative: {
      title: "Bara två val, en verbal",
      minutes: 8,
      why: "Enklaste möjliga val – för dagar när det behöver kännas enkelt.",
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
        why: "Distans byggs i små steg. Om ett steg fallerar: gå tillbaka utan drama.",
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
        why: "Sekvens-distans är hela poängen med hoopers på tävling.",
      },
    ],
    alternative: {
      title: "1 hoop, 2 meter",
      minutes: 6,
      why: "Bygg tillbaka självförtroendet med enklast möjliga val.",
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
        why: "Flow är att hunden vet var linjen slutar. Kort linje, tydlig utgång.",
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
        why: "Vändningar bryter flow om de inte tränas separat.",
      },
    ],
    alternative: {
      title: "2 hoopar, ren rak linje",
      minutes: 6,
      why: "Bara två hoopar – ren linje utan valmoment.",
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
        why: "Tunnlar drar hunden ur linjen om valet inte tränas. Kort renodling ger stor effekt.",
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
        why: "Utgången ur tunneln är där det brukar bli fel på tävling.",
      },
    ],
    alternative: {
      title: "Bara tunnel-igenom",
      minutes: 6,
      why: "Utan hinder efteråt – för att bara belöna fart igenom tunneln.",
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
        why: "Självständighet byggs av tid, inte av avstånd. Träna att inte prata.",
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
        why: "Riktig hoopers är att hunden kan sekvenser utan att du rör dig mycket.",
      },
    ],
    alternative: {
      title: "1 val, tydlig belöning",
      minutes: 6,
      why: "Enklaste möjliga val – för att bara belöna att hunden svarade.",
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
 * Om senaste session hade låg mood eller kort duration – välj lättare variant.
 * Ren funktion, ingen sida-effekt.
 */
export function shouldSuggestLighterVariant(input: RecInput): boolean {
  const last = input.recentSessions?.[0];
  if (!last) return false;
  const mood = last.overall_mood ?? 3;
  const dur = last.duration_min ?? 0;
  return mood <= 2 || dur >= 60;
}

/** Hela rekommendationen. */
export function recommendDailyPlan(input: RecInput): Recommendation {
  const focus = pickPrimaryFocus(input);
  const template = TEMPLATES[focus];
  const variantIdx =
    ((input.variant ?? 0) % template.variants.length + template.variants.length) %
    template.variants.length;
  const chosen = template.variants[variantIdx];
  const lighter = shouldSuggestLighterVariant(input);

  const active = lighter
    ? {
        title: template.alternative.title,
        minutes: template.alternative.minutes,
        equipment: chosen.equipment,
        steps: chosen.steps,
        why: `Senaste passet såg tungt ut, så vi föreslår ett lättare upplägg. ${template.alternative.why}`,
      }
    : chosen;

  return {
    id: `${focus}-${variantIdx}${lighter ? "-lite" : ""}`,
    title: active.title,
    focusLabel: FOCUS_LABELS[focus],
    focusKey: focus,
    minutes: active.minutes,
    equipment: active.equipment,
    steps: active.steps,
    why: active.why,
    alternative: {
      id: `${focus}-alt`,
      title: template.alternative.title,
      minutes: template.alternative.minutes,
      why: template.alternative.why,
    },
  };
}

/** Byter till ett alternativt pass (används av "Byt övning"). */
export function swapRecommendation(current: Recommendation, input: RecInput): Recommendation {
  return recommendDailyPlan({ ...input, variant: (input.variant ?? 0) + 1 });
}

/**
 * Genererar en kort, ärlig insikt baserat på ett nyligen loggat pass.
 * Regelbaserad — inga påhittade AI-fraser.
 */
export function buildFirstInsight(session: {
  dogName: string;
  focusLabel?: string | null;
  mood: number;
  notesGood?: string | null;
  obstacles?: string[] | null;
}): string {
  const dog = session.dogName || "Din hund";
  const focus = session.focusLabel ?? session.obstacles?.[0] ?? "träningen";
  if (session.mood >= 4) {
    return `${dog} kändes stark i ${focus.toLowerCase()}. Nästa gång: behåll samma upplägg men lägg till en variation i ingången.`;
  }
  if (session.mood <= 2) {
    return `${dog} kämpade lite. Kör ett kortare, enklare pass nästa gång — bygg tillbaka självförtroendet.`;
  }
  return `${dog} är i gång. Fortsätt med samma fokus (${focus.toLowerCase()}) och notera vad som ändras nästa pass.`;
}
