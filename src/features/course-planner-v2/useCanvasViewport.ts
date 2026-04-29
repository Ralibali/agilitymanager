/**
 * Banplaneraren v2 — Viewport-hook (zoom + pan + persistens).
 *
 * SVG-baserad rendering: zoom/pan implementeras via viewBox + offset.
 * `pxPerM` är dynamiskt — uträknat från viewportens current pixelbredd
 * delat med (arenaWidthM + 2*padding) / zoom. Konvertering mellan
 * client- och kurs-koordinater använder mätt SVG bounding-rect så att
 * pinch/scroll-anchor blir pixel-perfekt.
 *
 * Persistens: per-kurs key i localStorage. Om flera banor öppnas växelvis
 * behåller varje sin senaste zoom/pan.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0] as const;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;
const STORAGE_PREFIX = "am_planner_viewport";

export interface ViewportState {
  /** 0.25 – 4.0. 1.0 = passar arena exakt i viewportbredden. */
  zoom: number;
  /** Pan i kurs-meter — adderas på arenans top-left position. */
  panX: number;
  panY: number;
}

export interface ViewportMetrics {
  /** Pixlar per meter vid current zoom (utgår från viewport-bredd). */
  pxPerM: number;
  /** Viewport-storlek i px (innermått efter linjaler). */
  viewportWidthPx: number;
  viewportHeightPx: number;
}

interface UseCanvasViewportOpts {
  /** Identifierar banan så att state persisteras separat. Tom = generic. */
  storageKey?: string;
  /** Banstorlek i meter — används för fitToScreen och pan-clampning. */
  arenaWidthM: number;
  arenaHeightM: number;
  /** Padding i meter runt arenan (för luft i viewporten). Default 1. */
  paddingM?: number;
}

const DEFAULT_STATE: ViewportState = { zoom: 1.0, panX: 0, panY: 0 };

function loadState(key: string): ViewportState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      zoom: clamp(Number(parsed.zoom) || 1, ZOOM_MIN, ZOOM_MAX),
      panX: Number(parsed.panX) || 0,
      panY: Number(parsed.panY) || 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(key: string, s: ViewportState) {
  try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* ignore */ }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Hittar närmaste värde i en sorterad lista. */
function nearestStep(value: number, dir: 1 | -1): number {
  if (dir === 1) {
    for (const z of ZOOM_STEPS) if (z > value + 0.001) return z;
    return ZOOM_MAX;
  } else {
    for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) if (ZOOM_STEPS[i] < value - 0.001) return ZOOM_STEPS[i];
    return ZOOM_MIN;
  }
}

export interface UseCanvasViewportApi {
  state: ViewportState;
  metrics: ViewportMetrics;
  /** Refs som komponenten ska binda. */
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  svgRef: React.MutableRefObject<SVGSVGElement | null>;
  /** ViewBox-string för SVG. */
  viewBox: string;
  /** Aktuella ytter-mått i meter (vad SVG täcker just nu). */
  visibleWidthM: number;
  visibleHeightM: number;
  /** Top-left för viewBox i meter (relativt arena-origo). */
  viewMinXM: number;
  viewMinYM: number;
  /** Zoom-kontroller. */
  zoomIn: (anchorClientX?: number, anchorClientY?: number) => void;
  zoomOut: (anchorClientX?: number, anchorClientY?: number) => void;
  zoomTo: (zoom: number, anchorClientX?: number, anchorClientY?: number) => void;
  resetZoom: () => void;
  fitToScreen: () => void;
  /** Pan-kontroller (client-pixel-delta). */
  panByPx: (dxPx: number, dyPx: number) => void;
  setPan: (panXM: number, panYM: number) => void;
  /** Koordinat-konvertering. */
  clientToCourseM: (clientX: number, clientY: number) => { x: number; y: number };
  courseMToClient: (xM: number, yM: number) => { x: number; y: number };
  /** Tickmark-täthet (m mellan tickmarks) baserat på aktuell zoom. */
  tickStepM: number;
  /** Visa fina (1 m / 0.5 m) tickmarks? */
  showFineTicks: boolean;
}

export function useCanvasViewport(opts: UseCanvasViewportOpts): UseCanvasViewportApi {
  const padding = opts.paddingM ?? 1;
  const storageKey = `${STORAGE_PREFIX}_${opts.storageKey ?? "default"}`;

  const [state, setState] = useState<ViewportState>(() => loadState(storageKey));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // Mät containern + lyssna på resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Persistens — debounced.
  useEffect(() => {
    const t = setTimeout(() => saveState(storageKey, state), 250);
    return () => clearTimeout(t);
  }, [state, storageKey]);

  // Beräknar viewBox från state. Bas-skala (zoom=1) = arena+padding fyller bredden.
  const baseWidthM = opts.arenaWidthM + padding * 2;
  const baseHeightM = opts.arenaHeightM + padding * 2;
  const aspect = size.h / size.w;
  // Vid zoom=1 visar viewBox baseWidthM brett. Höjd = baseWidthM * aspect.
  const visibleWidthM = baseWidthM / state.zoom;
  const visibleHeightM = baseWidthM * aspect / state.zoom;
  // ViewBox top-left: börja med arena top-left (-padding, -padding) centrerad,
  // sedan addera pan.
  const centerXM = opts.arenaWidthM / 2;
  const centerYM = opts.arenaHeightM / 2;
  const viewMinXM = centerXM - visibleWidthM / 2 + state.panX;
  const viewMinYM = centerYM - visibleHeightM / 2 + state.panY;
  const viewBox = `${viewMinXM} ${viewMinYM} ${visibleWidthM} ${visibleHeightM}`;

  const pxPerM = size.w / visibleWidthM;

  // Konverterare som använder DOM-bounding av SVG (säkrast vid resize).
  const clientToCourseM = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    return {
      x: viewMinXM + fx * visibleWidthM,
      y: viewMinYM + fy * visibleHeightM,
    };
  }, [viewMinXM, viewMinYM, visibleWidthM, visibleHeightM]);

  const courseMToClient = useCallback((xM: number, yM: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const fx = (xM - viewMinXM) / visibleWidthM;
    const fy = (yM - viewMinYM) / visibleHeightM;
    return { x: rect.left + fx * rect.width, y: rect.top + fy * rect.height };
  }, [viewMinXM, viewMinYM, visibleWidthM, visibleHeightM]);

  // Anchor-baserad zoom: behåll kurs-koordinaten under anchor-pixeln stilla.
  const zoomTo = useCallback((nextZoomRaw: number, anchorClientX?: number, anchorClientY?: number) => {
    const nextZoom = clamp(nextZoomRaw, ZOOM_MIN, ZOOM_MAX);
    setState((s) => {
      if (Math.abs(nextZoom - s.zoom) < 1e-4) return s;
      // Förenklad anchor-justering: räkna i samma frame.
      if (anchorClientX !== undefined && anchorClientY !== undefined && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const fx = (anchorClientX - rect.left) / rect.width;
        const fy = (anchorClientY - rect.top) / rect.height;
        // Kurs-koordinat under anchor INNAN
        const before = {
          x: viewMinXM + fx * visibleWidthM,
          y: viewMinYM + fy * visibleHeightM,
        };
        // Nya visible-mått
        const newVisibleW = baseWidthM / nextZoom;
        const newVisibleH = baseWidthM * aspect / nextZoom;
        // Vi vill: viewMinX_new + fx * newVisibleW === before.x
        const newViewMinX = before.x - fx * newVisibleW;
        const newViewMinY = before.y - fy * newVisibleH;
        // Härleder nytt panX/Y
        const newPanX = newViewMinX - (centerXM - newVisibleW / 2);
        const newPanY = newViewMinY - (centerYM - newVisibleH / 2);
        return { zoom: nextZoom, panX: clampPan(newPanX, opts.arenaWidthM, newVisibleW), panY: clampPan(newPanY, opts.arenaHeightM, newVisibleH) };
      }
      return { ...s, zoom: nextZoom };
    });
  }, [viewMinXM, viewMinYM, visibleWidthM, visibleHeightM, baseWidthM, aspect, centerXM, centerYM, opts.arenaWidthM, opts.arenaHeightM]);

  const zoomIn = useCallback((ax?: number, ay?: number) => {
    setState((s) => {
      const next = nearestStep(s.zoom, 1);
      if (Math.abs(next - s.zoom) < 1e-4) return s;
      // Anchor-justering inline
      if (ax !== undefined && ay !== undefined && svgRef.current) {
        const r = svgRef.current.getBoundingClientRect();
        const fx = (ax - r.left) / r.width;
        const fy = (ay - r.top) / r.height;
        const beforeX = viewMinXM + fx * visibleWidthM;
        const beforeY = viewMinYM + fy * visibleHeightM;
        const newVw = baseWidthM / next;
        const newVh = baseWidthM * aspect / next;
        const newPanX = beforeX - fx * newVw - (centerXM - newVw / 2);
        const newPanY = beforeY - fy * newVh - (centerYM - newVh / 2);
        return { zoom: next, panX: clampPan(newPanX, opts.arenaWidthM, newVw), panY: clampPan(newPanY, opts.arenaHeightM, newVh) };
      }
      return { ...s, zoom: next };
    });
  }, [viewMinXM, viewMinYM, visibleWidthM, baseWidthM, aspect, centerXM, centerYM, opts.arenaWidthM, opts.arenaHeightM]);

  const zoomOut = useCallback((ax?: number, ay?: number) => {
    setState((s) => {
      const next = nearestStep(s.zoom, -1);
      if (Math.abs(next - s.zoom) < 1e-4) return s;
      if (ax !== undefined && ay !== undefined && svgRef.current) {
        const r = svgRef.current.getBoundingClientRect();
        const fx = (ax - r.left) / r.width;
        const fy = (ay - r.top) / r.height;
        const beforeX = viewMinXM + fx * visibleWidthM;
        const beforeY = viewMinYM + fy * visibleHeightM;
        const newVw = baseWidthM / next;
        const newVh = baseWidthM * aspect / next;
        const newPanX = beforeX - fx * newVw - (centerXM - newVw / 2);
        const newPanY = beforeY - fy * newVh - (centerYM - newVh / 2);
        return { zoom: next, panX: clampPan(newPanX, opts.arenaWidthM, newVw), panY: clampPan(newPanY, opts.arenaHeightM, newVh) };
      }
      return { ...s, zoom: next };
    });
  }, [viewMinXM, viewMinYM, visibleWidthM, baseWidthM, aspect, centerXM, centerYM, opts.arenaWidthM, opts.arenaHeightM]);

  const resetZoom = useCallback(() => {
    setState({ zoom: 1.0, panX: 0, panY: 0 });
  }, []);

  const fitToScreen = useCallback(() => {
    // "Fit" = zoom-nivå där hela arenan + padding precis passar både i bredd och höjd.
    // Vid zoom=1 är bredden redan = baseWidthM. Höjden = baseWidthM*aspect.
    // Om baseHeightM > baseWidthM*aspect måste vi minska zoom.
    const fitZoom = Math.min(1, (baseWidthM * aspect) / baseHeightM);
    setState({ zoom: clamp(fitZoom, ZOOM_MIN, ZOOM_MAX), panX: 0, panY: 0 });
  }, [baseWidthM, baseHeightM, aspect]);

  const panByPx = useCallback((dxPx: number, dyPx: number) => {
    setState((s) => {
      const dxM = -dxPx / pxPerM; // dra åt höger → panorera vänster
      const dyM = -dyPx / pxPerM;
      const visW = baseWidthM / s.zoom;
      const visH = baseWidthM * aspect / s.zoom;
      const nextX = clampPan(s.panX + dxM, opts.arenaWidthM, visW);
      const nextY = clampPan(s.panY + dyM, opts.arenaHeightM, visH);
      if (nextX === s.panX && nextY === s.panY) return s;
      return { ...s, panX: nextX, panY: nextY };
    });
  }, [pxPerM, baseWidthM, aspect, opts.arenaWidthM, opts.arenaHeightM]);

  const setPan = useCallback((panXM: number, panYM: number) => {
    setState((s) => {
      const visW = baseWidthM / s.zoom;
      const visH = baseWidthM * aspect / s.zoom;
      return {
        ...s,
        panX: clampPan(panXM, opts.arenaWidthM, visW),
        panY: clampPan(panYM, opts.arenaHeightM, visH),
      };
    });
  }, [baseWidthM, aspect, opts.arenaWidthM, opts.arenaHeightM]);

  // Tickstep väljs så att tickmarks är lagom täta i pixlar.
  const tickStepM = useMemo(() => {
    // Mål: ~80 px mellan stora tickmarks.
    const desired = 80 / pxPerM;
    if (desired <= 1) return 1;
    if (desired <= 2) return 2;
    if (desired <= 5) return 5;
    if (desired <= 10) return 10;
    return Math.ceil(desired / 5) * 5;
  }, [pxPerM]);
  const showFineTicks = state.zoom >= 1.5;

  const metrics: ViewportMetrics = {
    pxPerM,
    viewportWidthPx: size.w,
    viewportHeightPx: size.h,
  };

  return {
    state,
    metrics,
    containerRef,
    svgRef,
    viewBox,
    visibleWidthM,
    visibleHeightM,
    viewMinXM,
    viewMinYM,
    zoomIn,
    zoomOut,
    zoomTo,
    resetZoom,
    fitToScreen,
    panByPx,
    setPan,
    clientToCourseM,
    courseMToClient,
    tickStepM,
    showFineTicks,
  };
}

/**
 * Klampa pan så att minst 50 px av arenan alltid är synlig.
 * (Räknat i meter — vi tillåter att arenans kant är minst 50/pxPerM från
 * viewport-kanten, men eftersom pxPerM beror på zoom använder vi en
 * konservativ grov regel: min 2 m av arenan måste vara synlig på varje sida.)
 */
function clampPan(panM: number, arenaSizeM: number, visibleSizeM: number): number {
  // Arena-rect i kurs-koord = [0, arenaSizeM]
  // ViewBox = [centerM - visibleSizeM/2 + panM, centerM + visibleSizeM/2 + panM]
  const center = arenaSizeM / 2;
  const minVisibleM = 2; // ~50 px vid pxPerM=25
  // viewMin >= -arenaSizeM + minVisibleM  (annars är arenan helt utanför till vänster)
  // viewMax <= arenaSizeM + arenaSizeM - minVisibleM ... men mer praktiskt:
  // viewMin = center - vis/2 + pan  ≤  arenaSizeM - minVisibleM
  // viewMax = center + vis/2 + pan  ≥  minVisibleM
  const maxPan = arenaSizeM - minVisibleM - (center - visibleSizeM / 2);
  const minPan = minVisibleM - (center + visibleSizeM / 2);
  return clamp(panM, minPan, maxPan);
}
