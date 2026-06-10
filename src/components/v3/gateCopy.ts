/**
 * Utfallsfokuserad copy per Pro-gatad funktion.
 * Säljer värdet, inte låset.
 */
export type GateFeatureKey =
  | "course-planner"
  | "stats"
  | "coach"
  | "health"
  | "goals";

export interface GateCopy {
  title: string;
  body: string;
}

export const GATE_COPY: Record<GateFeatureKey, GateCopy> = {
  "course-planner": {
    title: "Designa egna banor utan gränser",
    body: "Obegränsade banor, domarvy och PDF-export för klubben.",
  },
  stats: {
    title: "Se exakt var tid och pinnar försvinner",
    body: "Djupanalys av dina lopp, trender och utveckling över tid.",
  },
  coach: {
    title: "Få din löpning analyserad av en coach",
    body: "Ladda upp video och få konkret feedback.",
  },
  health: {
    title: "Håll koll på hundens hälsa och form",
    body: "Vikt, skador, vaccination och träningsbelastning samlat.",
  },
  goals: {
    title: "Sätt mål och följ vägen till nästa klass",
    body: "Poängmål, deadlines och automatisk uppföljning.",
  },
};

export function getGateCopy(key?: GateFeatureKey): GateCopy | null {
  if (!key) return null;
  return GATE_COPY[key] ?? null;
}
