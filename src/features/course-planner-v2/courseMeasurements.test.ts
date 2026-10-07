import { describe, expect, it } from 'vitest';
import { measureCourse, roundedSections } from './courseMeasurements';
import { computeCourseTimes, validateCourse } from './validation';
import { buildCoursePath } from './pathSampling';
import { computeSegmentLabels } from './editorOps';
import type { PlacedObstacle } from '@/lib/course';

const obstacles: PlacedObstacle[] = [
  { id: 'start', type: 'start', x: 5, y: 1, rotation: 0 },
  { id: 'jump', type: 'jump', x: 5, y: 5, rotation: 0, number: 1 },
  { id: 'tunnel', type: 'tunnel', x: 12, y: 12, rotation: 25, curveDeg: 90, lengthM: 5, number: 2 },
  { id: 'weave', type: 'weave_12', x: 22, y: 18, rotation: 0, number: 3 },
  { id: 'last', type: 'jump', x: 25, y: 32, rotation: 0, number: 4 },
  { id: 'finish', type: 'finish', x: 25, y: 36, rotation: 0 },
];
const course = { sport: 'agility' as const, sizeClass: 'L' as const, classTemplate: 'agility_1' as const, arenaWidthM: 30, arenaHeightM: 40, obstacles };

describe('measured course', () => {
  it('reconciles all displayed sections, internal obstacle lengths, start, finish, path and times', () => {
    const measured = measureCourse(obstacles);
    expect(measured.startM).toBeGreaterThan(0);
    expect(measured.finishM).toBeGreaterThan(0);
    expect(measured.sections.reduce((a, s) => a + s.distanceM, 0)).toBeCloseTo(measured.path.total, 9);
    expect(roundedSections(measured.sections).reduce((a, s) => a + s.distanceM, 0)).toBeCloseTo(Number(measured.path.total.toFixed(1)), 9);
    expect(measured.sections.filter(s => s.kind === 'obstacle').length).toBeGreaterThanOrEqual(2);
    expect(buildCoursePath(course).total).toBeCloseTo(measured.path.total, 9);
    expect(computeCourseTimes(course).lengthAlongPathM).toBeCloseTo(measured.path.total, 9);
    const labels = computeSegmentLabels(obstacles);
    expect(labels.find(l => l.fromNumber === 'Start')?.pathDistanceM).toBeCloseTo(measured.startM!, 9);
    expect(labels.find(l => l.toNumber === 'Mål')?.pathDistanceM).toBeCloseTo(measured.finishM!, 9);
  });
  it('reconciles one obstacle and absent start/finish without inventing segments', () => {
    for (const input of [[], obstacles.slice(1, 2), obstacles.slice(1, 5)]) {
      const measured = measureCourse(input);
      expect(measured.startM).toBeNull(); expect(measured.finishM).toBeNull();
      expect(measured.sections.reduce((a, s) => a + s.distanceM, 0)).toBeCloseTo(measured.path.total, 9);
    }
  });
  it('accounts for a manually drawn route even without obstacles', () => {
    const measured = measureCourse([], { controlPoints: [{ x: 0, y: 0 }, { x: 3, y: 4 }] });
    expect(measured.path.total).toBe(5);
    expect(measured.sections.reduce((sum, section) => sum + section.distanceM, 0)).toBe(5);
  });
  it('uses the selected planning speed and preserves fixed Hoopers times', () => {
    const times = computeCourseTimes({ ...course, planningSpeedMs: 4 });
    expect(times.refTimeS).toBe(Math.round(times.lengthAlongPathM / 4));
    expect(times.maxTimeS).toBe(times.refTimeS! * 2);
    const fixed = computeCourseTimes({ ...course, sport: 'hoopers', classTemplate: null, ruleSetId: 'hoopers-shs-2022', planningSpeedMs: 4 });
    expect(fixed.refTimeS).toBe(45); expect(fixed.maxTimeS).toBe(90);
  });
  it('re-evaluates bounds and a personal length target when the arena or target changes', () => {
    expect(validateCourse({ ...course, targetLengthM: 10 }).some(i => i.code === 'target_length')).toBe(true);
    expect(validateCourse({ ...course, targetLengthM: measureCourse(obstacles).path.total }).some(i => i.code === 'target_length')).toBe(false);
    expect(validateCourse({ ...course, arenaWidthM: 10 }).some(i => i.code === 'obstacle_outside_arena')).toBe(true);
  });
});
