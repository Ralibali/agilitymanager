import type { ObstacleTypeV2 } from "./config";
import type { PrebuiltCourse, PrebuiltObstacle } from "./templates";

type SeqItem = { type: ObstacleTypeV2; x: number; y: number; curveDeg?: number; curveSide?: "left" | "right" };

function angleDeg(from: SeqItem, to: SeqItem): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function rotationFor(type: ObstacleTypeV2, travelDeg: number): number {
  // Tunnel färdas längs width-axeln. Övriga agilityhinder i dogPath.ts färdas
  // längs depth-axeln, dvs lokal +Y = rotation + 90°.
  return type === "tunnel" ? travelDeg : travelDeg - 90;
}

function buildObstacles(sequence: SeqItem[], start: { x: number; y: number }, finish: { x: number; y: number }): PrebuiltObstacle[] {
  const numbered = sequence.map<PrebuiltObstacle>((item, index) => {
    const prev = sequence[index - 1];
    const next = sequence[index + 1];
    const travel = prev ? angleDeg(prev, item) : next ? angleDeg(item, next) : 0;
    return {
      ...item,
      rotation: rotationFor(item.type, travel),
      number: index + 1,
    };
  });

  const firstTravel = sequence.length > 1 ? angleDeg(sequence[0], sequence[1]) : 0;
  const lastTravel = sequence.length > 1 ? angleDeg(sequence[sequence.length - 2], sequence[sequence.length - 1]) : 0;

  return [
    { type: "start", x: start.x, y: start.y, rotation: firstTravel },
    ...numbered,
    { type: "finish", x: finish.x, y: finish.y, rotation: lastTravel },
  ];
}

const LARGE_BASE: Omit<PrebuiltCourse, "key" | "label" | "description" | "focus" | "qualityLabel" | "classTemplate" | "obstacles"> = {
  sport: "agility",
  arenaWidthM: 25,
  arenaHeightM: 30,
  defaultSize: "L",
};

const COMPACT_BASE: Omit<PrebuiltCourse, "key" | "label" | "description" | "focus" | "qualityLabel" | "classTemplate" | "obstacles"> = {
  sport: "agility",
  arenaWidthM: 15,
  arenaHeightM: 30,
  defaultSize: "L",
};

// Punkterna är ritade som hundlinjer, inte som dekorativt jämna koordinater.
// Jump→jump ligger kring 6.4–7.2 m centrumavstånd, medan tunnel/slalom/balans
// får större centrumavstånd för att den faktiska exit→entry-vägen ska hamna
// inom den svenska 6–8 m-regeln.
const LARGE_POINTS = [
  [6.5, 22.5], [13.2, 22.2], [20.3, 18.0], [20.4, 9.4], [13.1, 5.2],
  [5.2, 6.6], [3.2, 14.2], [6.8, 20.1], [13.5, 20.2], [20.3, 16.1],
  [21.0, 8.1], [14.2, 4.2], [7.4, 4.3],
] as const;

const COMPACT_POINTS = [
  [7.5, 22.8], [7.4, 16.1], [7.3, 9.2], [3.1, 3.6], [11.5, 3.6],
  [11.7, 11.8], [5.1, 14.6], [2.1, 21.1], [7.8, 24.0], [12.7, 18.7],
  [10.6, 11.6], [4.0, 8.8], [4.0, 15.5],
] as const;

function seq(points: readonly (readonly [number, number])[], types: ObstacleTypeV2[]): SeqItem[] {
  return points.map(([x, y], i) => ({ type: types[i], x, y }));
}

const MUR_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "longjump", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];

const SLALOM_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "weave_12", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];

const BALANS_TYPES: ObstacleTypeV2[] = [
  "jump", "jump", "tunnel", "jump", "dogwalk", "jump", "tunnel",
  "jump", "jump", "tunnel", "jump", "jump", "jump",
];

function course(
  size: "large" | "compact",
  type: "mur" | "slalom" | "balans",
  types: ObstacleTypeV2[],
): PrebuiltCourse {
  const large = size === "large";
  const base = large ? LARGE_BASE : COMPACT_BASE;
  const points = large ? LARGE_POINTS : COMPACT_POINTS;
  const sizeLabel = large ? "25×30" : "15×30";
  const start = large ? { x: 6.5, y: 29.0 } : { x: 7.5, y: 29.0 };
  const finish = large ? { x: 0.8, y: 4.3 } : { x: 4.0, y: 22.5 };

  const meta = type === "mur"
    ? {
        key: `noll_2026_mur_${large ? "25x30" : "15x30"}`,
        label: `Nollklass Mur/Långhopp · ${sizeLabel}`,
        classTemplate: "noll_mur" as const,
        description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt långhopp. ${sizeLabel} m, clear round utan tid.`,
        focus: ["Nollklass", "långhopp", "grundhandling", large ? "stor yta" : "kompakt yta"],
      }
    : type === "slalom"
      ? {
          key: `noll_2026_slalom_${large ? "25x30" : "15x30"}`,
          label: `Nollklass Slalom · ${sizeLabel}`,
          classTemplate: "noll_slalom" as const,
          description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt ett 12-pinnars slalom. ${sizeLabel} m, clear round utan tid.`,
          focus: ["Nollklass", "slalom", "ingång", large ? "stor yta" : "kompakt yta"],
        }
      : {
          key: `noll_2026_balans_${large ? "25x30" : "15x30"}`,
          label: `Nollklass Balans · ${sizeLabel}`,
          classTemplate: "noll_balans" as const,
          description: `AgilityManager-original för Nollklass med 13 passager, vanliga hopp och tunnlar samt balansbom. ${sizeLabel} m, clear round utan tid.`,
          focus: ["Nollklass", "balansbom", "kontaktfält", large ? "stor yta" : "kompakt yta"],
        };

  return {
    ...base,
    ...meta,
    qualityLabel: "Kontrollerad mot SAgiK:s Nollklassram 2026 · AgilityManager-original",
    obstacles: buildObstacles(seq(points, types), start, finish),
  };
}

export const NOLLKLASS_COURSES: PrebuiltCourse[] = [
  course("large", "mur", MUR_TYPES),
  course("compact", "mur", MUR_TYPES),
  course("large", "slalom", SLALOM_TYPES),
  course("compact", "slalom", SLALOM_TYPES),
  course("large", "balans", BALANS_TYPES),
  course("compact", "balans", BALANS_TYPES),
];
