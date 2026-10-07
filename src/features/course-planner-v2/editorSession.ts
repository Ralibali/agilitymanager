import { HISTORY_LIMIT, snapshotDraft, type DraftLike, type DraftSnapshot } from './plannerHistory';
import type { CloudCourseRef } from './cloudCourses';

export interface EditorSession {
  past: DraftSnapshot[];
  future: DraftSnapshot[];
  view: { zoom: number; panX: number; panY: number };
  showLine: boolean; showNumbers: boolean; showGrid: boolean; showRulers: boolean; showDistances: boolean;
  localCourseId: string | null;
  cloudCourse: CloudCourseRef | null;
  savedSnapshot: string | null;
  lastSavedAt: string | null;
}

export function readEditorSession(key: string, parse: (raw: unknown) => DraftLike | null): EditorSession | null {
  try {
    const text = localStorage.getItem(key);
    if (!text || text.length > 8_000_000) return null;
    const stored = JSON.parse(text);
    const raw = stored?._editor;
    if (!raw || typeof raw !== 'object') return null;
    const history = (value: unknown): DraftSnapshot[] => {
      if (!Array.isArray(value)) return [];
      return value.slice(-HISTORY_LIMIT).flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const empty = Array.isArray(item.obstacles) && item.obstacles.length === 0;
        const draft = parse({ ...item, name: 'Utkast', ...(empty ? { obstacles: [{ id: 'empty-probe', type: 'number', x: 0, y: 0, rotation: 0 }] } : {}) });
        return draft ? [snapshotDraft(empty ? { ...draft, obstacles: [] } : draft)] : [];
      });
    };
    const finite = (v: unknown, fallback: number, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
    const cloud = raw.cloudCourse;
    return {
      past: history(raw.past), future: history(raw.future),
      view: { zoom: finite(raw.view?.zoom, 1, 0.25, 4), panX: finite(raw.view?.panX, 0, -500, 500), panY: finite(raw.view?.panY, 0, -500, 500) },
      showLine: raw.showLine !== false, showNumbers: raw.showNumbers !== false, showGrid: raw.showGrid !== false, showRulers: raw.showRulers !== false, showDistances: raw.showDistances === true,
      localCourseId: typeof raw.localCourseId === 'string' ? raw.localCourseId.slice(0, 64) : null,
      cloudCourse: cloud && typeof cloud.id === 'string' && typeof cloud.userId === 'string' && Number.isInteger(cloud.revision) && cloud.revision > 0 ? { id: cloud.id, userId: cloud.userId, revision: cloud.revision } : null,
      savedSnapshot: typeof raw.savedSnapshot === 'string' && raw.savedSnapshot.length < 1_000_000 ? raw.savedSnapshot : null,
      lastSavedAt: typeof raw.lastSavedAt === 'string' && Number.isFinite(Date.parse(raw.lastSavedAt)) ? raw.lastSavedAt : null,
    };
  } catch { return null; }
}
