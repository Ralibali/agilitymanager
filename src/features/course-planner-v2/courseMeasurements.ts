import { buildDogPath, passageInsetM, type CourseDogPathOverride, type DogPathObstacle, type DogPath } from './dogPath';

export interface MeasuredSection {
  key: string;
  label: string;
  kind: 'start' | 'between' | 'obstacle' | 'finish' | 'override';
  distanceM: number;
}

/** The rendered path, total and audit table share exactly the same geometry. */
export function measureCourse(obstacles: DogPathObstacle[], override?: CourseDogPathOverride): {
  path: DogPath;
  sections: MeasuredSection[];
  startM: number | null;
  finishM: number | null;
} {
  const path = buildDogPath(obstacles, override);
  if (override?.controlPoints && override.controlPoints.length >= 2) {
    return { path, sections: [{ key: 'override', label: 'Manuellt ritad hundväg', kind: 'override', distanceM: path.total }], startM: null, finishM: null };
  }
  if (!path.anchors.length) return { path, sections: [], startM: null, finishM: null };
  const start = obstacles.find(o => o.type === 'start');
  const finish = obstacles.find(o => o.type === 'finish');
  const first = path.anchors[0];
  const last = path.anchors.at(-1)!;
  const startAir = start ? Math.hypot(start.x - first.entry.x, start.y - first.entry.y) : 0;
  const finishAir = finish ? Math.hypot(finish.x - last.exit.x, finish.y - last.exit.y) : 0;
  const startM = start ? startAir + passageInsetM(first.obstacle) : null;
  const finishM = finish ? finishAir + passageInsetM(last.obstacle) : null;
  const sections: MeasuredSection[] = [];
  if (startM != null) sections.push({ key: 'start', label: `Start → ${first.obstacle.number}`, kind: 'start', distanceM: startM });
  path.anchors.forEach((anchor, i) => {
    const inset = passageInsetM(anchor.obstacle);
    const internal = anchor.internalLengthM - (i > 0 || start ? inset : 0) - (i < path.anchors.length - 1 || finish ? inset : 0);
    if (internal > 1e-9) sections.push({ key: `obstacle-${i}`, label: `Genom hinder ${anchor.obstacle.number}`, kind: 'obstacle', distanceM: internal });
    const next = path.anchors[i + 1];
    const range = path.airRanges?.[i];
    if (next && range) {
      sections.push({ key: `between-${i}`, label: `${anchor.obstacle.number} → ${next.obstacle.number}`, kind: 'between', distanceM: path.cum[range.endIdx] - path.cum[range.startIdx] + inset + passageInsetM(next.obstacle) });
    }
  });
  if (finishM != null) sections.push({ key: 'finish', label: `${last.obstacle.number} → Mål`, kind: 'finish', distanceM: finishM });
  const points = [...(start ? [{ x: start.x, y: start.y }] : []), ...path.points, ...(finish ? [{ x: finish.x, y: finish.y }] : [])];
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const offset = start ? 1 : 0;
  const airRanges = path.airRanges?.map(range => ({ startIdx: range.startIdx + offset, endIdx: range.endIdx + offset }));
  return { path: { ...path, points, cum, airRanges, total: cum.at(-1) ?? 0, airM: path.airM + startAir + finishAir }, sections, startM, finishM };
}

/** Balanced rounding makes displayed table rows add up to the displayed total. */
export function roundedSections(sections: MeasuredSection[]): MeasuredSection[] {
  let sum = 0;
  let previous = 0;
  return sections.map(section => {
    sum += section.distanceM;
    const rounded = Math.round(sum * 10);
    const distanceM = (rounded - previous) / 10;
    previous = rounded;
    return { ...section, distanceM };
  });
}
