import type {
  AgilityClass,
  AgilityObstacleType,
  CourseKind,
  PlannerObstacle,
  RingSize,
  Ruleset,
} from "./agilityCourseRules";

export type CourseFocus = "flow" | "handling" | "contacts" | "speed" | "technical";

export interface BankCourse {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  kind: CourseKind;
  competitionClass: AgilityClass;
  ruleset: Ruleset;
  ring: RingSize;
  focus: CourseFocus[];
  tags: string[];
  obstacles: PlannerObstacle[];
}

export const DEFAULT_COURSE_RING: RingSize = { widthM: 40, heightM: 30 };

const HORIZONTAL_SNAKE = [
  [6, 5], [13, 5], [20, 5], [27, 5], [34, 5],
  [34, 12], [27, 12], [20, 12], [13, 12], [6, 12],
  [6, 19], [13, 19], [20, 19], [27, 19], [34, 19],
  [34, 26], [27, 26], [20, 26], [13, 26], [6, 26],
] as const;

const VERTICAL_SNAKE = [
  [5, 4], [5, 11], [5, 18], [5, 25],
  [12, 25], [12, 18], [12, 11], [12, 4],
  [19, 4], [19, 11], [19, 18], [19, 25],
  [26, 25], [26, 18], [26, 11], [26, 4],
  [33, 4], [33, 11], [33, 18], [33, 25],
] as const;

const DIAGONAL_ZIGZAG = [
  [5, 5], [10, 10], [15, 5], [20, 10], [25, 5], [30, 10], [35, 5],
  [35, 12], [30, 17], [25, 12], [20, 17], [15, 12], [10, 17], [5, 12],
  [5, 19], [10, 24], [15, 19], [20, 24], [25, 19], [30, 24],
] as const;

const INNER_LOOP = [
  [6, 5], [13, 5], [20, 5], [27, 5], [34, 5],
  [34, 12], [27, 12], [20, 12], [20, 19], [27, 19],
  [34, 19], [34, 26], [27, 26], [20, 26], [13, 26],
  [6, 26], [6, 19], [13, 19], [13, 12], [6, 12],
] as const;

type CoursePoint = readonly [number, number];

function obstacleRotation(index: number, points: readonly CoursePoint[]): number {
  const current = points[index];
  const reference = index === 0 ? points[1] : points[index - 1];
  const dx = current[0] - reference[0];
  const dy = current[1] - reference[1];
  const incoming = (Math.atan2(dy, dx) * 180) / Math.PI;
  return incoming - 90;
}

function buildTemplate(
  id: string,
  types: AgilityObstacleType[],
  points: readonly CoursePoint[],
  ring: RingSize = DEFAULT_COURSE_RING,
): PlannerObstacle[] {
  if (types.length !== points.length) {
    throw new Error(`Bank course ${id} has ${types.length} obstacles but ${points.length} points.`);
  }

  return types.map((type, index) => ({
    id: `${id}-${index + 1}-${type}`,
    type,
    x: (points[index][0] / ring.widthM) * 100,
    y: (points[index][1] / ring.heightM) * 100,
    rotation: obstacleRotation(index, points),
    number: index + 1,
  }));
}

function course(
  meta: Omit<BankCourse, "ruleset" | "ring" | "obstacles">,
  types: AgilityObstacleType[],
  points: readonly CoursePoint[],
): BankCourse {
  return {
    ...meta,
    ruleset: "sweden",
    ring: DEFAULT_COURSE_RING,
    obstacles: buildTemplate(meta.id, types, points),
  };
}

export const COURSE_BANK: BankCourse[] = [
  course(
    {
      id: "klass-1-agility-grundflyt",
      title: "Klass 1 agility – Grundflyt",
      shortTitle: "Grundflyt",
      description: "En lättläst klass 1-bana med tre olika kontakthinder, slalom och mjuka riktningsbyten. Bra som komplett träningsbana.",
      kind: "agility",
      competitionClass: 1,
      focus: ["flow", "contacts"],
      tags: ["klass 1", "kontaktfält", "slalom", "20 hinder"],
    },
    [
      "jump", "jump", "tunnel", "jump", "dogwalk",
      "jump", "weave", "jump", "tunnel", "aframe",
      "jump", "jump", "longjump", "jump", "seesaw",
      "jump", "wall", "tunnel", "jump", "jump",
    ],
    HORIZONTAL_SNAKE,
  ),
  course(
    {
      id: "klass-1-hopp-flyt",
      title: "Klass 1 hopp – Flyt & fokus",
      shortTitle: "Flyt & fokus",
      description: "Hoppklass utan kontakthinder med tydliga linjer, ett slalom, tunnelpassager och variation mellan hopp, däck och långhopp.",
      kind: "jumping",
      competitionClass: 1,
      focus: ["flow", "speed"],
      tags: ["klass 1", "hoppklass", "slalom", "20 hinder"],
    },
    [
      "jump", "jump", "tunnel", "jump", "tyre",
      "jump", "weave", "jump", "tunnel", "jump",
      "longjump", "jump", "wall", "jump", "tunnel",
      "jump", "jump", "tunnel", "jump", "jump",
    ],
    VERTICAL_SNAKE,
  ),
  course(
    {
      id: "klass-1-agility-kontaktpass",
      title: "Klass 1 agility – Kontaktpasset",
      shortTitle: "Kontaktpasset",
      description: "Tre kontakthinder placerade i olika delar av banan så att du kan träna kontaktbeteende utan att tappa helhetsflytet.",
      kind: "agility",
      competitionClass: 1,
      focus: ["contacts", "handling"],
      tags: ["klass 1", "kontaktfält", "handling", "20 hinder"],
    },
    [
      "jump", "tunnel", "jump", "dogwalk", "jump",
      "jump", "weave", "jump", "aframe", "jump",
      "tunnel", "jump", "longjump", "jump", "seesaw",
      "jump", "wall", "jump", "tunnel", "jump",
    ],
    DIAGONAL_ZIGZAG,
  ),
  course(
    {
      id: "klass-2-agility-linjeval",
      title: "Klass 2 agility – Linjeval",
      shortTitle: "Linjeval",
      description: "En klass 2-layout med oxer, tre kontakthinder och flera tillfällen att välja handling och hundlinje genom banan.",
      kind: "agility",
      competitionClass: 2,
      focus: ["handling", "technical"],
      tags: ["klass 2", "oxer", "kontaktfält", "20 hinder"],
    },
    [
      "jump", "jump", "tunnel", "spread", "dogwalk",
      "jump", "weave", "jump", "tunnel", "aframe",
      "jump", "wall", "jump", "longjump", "seesaw",
      "jump", "tunnel", "tyre", "jump", "jump",
    ],
    INNER_LOOP,
  ),
  course(
    {
      id: "klass-2-hopp-tempo",
      title: "Klass 2 hopp – Tempo & byte",
      shortTitle: "Tempo & byte",
      description: "Snabb hoppklass med oxer, slalom och tunnelpassager. Layouten ger flera naturliga punkter för framför- och bakombyten.",
      kind: "jumping",
      competitionClass: 2,
      focus: ["speed", "handling"],
      tags: ["klass 2", "hoppklass", "oxer", "handling"],
    },
    [
      "jump", "spread", "jump", "tunnel", "jump",
      "tyre", "jump", "weave", "jump", "tunnel",
      "jump", "longjump", "jump", "wall", "tunnel",
      "jump", "spread", "jump", "tunnel", "jump",
    ],
    DIAGONAL_ZIGZAG,
  ),
  course(
    {
      id: "klass-3-agility-teknik",
      title: "Klass 3 agility – Teknik & rytm",
      shortTitle: "Teknik & rytm",
      description: "Fyra kontaktpassager, oxer och varierad hinderbild för ekipage som vill träna mer teknisk klass 3-känsla i en regelmedveten layout.",
      kind: "agility",
      competitionClass: 3,
      focus: ["technical", "contacts"],
      tags: ["klass 3", "teknisk", "kontaktfält", "20 hinder"],
    },
    [
      "jump", "spread", "tunnel", "jump", "dogwalk",
      "jump", "weave", "aframe", "jump", "tunnel",
      "jump", "seesaw", "longjump", "jump", "dogwalk",
      "jump", "wall", "tyre", "jump", "jump",
    ],
    VERTICAL_SNAKE,
  ),
  course(
    {
      id: "klass-3-hopp-teknik",
      title: "Klass 3 hopp – Teknisk fart",
      shortTitle: "Teknisk fart",
      description: "En snabb klass 3-hoppbana med två oxrar, slalom, däck, långhopp och tunnelpartier för träning av linjer i högre tempo.",
      kind: "jumping",
      competitionClass: 3,
      focus: ["technical", "speed"],
      tags: ["klass 3", "hoppklass", "teknisk", "20 hinder"],
    },
    [
      "jump", "spread", "jump", "tunnel", "tyre",
      "jump", "weave", "jump", "spread", "tunnel",
      "jump", "longjump", "jump", "wall", "jump",
      "tunnel", "jump", "tunnel", "jump", "jump",
    ],
    INNER_LOOP,
  ),
  course(
    {
      id: "klass-2-agility-tunnelflyt",
      title: "Klass 2 agility – Tunnel & flyt",
      shortTitle: "Tunnel & flyt",
      description: "Tre kontakthinder kombineras med flera tunnelpassager och tydliga 6–8-meterslinjer för ett fartfyllt men läsbart träningspass.",
      kind: "agility",
      competitionClass: 2,
      focus: ["flow", "speed", "contacts"],
      tags: ["klass 2", "tunnel", "kontaktfält", "20 hinder"],
    },
    [
      "jump", "tunnel", "jump", "spread", "jump",
      "dogwalk", "jump", "weave", "tunnel", "jump",
      "aframe", "jump", "tunnel", "longjump", "jump",
      "seesaw", "jump", "wall", "jump", "jump",
    ],
    HORIZONTAL_SNAKE,
  ),
];

export const PRIMARY_AGILITY_TEMPLATE = COURSE_BANK[0];
export const PRIMARY_JUMPING_TEMPLATE = COURSE_BANK[1];

export function getBankCourse(courseId: string | null | undefined): BankCourse | undefined {
  if (!courseId) return undefined;
  return COURSE_BANK.find((courseItem) => courseItem.id === courseId);
}

export function cloneBankCourseObstacles(courseItem: BankCourse): PlannerObstacle[] {
  const stamp = Date.now().toString(36);
  return courseItem.obstacles.map((obstacle, index) => ({
    ...obstacle,
    id: `${stamp}-${courseItem.id}-${index + 1}-${obstacle.type}`,
  }));
}
