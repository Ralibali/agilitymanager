import { Helmet } from 'react-helmet-async';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, FolderOpen, Download, Upload, Sparkles, Minus, Plus, Pencil, Eraser, Hash, Maximize, Minimize, Undo2, ZoomIn, ZoomOut, Maximize2, Share2, Palette, Copy, Ruler, ChevronDown, X } from 'lucide-react';
import ShareCourseDialog from '@/components/course-planner/ShareCourseDialog';
import ObstacleColorPanel from '@/components/course-planner/ObstacleColorPanel';
import { CoursePlannerTutorial, TutorialButton } from '@/components/course-planner/CoursePlannerTutorial';
import { toast } from 'sonner';
import { PremiumGate, usePremium, PremiumBadge } from '@/components/PremiumGate';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { OBSTACLE_INFO, CONTACT_TYPES, MIN_DISTANCES } from '@/lib/courseObstacleInfo';
import {
  PRESET_THEMES,
  STANDARD_THEME,
  getObstacleColors,
  loadActiveThemeId,
  saveActiveThemeId,
  loadCustomOverrides,
  saveCustomOverrides,
  type ObstacleTheme,
  type ObstacleColors,
} from '@/lib/obstacleThemes';

/* ───── Types ───── */

type NumberEntry = { num: number; color: string };

type FreeNumber = {
  id: string;
  num: number;
  color: string;
  x: number;
  y: number;
};

type Obstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
  numbers: number[];
  colorNumbers?: NumberEntry[];
  tunnelLength?: 4 | 6;
  bendAngle?: number;
  number?: number;
};

type PathPoint = { x: number; y: number };

type SavedCourse = {
  id: string;
  name: string;
  course_data: Obstacle[];
  canvas_width: number;
  canvas_height: number;
  created_at: string;
};

/* ───── Constants ───── */

const PX_PER_METER = 20;
const GRID_STEP = PX_PER_METER;
const METERS_PER_PX = 1 / PX_PER_METER;

const OBSTACLE_TYPES = [
  { type: 'jump',      label: 'Hopp',     symbol: '┃', width: 1.2 * PX_PER_METER, height: 0.15 * PX_PER_METER },
  { type: 'long_jump', label: 'Långhopp', symbol: '═', width: 1.2 * PX_PER_METER, height: 0.6 * PX_PER_METER },
  { type: 'oxer',      label: 'Oxer',     symbol: '‖', width: 1.2 * PX_PER_METER, height: 0.5 * PX_PER_METER },
  { type: 'wall',      label: 'Muren',    symbol: '▬', width: 1.2 * PX_PER_METER, height: 0.5 * PX_PER_METER },
  { type: 'tunnel',    label: 'Tunnel',   symbol: '⌒', width: 0.6 * PX_PER_METER, height: 4 * PX_PER_METER },
  { type: 'a_frame',   label: 'A-hinder', symbol: '△', width: 1.9 * PX_PER_METER, height: 2.7 * PX_PER_METER },
  { type: 'dog_walk',  label: 'Brygga',   symbol: '━', width: 3.6 * PX_PER_METER, height: 0.3 * PX_PER_METER },
  { type: 'seesaw',    label: 'Vipp',     symbol: '⏤', width: 3.6 * PX_PER_METER, height: 0.3 * PX_PER_METER },
  { type: 'balance',   label: 'Balans',   symbol: '─', width: 4 * PX_PER_METER, height: 0.3 * PX_PER_METER },
  { type: 'weave',     label: 'Slalom',   symbol: '⫶', width: 6.6 * PX_PER_METER, height: 0.3 * PX_PER_METER },
  { type: 'tire',      label: 'Däck',     symbol: '◯', width: 0.6 * PX_PER_METER, height: 0.6 * PX_PER_METER },
  { type: 'start',     label: 'Start',    symbol: '▸', width: 1.2 * PX_PER_METER, height: 0.1 * PX_PER_METER },
  { type: 'finish',    label: 'Mål',      symbol: '◼', width: 1.2 * PX_PER_METER, height: 0.1 * PX_PER_METER },
];

const CANVAS_SIZES = [
  { label: '20×30 m', width: 20 * PX_PER_METER, height: 30 * PX_PER_METER },
  { label: '20×40 m', width: 20 * PX_PER_METER, height: 40 * PX_PER_METER },
  { label: '25×40 m', width: 25 * PX_PER_METER, height: 40 * PX_PER_METER },
  { label: '30×40 m', width: 30 * PX_PER_METER, height: 40 * PX_PER_METER },
];

const HANDLER_COLORS = [
  { label: 'Röd', value: 'hsl(0, 85%, 50%)' },
  { label: 'Blå', value: 'hsl(221, 79%, 48%)' },
  { label: 'Grön', value: 'hsl(142, 60%, 40%)' },
  { label: 'Orange', value: 'hsl(25, 100%, 55%)' },
  { label: 'Lila', value: 'hsl(270, 60%, 50%)' },
];

const NUMBERING_COLORS = [
  { label: 'Grön', value: '#22c55e', emoji: '🟢' },
  { label: 'Gul', value: '#eab308', emoji: '🟡' },
  { label: 'Blå', value: '#3b82f6', emoji: '🔵' },
  { label: 'Röd', value: '#ef4444', emoji: '🔴' },
  { label: 'Orange', value: '#f97316', emoji: '🟠' },
  { label: 'Vit', value: '#e5e5e5', emoji: '⚪' },
];


const PRESET_COURSES: { name: string; description: string; obstacles: Obstacle[] }[] = [
  {
    name: 'Nybörjarbana (6 hinder)',
    description: 'Enkel bana med hopp, tunnel och slalom',
    obstacles: [
      { id: 'p1', type: 'start', x: 200, y: 700, rotation: 0, label: 'Start', numbers: [], colorNumbers: [] },
      { id: 'p2', type: 'jump', x: 200, y: 600, rotation: 0, label: 'Hopp', numbers: [1], colorNumbers: [{ num: 1, color: '#22c55e' }] },
      { id: 'p3', type: 'tunnel', x: 200, y: 480, rotation: 0, label: 'Tunnel', numbers: [2], colorNumbers: [{ num: 2, color: '#22c55e' }], tunnelLength: 4, bendAngle: 0 },
      { id: 'p4', type: 'jump', x: 140, y: 350, rotation: 45, label: 'Hopp', numbers: [3], colorNumbers: [{ num: 3, color: '#22c55e' }] },
      { id: 'p5', type: 'weave', x: 250, y: 220, rotation: 0, label: 'Slalom', numbers: [4], colorNumbers: [{ num: 4, color: '#22c55e' }] },
      { id: 'p6', type: 'jump', x: 300, y: 120, rotation: 0, label: 'Hopp', numbers: [5], colorNumbers: [{ num: 5, color: '#22c55e' }] },
      { id: 'p7', type: 'finish', x: 200, y: 40, rotation: 0, label: 'Mål', numbers: [], colorNumbers: [] },
    ],
  },
  {
    name: 'Kontaktbana (8 hinder)',
    description: 'A-hinder, brygga, vipp och tunnel',
    obstacles: [
      { id: 'c1', type: 'start', x: 100, y: 720, rotation: 0, label: 'Start', numbers: [], colorNumbers: [] },
      { id: 'c2', type: 'jump', x: 100, y: 620, rotation: 0, label: 'Hopp', numbers: [1], colorNumbers: [{ num: 1, color: '#22c55e' }] },
      { id: 'c3', type: 'a_frame', x: 200, y: 500, rotation: 0, label: 'A-hinder', numbers: [2], colorNumbers: [{ num: 2, color: '#22c55e' }] },
      { id: 'c4', type: 'tunnel', x: 320, y: 380, rotation: 90, label: 'Tunnel', numbers: [3], colorNumbers: [{ num: 3, color: '#22c55e' }], tunnelLength: 6, bendAngle: 45 },
      { id: 'c5', type: 'dog_walk', x: 200, y: 280, rotation: 0, label: 'Brygga', numbers: [4], colorNumbers: [{ num: 4, color: '#22c55e' }] },
      { id: 'c6', type: 'seesaw', x: 120, y: 180, rotation: 0, label: 'Vipp', numbers: [5], colorNumbers: [{ num: 5, color: '#22c55e' }] },
      { id: 'c7', type: 'jump', x: 260, y: 120, rotation: 30, label: 'Hopp', numbers: [6], colorNumbers: [{ num: 6, color: '#22c55e' }] },
      { id: 'c8', type: 'weave', x: 300, y: 60, rotation: 0, label: 'Slalom', numbers: [7], colorNumbers: [{ num: 7, color: '#22c55e' }] },
      { id: 'c9', type: 'finish', x: 300, y: 20, rotation: 0, label: 'Mål', numbers: [], colorNumbers: [] },
    ],
  },
  {
    name: 'Klass 1-bana (12 hinder)',
    description: 'Typisk tävlingsbana för klass 1',
    obstacles: [
      { id: 'k1_s', type: 'start', x: 100, y: 750, rotation: 0, label: 'Start', numbers: [], colorNumbers: [] },
      { id: 'k1_1', type: 'jump', x: 100, y: 650, rotation: 0, label: 'Hopp', numbers: [1], colorNumbers: [{ num: 1, color: '#22c55e' }] },
      { id: 'k1_2', type: 'jump', x: 200, y: 560, rotation: 30, label: 'Hopp', numbers: [2], colorNumbers: [{ num: 2, color: '#22c55e' }] },
      { id: 'k1_3', type: 'tunnel', x: 300, y: 460, rotation: 90, label: 'Tunnel', numbers: [3], colorNumbers: [{ num: 3, color: '#22c55e' }], tunnelLength: 4, bendAngle: 30 },
      { id: 'k1_4', type: 'a_frame', x: 200, y: 360, rotation: 0, label: 'A-hinder', numbers: [4], colorNumbers: [{ num: 4, color: '#22c55e' }] },
      { id: 'k1_5', type: 'jump', x: 100, y: 280, rotation: -15, label: 'Hopp', numbers: [5], colorNumbers: [{ num: 5, color: '#22c55e' }] },
      { id: 'k1_6', type: 'weave', x: 250, y: 210, rotation: 0, label: 'Slalom', numbers: [6], colorNumbers: [{ num: 6, color: '#22c55e' }] },
      { id: 'k1_7', type: 'jump', x: 350, y: 140, rotation: 0, label: 'Hopp', numbers: [7], colorNumbers: [{ num: 7, color: '#22c55e' }] },
      { id: 'k1_8', type: 'dog_walk', x: 250, y: 80, rotation: 90, label: 'Brygga', numbers: [8], colorNumbers: [{ num: 8, color: '#22c55e' }] },
      { id: 'k1_9', type: 'jump', x: 150, y: 140, rotation: -30, label: 'Hopp', numbers: [9], colorNumbers: [{ num: 9, color: '#22c55e' }] },
      { id: 'k1_10', type: 'tire', x: 80, y: 200, rotation: 0, label: 'Däck', numbers: [10], colorNumbers: [{ num: 10, color: '#22c55e' }] },
      { id: 'k1_11', type: 'jump', x: 80, y: 120, rotation: 0, label: 'Hopp', numbers: [11], colorNumbers: [{ num: 11, color: '#22c55e' }] },
      { id: 'k1_12', type: 'jump', x: 150, y: 40, rotation: 0, label: 'Hopp', numbers: [12], colorNumbers: [{ num: 12, color: '#22c55e' }] },
      { id: 'k1_f', type: 'finish', x: 250, y: 40, rotation: 0, label: 'Mål', numbers: [], colorNumbers: [] },
    ],
  },
  {
    name: 'Klass 3-bana (18 hinder)',
    description: 'Avancerad bana med alla kontaktfält',
    obstacles: [
      { id: 'k3_s', type: 'start', x: 60, y: 750, rotation: 0, label: 'Start', numbers: [], colorNumbers: [] },
      { id: 'k3_1', type: 'jump', x: 60, y: 660, rotation: 0, label: 'Hopp', numbers: [1], colorNumbers: [{ num: 1, color: '#22c55e' }] },
      { id: 'k3_2', type: 'jump', x: 150, y: 580, rotation: 30, label: 'Hopp', numbers: [2], colorNumbers: [{ num: 2, color: '#22c55e' }] },
      { id: 'k3_3', type: 'tunnel', x: 280, y: 520, rotation: 0, label: 'Tunnel', numbers: [3], colorNumbers: [{ num: 3, color: '#22c55e' }], tunnelLength: 6, bendAngle: 60 },
      { id: 'k3_4', type: 'a_frame', x: 200, y: 420, rotation: 0, label: 'A-hinder', numbers: [4], colorNumbers: [{ num: 4, color: '#22c55e' }] },
      { id: 'k3_5', type: 'jump', x: 80, y: 360, rotation: -20, label: 'Hopp', numbers: [5], colorNumbers: [{ num: 5, color: '#22c55e' }] },
      { id: 'k3_6', type: 'jump', x: 150, y: 300, rotation: 10, label: 'Hopp', numbers: [6], colorNumbers: [{ num: 6, color: '#22c55e' }] },
      { id: 'k3_7', type: 'weave', x: 300, y: 260, rotation: 0, label: 'Slalom', numbers: [7], colorNumbers: [{ num: 7, color: '#22c55e' }] },
      { id: 'k3_8', type: 'seesaw', x: 200, y: 180, rotation: 90, label: 'Vipp', numbers: [8], colorNumbers: [{ num: 8, color: '#22c55e' }] },
      { id: 'k3_9', type: 'jump', x: 340, y: 180, rotation: 0, label: 'Hopp', numbers: [9], colorNumbers: [{ num: 9, color: '#22c55e' }] },
      { id: 'k3_10', type: 'tunnel', x: 350, y: 100, rotation: 90, label: 'Tunnel', numbers: [10], colorNumbers: [{ num: 10, color: '#22c55e' }], tunnelLength: 4, bendAngle: 0 },
      { id: 'k3_11', type: 'jump', x: 260, y: 120, rotation: -30, label: 'Hopp', numbers: [11], colorNumbers: [{ num: 11, color: '#22c55e' }] },
      { id: 'k3_12', type: 'tire', x: 180, y: 100, rotation: 0, label: 'Däck', numbers: [12], colorNumbers: [{ num: 12, color: '#22c55e' }] },
      { id: 'k3_13', type: 'dog_walk', x: 100, y: 100, rotation: 0, label: 'Brygga', numbers: [13], colorNumbers: [{ num: 13, color: '#22c55e' }] },
      { id: 'k3_14', type: 'jump', x: 60, y: 180, rotation: 0, label: 'Hopp', numbers: [14], colorNumbers: [{ num: 14, color: '#22c55e' }] },
      { id: 'k3_15', type: 'long_jump', x: 60, y: 260, rotation: 0, label: 'Långhopp', numbers: [15], colorNumbers: [{ num: 15, color: '#22c55e' }] },
      { id: 'k3_16', type: 'jump', x: 140, y: 60, rotation: 45, label: 'Hopp', numbers: [16], colorNumbers: [{ num: 16, color: '#22c55e' }] },
      { id: 'k3_17', type: 'jump', x: 260, y: 40, rotation: 0, label: 'Hopp', numbers: [17], colorNumbers: [{ num: 17, color: '#22c55e' }] },
      { id: 'k3_18', type: 'jump', x: 340, y: 40, rotation: 0, label: 'Hopp', numbers: [18], colorNumbers: [{ num: 18, color: '#22c55e' }] },
      { id: 'k3_f', type: 'finish', x: 380, y: 40, rotation: 0, label: 'Mål', numbers: [], colorNumbers: [] },
    ],
  },
  {
    name: 'Slalomträning',
    description: 'Fokus på slalom med hopp in/ut',
    obstacles: [
      { id: 'sl_1', type: 'jump', x: 200, y: 600, rotation: 0, label: 'Hopp', numbers: [1], colorNumbers: [{ num: 1, color: '#22c55e' }] },
      { id: 'sl_2', type: 'weave', x: 200, y: 460, rotation: 0, label: 'Slalom', numbers: [2], colorNumbers: [{ num: 2, color: '#22c55e' }] },
      { id: 'sl_3', type: 'jump', x: 200, y: 320, rotation: 0, label: 'Hopp', numbers: [3], colorNumbers: [{ num: 3, color: '#22c55e' }] },
      { id: 'sl_4', type: 'weave', x: 200, y: 180, rotation: 90, label: 'Slalom', numbers: [4], colorNumbers: [{ num: 4, color: '#22c55e' }] },
      { id: 'sl_5', type: 'jump', x: 200, y: 80, rotation: 0, label: 'Hopp', numbers: [5], colorNumbers: [{ num: 5, color: '#22c55e' }] },
    ],
  },
];

let idCounter = 0;
const nextId = () => `obs_${++idCounter}_${Date.now()}`;

function migrateObstacle(o: any): Obstacle {
  const nums: number[] = o.numbers && Array.isArray(o.numbers) ? o.numbers : (typeof o.number === 'number' && o.number > 0 ? [o.number] : []);
  const colorNums: NumberEntry[] = o.colorNumbers && Array.isArray(o.colorNumbers) ? o.colorNumbers : nums.map(n => ({ num: n, color: '#22c55e' }));
  return { ...o, numbers: nums, colorNumbers: colorNums, number: undefined };
}

/* ───── Hook: landscape detection ───── */

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  useEffect(() => {
    const handler = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  return isLandscape;
}

/* ───── Component ───── */

export default function CoursePlannerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [obstacles, setObstaclesRaw] = useState<Obstacle[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [courseName, setCourseName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [showDistances, setShowDistances] = useState(true);
  const [canvasSize, setCanvasSize] = useState(CANVAS_SIZES[1]);

  const [handlerPath, setHandlerPath] = useState<PathPoint[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [handlerColor, setHandlerColor] = useState(HANDLER_COLORS[0].value);
  const [handlerDashed, setHandlerDashed] = useState(true);

  const [numberingMode, setNumberingMode] = useState(false);
  const [nextNumberToAssign, setNextNumberToAssign] = useState(1);
  const [numberingColor, setNumberingColor] = useState(NUMBERING_COLORS[0].value);
  const [numberingHistory, setNumberingHistory] = useState<{ obsId: string; num: number; color: string }[]>([]);

  // Free numbers (placed anywhere on canvas)
  const [freeNumbers, setFreeNumbers] = useState<FreeNumber[]>([]);
  const [draggingNumber, setDraggingNumber] = useState<string | null>(null);
  const [numberDragOffset, setNumberDragOffset] = useState({ x: 0, y: 0 });

  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateStart, setRotateStart] = useState({ angle: 0, obsRotation: 0 });
  const [touchRotating, setTouchRotating] = useState(false);
  const [touchStartAngle, setTouchStartAngle] = useState(0);
  const [touchStartRotation, setTouchStartRotation] = useState(0);

  const [numberInput, setNumberInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showStartFinish, setShowStartFinish] = useState(false);
  const [showOrientationHint, setShowOrientationHint] = useState(false);

  // Obstacle color theme system
  const [activeThemeId, setActiveThemeId] = useState<string>(loadActiveThemeId);
  const [customOverrides, setCustomOverrides] = useState<ObstacleTheme>(loadCustomOverrides);
  const [showColorPanel, setShowColorPanel] = useState(false);

  // ── Feature 1: Undo/Redo History ──
  type HistoryEntry = { obstacles: Obstacle[]; handlerPath: PathPoint[]; label: string };
  const historyRef = useRef<HistoryEntry[]>([{ obstacles: [], handlerPath: [], label: 'Start' }]);
  const historyIndexRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0); // trigger re-renders
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const pushHistory = useCallback((obs: Obstacle[], path: PathPoint[], label: string) => {
    const h = historyRef.current;
    historyRef.current = h.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ obstacles: JSON.parse(JSON.stringify(obs)), handlerPath: JSON.parse(JSON.stringify(path)), label });
    if (historyRef.current.length > 30) historyRef.current = historyRef.current.slice(historyRef.current.length - 30);
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryVersion(v => v + 1);
  }, []);

  const setObstacles: typeof setObstaclesRaw = useCallback((updater) => {
    setObstaclesRaw(updater);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setObstaclesRaw(JSON.parse(JSON.stringify(entry.obstacles)));
    setHandlerPath(JSON.parse(JSON.stringify(entry.handlerPath)));
    setHistoryVersion(v => v + 1);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setObstaclesRaw(JSON.parse(JSON.stringify(entry.obstacles)));
    setHandlerPath(JSON.parse(JSON.stringify(entry.handlerPath)));
    setHistoryVersion(v => v + 1);
  }, []);

  const getRecentActions = useCallback((count = 8) => {
    const h = historyRef.current;
    const end = historyIndexRef.current + 1;
    const start = Math.max(1, end - count);
    return h.slice(start, end).map(e => e.label).reverse();
  }, [historyVersion]);

  // ── Feature 2: Snap-to-Grid + Magnetic snap ──
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const SNAP_STEP = 0.5 * PX_PER_METER; // 0.5m
  const MAGNETIC_DIST = 0.8 * PX_PER_METER; // snap within 0.8m of another obstacle

  const snapToGrid = useCallback((val: number) => {
    if (!snapEnabled) return val;
    return Math.round(val / SNAP_STEP) * SNAP_STEP;
  }, [snapEnabled]);

  const magneticSnap = useCallback((x: number, y: number, excludeId?: string): { x: number; y: number; snapped: boolean } => {
    if (!snapEnabled) return { x, y, snapped: false };
    let snappedX = snapToGrid(x);
    let snappedY = snapToGrid(y);
    let didSnap = false;
    for (const obs of obstacles) {
      if (obs.id === excludeId) continue;
      if (Math.abs(snappedX - obs.x) < MAGNETIC_DIST) { snappedX = obs.x; didSnap = true; }
      if (Math.abs(snappedY - obs.y) < MAGNETIC_DIST) { snappedY = obs.y; didSnap = true; }
    }
    return { x: snappedX, y: snappedY, snapped: didSnap };
  }, [snapEnabled, obstacles, snapToGrid]);

  // ── Feature 4: Copy/Paste ──
  const clipboardRef = useRef<Obstacle | null>(null);

  // ── Feature 5: Multi-select + Group operations ──
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [groupDragging, setGroupDragging] = useState(false);
  const [groupDragStart, setGroupDragStart] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // ── Feature 6: Minimap ──
  const [showMinimap, setShowMinimap] = useState(true);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // ── Feature 8: Measure tool ──
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<PathPoint[]>([]);

  // ── Feature 10: Unsaved changes ──
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>('');

  const activePreset = PRESET_THEMES.find(p => p.id === activeThemeId);
  const baseTheme = activePreset?.theme ?? STANDARD_THEME;
  const currentTheme: ObstacleTheme = { ...baseTheme, ...customOverrides };
  const isDarkCanvas = activePreset?.darkCanvas ?? false;

  const getTypeColors = (type: string): ObstacleColors => getObstacleColors(currentTheme, type);

  const handleSelectPreset = (id: string) => {
    setActiveThemeId(id);
    saveActiveThemeId(id);
    setCustomOverrides({});
    saveCustomOverrides({});
  };

  const handleSetTypeColor = (type: string, field: keyof ObstacleColors, color: string) => {
    setCustomOverrides(prev => {
      const base: ObstacleColors = { body: currentTheme[type]?.body ?? '#888', ...(prev[type] ?? {}) };
      const updated: ObstacleTheme = { ...prev, [type]: { ...base, [field]: color } };
      saveCustomOverrides(updated);
      return updated;
    });
  };

  const handleResetColors = () => {
    setActiveThemeId('standard');
    saveActiveThemeId('standard');
    setCustomOverrides({});
    saveCustomOverrides({});
    toast.success('Standardfärger återställda');
  };

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [pinchStartDist, setPinchStartDist] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const lastTapRef = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [shareOpen, setShareOpen] = useState(false);
  const [loadedCourseId, setLoadedCourseId] = useState<string | null>(null);
  const isLandscape = useIsLandscape();
  const isDesktop = !isMobile;
  const showLandscapeLayout = (isMobile && isLandscape) || isDesktop;

  // In landscape layout (desktop always, mobile when rotated), swap so the longer side is horizontal
  const rawW = canvasSize.width;
  const rawH = canvasSize.height;
  const shouldSwapForLandscape = showLandscapeLayout && rawH > rawW;
  const canvasWidth = shouldSwapForLandscape ? rawH : rawW;
  const canvasHeight = shouldSwapForLandscape ? rawW : rawH;
  const MARGIN = 28;

  // Portrait hint
  useEffect(() => {
    if (isMobile && !isLandscape) {
      setShowOrientationHint(true);
      const t = setTimeout(() => setShowOrientationHint(false), 5000);
      return () => clearTimeout(t);
    } else {
      setShowOrientationHint(false);
    }
  }, [isMobile, isLandscape]);


  useEffect(() => {
    supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setSavedCourses(data as unknown as SavedCourse[]);
    });
  }, []);

  // Fit-to-screen on mount
  useEffect(() => {
    fitToScreen();
  }, [canvasWidth, canvasHeight]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setZoom(0.75);
      setPanX(0);
      setPanY(0);
      return;
    }
    const cw = container.clientWidth;
    const ch = container.clientHeight || 500;
    const totalW = canvasWidth + MARGIN;
    const totalH = canvasHeight + MARGIN;
    const zx = cw / totalW;
    const zy = ch / totalH;
    const z = Math.min(zx, zy, 1) * 0.95;
    setZoom(z);
    setPanX((cw - totalW * z) / 2);
    setPanY((ch - totalH * z) / 2);
  }, [canvasWidth, canvasHeight]);

  // ResizeObserver for auto fit-to-screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => fitToScreen());
    ro.observe(container);
    return () => ro.disconnect();
  }, [fitToScreen]);
  const selectedObs = obstacles.find(o => o.id === selected);

  const distBetween = (a: Obstacle, b: Obstacle) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) * METERS_PER_PX;
  };

  /* ───── Drawing helpers ───── */

  const drawTunnel = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    const lengthM = obs.tunnelLength || 4;
    const length = lengthM * PX_PER_METER;
    const bendAngle = obs.bendAngle || 0;
    const tubeWidth = 0.6 * PX_PER_METER;
    const tc = getTypeColors('tunnel');
    const accentColor = tc.accent ?? tc.body;

    if (Math.abs(bendAngle) < 5) {
      ctx.strokeStyle = tc.body;
      ctx.lineWidth = tubeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = tubeWidth - 4;
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
      ctx.fillStyle = tc.body;
      ctx.beginPath(); ctx.arc(0, -length / 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, length / 2, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      const bendRad = (bendAngle * Math.PI) / 180;
      const radius = length / Math.abs(bendRad);
      const cx = bendAngle > 0 ? radius : -radius;
      const startAngle = bendAngle > 0 ? Math.PI : 0;
      const endAngle = startAngle - bendRad;
      const ccw = bendAngle > 0;

      ctx.strokeStyle = tc.body;
      ctx.lineWidth = tubeWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, ccw);
      ctx.stroke();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = tubeWidth - 4;
      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, ccw);
      ctx.stroke();

      ctx.fillStyle = tc.body;
      const entryX = cx + radius * Math.cos(startAngle);
      const entryY = radius * Math.sin(startAngle);
      const exitX = cx + radius * Math.cos(endAngle);
      const exitY = radius * Math.sin(endAngle);
      ctx.beginPath(); ctx.arc(entryX, entryY, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(exitX, exitY, 4, 0, Math.PI * 2); ctx.fill();
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const totalW = canvasWidth + MARGIN;
    const totalH = canvasHeight + MARGIN;
    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = isDarkCanvas ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // All drawing in MARGIN-translated space
    ctx.save();
    ctx.translate(MARGIN, 0);

    // Course area
    ctx.fillStyle = isDarkCanvas ? 'hsl(0, 0%, 10%)' : 'hsl(0, 0%, 97%)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Minor grid (1m)
    ctx.strokeStyle = isDarkCanvas ? 'hsl(0, 0%, 20%)' : 'hsl(0, 0%, 90%)';
    ctx.lineWidth = 0.3;
    for (let x = 0; x <= canvasWidth; x += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Major grid (5m)
    ctx.strokeStyle = isDarkCanvas ? 'hsl(0, 0%, 30%)' : 'hsl(0, 0%, 78%)';
    ctx.lineWidth = 0.8;
    const majorStep = GRID_STEP * 5;
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Coordinate labels
    ctx.fillStyle = 'hsl(0, 0%, 50%)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      ctx.fillText(`${Math.round(x / PX_PER_METER)}`, x, canvasHeight + MARGIN - 2);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      ctx.fillText(`${Math.round(y / PX_PER_METER)}`, -3, y);
    }

    // Scale indicator
    const scaleX = canvasWidth - 5 * PX_PER_METER - 8;
    const scaleY = canvasHeight - 8;
    ctx.strokeStyle = 'hsl(0, 0%, 40%)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY);
    ctx.lineTo(scaleX + 5 * PX_PER_METER, scaleY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleY - 3); ctx.lineTo(scaleX, scaleY + 3); ctx.stroke();
    ctx.moveTo(scaleX + 5 * PX_PER_METER, scaleY - 3); ctx.lineTo(scaleX + 5 * PX_PER_METER, scaleY + 3); ctx.stroke();
    ctx.fillStyle = 'hsl(0, 0%, 35%)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('5 m', scaleX + 2.5 * PX_PER_METER, scaleY - 3);

    // Distance lines between numbered obstacles
    const numberedObs = obstacles.filter(o => (o.colorNumbers || o.numbers || []).length > 0).sort((a, b) => {
      const aNums = a.colorNumbers?.length ? a.colorNumbers : a.numbers.map(n => ({ num: n, color: '#22c55e' }));
      const bNums = b.colorNumbers?.length ? b.colorNumbers : b.numbers.map(n => ({ num: n, color: '#22c55e' }));
      const aMin = Math.min(...aNums.map(e => e.num));
      const bMin = Math.min(...bNums.map(e => e.num));
      return aMin - bMin;
    });

    if (numberedObs.length > 1 && showDistances) {
      ctx.strokeStyle = 'hsl(0, 0%, 70%)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      numberedObs.forEach((obs, i) => {
        if (i === 0) ctx.moveTo(obs.x, obs.y);
        else ctx.lineTo(obs.x, obs.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 1; i < numberedObs.length; i++) {
        const a = numberedObs[i - 1];
        const b = numberedObs[i];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dist = distBetween(a, b);
        const text = `${dist.toFixed(1)}m`;
        const tw = ctx.measureText(text).width + 4;
        ctx.fillStyle = 'hsla(0, 0%, 100%, 0.9)';
        ctx.fillRect(mx - tw / 2, my - 5, tw, 10);
        ctx.fillStyle = 'hsl(0, 0%, 40%)';
        ctx.fillText(text, mx, my);
      }
    }

    // Draw obstacles
    obstacles.forEach(obs => {
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) return;

      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate((obs.rotation * Math.PI) / 180);

      const hw = info.width / 2;
      const hh = info.height / 2;

      if (obs.type === 'tunnel') {
        drawTunnel(ctx, obs);
      } else if (obs.type === 'tire') {
        const r = hw;
        const c = getTypeColors('tire');
        ctx.strokeStyle = c.body;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = c.accent ?? c.body;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
      } else if (obs.type === 'a_frame') {
        const c = getTypeColors('a_frame');
        ctx.strokeStyle = c.body;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-hw, hh); ctx.lineTo(0, -hh); ctx.lineTo(hw, hh);
        ctx.stroke();
        ctx.strokeStyle = c.contact ?? c.body;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(-hw * 0.5, hh * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, hh); ctx.lineTo(hw * 0.5, hh * 0.3); ctx.stroke();
      } else if (obs.type === 'dog_walk' || obs.type === 'balance') {
        const c = getTypeColors(obs.type);
        ctx.fillStyle = c.body;
        ctx.fillRect(-hw, -hh, info.width, info.height);
        const cz = 0.9 * PX_PER_METER;
        ctx.fillStyle = c.contact ?? c.body;
        ctx.fillRect(-hw, -hh, cz, info.height);
        ctx.fillRect(hw - cz, -hh, cz, info.height);
        ctx.strokeStyle = c.stroke ?? c.body;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'seesaw') {
        const c = getTypeColors('seesaw');
        ctx.fillStyle = c.body;
        ctx.fillRect(-hw, -hh, info.width, info.height);
        const cz = 0.9 * PX_PER_METER;
        ctx.fillStyle = c.contact ?? c.body;
        ctx.fillRect(-hw, -hh, cz, info.height);
        ctx.fillRect(hw - cz, -hh, cz, info.height);
        ctx.strokeStyle = c.stroke ?? c.body;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
        ctx.fillStyle = c.stroke ?? c.body;
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      } else if (obs.type === 'weave') {
        const c = getTypeColors('weave');
        const poleCount = 12;
        const spacing = info.width / (poleCount - 1);
        for (let i = 0; i < poleCount; i++) {
          ctx.fillStyle = i % 2 === 0 ? c.body : (c.accent ?? c.body);
          ctx.beginPath();
          ctx.arc(-hw + i * spacing, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.type === 'jump') {
        const c = getTypeColors('jump');
        ctx.strokeStyle = c.body;
        ctx.fillStyle = c.accent ?? c.body;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.fillRect(-hw - 1.5, -5, 3, 10);
        ctx.fillRect(hw - 1.5, -5, 3, 10);
      } else if (obs.type === 'long_jump') {
        const c = getTypeColors('long_jump');
        ctx.fillStyle = c.body;
        ctx.fillRect(-hw, -hh, info.width, info.height * 0.5);
        ctx.fillStyle = c.accent ?? c.body;
        ctx.fillRect(-hw, -hh + info.height * 0.5, info.width, info.height * 0.5);
      } else if (obs.type === 'oxer') {
        const c = getTypeColors('oxer');
        ctx.strokeStyle = c.body;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh); ctx.stroke();
        ctx.fillStyle = c.accent ?? c.body;
        ctx.fillRect(-hw - 1.5, -hh - 1.5, 3, info.height + 3);
        ctx.fillRect(hw - 1.5, -hh - 1.5, 3, info.height + 3);
      } else if (obs.type === 'wall') {
        const c = getTypeColors('wall');
        ctx.fillStyle = c.body;
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = c.accent ?? c.body;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = c.accent ?? c.body;
        ctx.lineWidth = 0.3;
        for (let r = -hh + 4; r < hh; r += 4) {
          ctx.beginPath(); ctx.moveTo(-hw, r); ctx.lineTo(hw, r); ctx.stroke();
        }
      } else if (obs.type === 'start') {
        const c = getTypeColors('start');
        ctx.strokeStyle = c.body;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -6); ctx.lineTo(-hw, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -6); ctx.lineTo(hw, 6); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else if (obs.type === 'finish') {
        const c = getTypeColors('finish');
        ctx.strokeStyle = c.body;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -6); ctx.lineTo(-hw, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -6); ctx.lineTo(hw, 6); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'hsl(0, 0%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
      }

      // Selection highlight
      const isMultiSel = multiSelected.has(obs.id);
      if (selected === obs.id || isMultiSel) {
        ctx.strokeStyle = isMultiSel ? 'hsl(200, 90%, 50%)' : 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        const selSize = Math.max(info.width, info.height, 20) / 2 + 6;
        ctx.strokeRect(-selSize, -selSize, selSize * 2, selSize * 2);
        ctx.setLineDash([]);

        // Rotation handle (only for primary selection)
        if (selected === obs.id) {
          const handleY = -selSize - 14;
          ctx.fillStyle = 'hsl(221, 79%, 48%)';
          ctx.beginPath(); ctx.arc(0, handleY, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'hsl(221, 79%, 48%)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, -selSize); ctx.lineTo(0, handleY + 6); ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⟳', 0, handleY);
        }
      }

      ctx.restore();

      // Color number labels
      const entries: NumberEntry[] = obs.colorNumbers?.length ? obs.colorNumbers : obs.numbers.map(n => ({ num: n, color: '#22c55e' }));
      if (entries.length > 0) {
        // Group by color
        const byColor = new Map<string, number[]>();
        for (const e of entries) {
          if (!byColor.has(e.color)) byColor.set(e.color, []);
          byColor.get(e.color)!.push(e.num);
        }

        const maxDim = Math.max((info?.height || 10) / 2, (info?.width || 10) / 2, 10);
        let offsetIdx = 0;
        for (const [color, nums] of byColor) {
          const sortedNums = [...nums].sort((a, b) => a - b);
          const numText = sortedNums.join('/');
          const nx = obs.x;
          const ny = obs.y - maxDim - 8 - offsetIdx * 16;

          ctx.font = 'bold 9px sans-serif';
          const tw = ctx.measureText(numText).width;
          const pillW = Math.max(tw + 8, 16);
          const pillH = 14;
          const pr = pillH / 2;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(nx - pillW / 2 + pr, ny - pr);
          ctx.arcTo(nx + pillW / 2, ny - pr, nx + pillW / 2, ny + pr, pr);
          ctx.arcTo(nx + pillW / 2, ny + pr, nx - pillW / 2, ny + pr, pr);
          ctx.arcTo(nx - pillW / 2, ny + pr, nx - pillW / 2, ny - pr, pr);
          ctx.arcTo(nx - pillW / 2, ny - pr, nx + pillW / 2, ny - pr, pr);
          ctx.closePath();
          ctx.fill();

          // Text color: white on dark colors, black on light
          const isLight = color === '#eab308' || color === '#e5e5e5';
          ctx.fillStyle = isLight ? '#000000' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(numText, nx, ny);
          offsetIdx++;
        }
      }
    });

    // Handler path
    if (handlerPath.length > 1) {
      ctx.strokeStyle = handlerColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (handlerDashed) ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(handlerPath[0].x, handlerPath[0].y);
      for (let i = 1; i < handlerPath.length - 1; i++) {
        const xc = (handlerPath[i].x + handlerPath[i + 1].x) / 2;
        const yc = (handlerPath[i].y + handlerPath[i + 1].y) / 2;
        ctx.quadraticCurveTo(handlerPath[i].x, handlerPath[i].y, xc, yc);
      }
      const last = handlerPath[handlerPath.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      if (handlerPath.length >= 2) {
        const p1 = handlerPath[handlerPath.length - 2];
        const p2 = last;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.fillStyle = handlerColor;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 8 * Math.cos(angle - 0.4), p2.y - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(p2.x - 8 * Math.cos(angle + 0.4), p2.y - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw free numbers (always on top)
    freeNumbers.forEach(fn => {
      const radius = 10;
      const isLight = fn.color === '#eab308' || fn.color === '#e5e5e5';

      // Circle background
      ctx.fillStyle = fn.color;
      ctx.beginPath();
      ctx.arc(fn.x, fn.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isLight ? 'hsl(0, 0%, 40%)' : 'hsla(0, 0%, 100%, 0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fn.x, fn.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Number text
      ctx.fillStyle = isLight ? '#000000' : '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(fn.num), fn.x, fn.y);

      // Highlight if being dragged
      if (draggingNumber === fn.id) {
        ctx.strokeStyle = 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(fn.x, fn.y, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // "1 ruta = 1 meter" label
    ctx.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
    ctx.fillRect(4, 4, 80, 14);
    ctx.fillStyle = 'hsl(0, 0%, 45%)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('1 ruta = 1 meter', 8, 6);

    // Measure tool rendering
    if (measurePoints.length > 0) {
      ctx.strokeStyle = 'hsl(50, 100%, 50%)';
      ctx.fillStyle = 'hsl(50, 100%, 50%)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      measurePoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      if (measurePoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(measurePoints[0].x, measurePoints[0].y);
        ctx.lineTo(measurePoints[1].x, measurePoints[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
        const dist = Math.sqrt(
          Math.pow(measurePoints[0].x - measurePoints[1].x, 2) +
          Math.pow(measurePoints[0].y - measurePoints[1].y, 2)
        ) * METERS_PER_PX;
        const mx = (measurePoints[0].x + measurePoints[1].x) / 2;
        const my = (measurePoints[0].y + measurePoints[1].y) / 2;
        const text = `${dist.toFixed(1)} m`;
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(text).width + 8;
        ctx.fillStyle = 'hsla(50, 100%, 50%, 0.9)';
        ctx.fillRect(mx - tw / 2, my - 10, tw, 20);
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, mx, my);
      }
      ctx.setLineDash([]);
    }

    ctx.restore(); // restore MARGIN translate
  }, [obstacles, selected, showDistances, canvasWidth, canvasHeight, handlerPath, handlerColor, handlerDashed, currentTheme, isDarkCanvas, multiSelected, measurePoints, freeNumbers, draggingNumber]);

  useEffect(() => { draw(); }, [draw]);

  // Minimap rendering
  useEffect(() => {
    const miniCanvas = minimapRef.current;
    if (!miniCanvas || !showMinimap) return;
    const ctx = miniCanvas.getContext('2d');
    if (!ctx) return;
    const mw = miniCanvas.width;
    const mh = miniCanvas.height;
    const sx = mw / canvasWidth;
    const sy = mh / canvasHeight;
    ctx.clearRect(0, 0, mw, mh);
    ctx.fillStyle = isDarkCanvas ? '#1a1a1a' : '#f5f5f5';
    ctx.fillRect(0, 0, mw, mh);
    // Draw obstacles as dots
    obstacles.forEach(obs => {
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) return;
      const c = getTypeColors(obs.type);
      ctx.fillStyle = c.body;
      ctx.fillRect(obs.x * sx - 1.5, obs.y * sy - 1.5, 3, 3);
    });
    // Draw viewport rectangle
    const container = containerRef.current;
    if (container) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const vx = (-panX / zoom) * sx;
      const vy = (-panY / zoom) * sy;
      const vw = (cw / zoom) * sx;
      const vh = (ch / zoom) * sy;
      ctx.strokeStyle = 'hsl(221, 79%, 48%)';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.max(0, vx), Math.max(0, vy), Math.min(vw, mw), Math.min(vh, mh));
    }
  }, [obstacles, zoom, panX, panY, canvasWidth, canvasHeight, showMinimap, isDarkCanvas]);

  /* ───── Interaction (with zoom/pan transform) ───── */

  const addObstacle = (type: string) => {
    const info = OBSTACLE_TYPES.find(o => o.type === type)!;
    const newObs: Obstacle = {
      id: nextId(), type, x: snapToGrid(canvasWidth / 2), y: snapToGrid(canvasHeight / 2),
      rotation: 0, label: info.label, numbers: [], colorNumbers: [],
      ...(type === 'tunnel' ? { tunnelLength: 4 as const, bendAngle: 0 } : {}),
    };
    setObstaclesRaw(prev => {
      const next = [...prev, newObs];
      pushHistory(next, handlerPath, `Lade till ${info.label}`);
      setIsDirty(true);
      return next;
    });
  };

  const findFreeNumberAt = (cx: number, cy: number): FreeNumber | null => {
    for (let i = freeNumbers.length - 1; i >= 0; i--) {
      const fn = freeNumbers[i];
      if (Math.hypot(cx - fn.x, cy - fn.y) <= 14) return fn;
    }
    return null;
  };

  const findObstacleAt = (cx: number, cy: number): Obstacle | null => {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) continue;
      const hitR = Math.max(info.width, info.height, 20) / 2 + 8;
      if (Math.abs(cx - obs.x) <= hitR && Math.abs(cy - obs.y) <= hitR) return obs;
    }
    return null;
  };

  const isOnRotationHandle = (cx: number, cy: number): boolean => {
    if (!selected) return false;
    const obs = obstacles.find(o => o.id === selected);
    if (!obs) return false;
    const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
    if (!info) return false;

    const selSize = Math.max(info.width, info.height, 20) / 2 + 6;
    const handleDist = selSize + 14;
    const rad = (obs.rotation * Math.PI) / 180;
    const localX = 0;
    const localY = -handleDist;
    const worldX = obs.x + localX * Math.cos(rad) - localY * Math.sin(rad);
    const worldY = obs.y + localX * Math.sin(rad) + localY * Math.cos(rad);

    return Math.hypot(cx - worldX, cy - worldY) <= 12;
  };

  // Convert screen coords to canvas world coords (accounting for zoom/pan)
  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    const canvas = canvasRef.current!;
    const container = containerRef.current;
    if (!container) {
      // fallback: direct canvas rect
      const rect = canvas.getBoundingClientRect();
      const totalW = canvasWidth + MARGIN;
      const totalH = canvasHeight + MARGIN;
      let clientX: number, clientY: number;
      if ('touches' in e && (e as any).touches.length > 0) {
        clientX = (e as any).touches[0].clientX; clientY = (e as any).touches[0].clientY;
      } else if ('changedTouches' in e && (e as any).changedTouches.length > 0) {
        clientX = (e as any).changedTouches[0].clientX; clientY = (e as any).changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as any).clientX; clientY = (e as any).clientY;
      } else return { x: 0, y: 0 };
      const rawX = (clientX - rect.left) * (totalW / rect.width) - MARGIN;
      const rawY = (clientY - rect.top) * (totalH / rect.height);
      return { x: rawX, y: rawY };
    }

    const rect = container.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e && (e as any).touches.length > 0) {
      clientX = (e as any).touches[0].clientX; clientY = (e as any).touches[0].clientY;
    } else if ('changedTouches' in e && (e as any).changedTouches.length > 0) {
      clientX = (e as any).changedTouches[0].clientX; clientY = (e as any).changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as any).clientX; clientY = (e as any).clientY;
    } else return { x: 0, y: 0 };

    // Screen pos relative to container
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    // Remove pan and zoom to get canvas-space coords, then remove MARGIN
    const canvasX = (sx - panX) / zoom - MARGIN;
    const canvasY = (sy - panY) / zoom;
    return { x: canvasX, y: canvasY };
  };

  const getClientPos = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if ('touches' in e && (e as any).touches.length > 0) {
      return { x: (e as any).touches[0].clientX, y: (e as any).touches[0].clientY };
    } else if ('clientX' in e) {
      return { x: (e as any).clientX, y: (e as any).clientY };
    }
    return { x: 0, y: 0 };
  };

  const getTouchDist = (e: React.TouchEvent | TouchEvent): number => {
    if (!('touches' in e) || (e as any).touches.length < 2) return 0;
    const t0 = (e as any).touches[0];
    const t1 = (e as any).touches[1];
    return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
  };

  const getTouchAngle = (e: React.TouchEvent | TouchEvent): number | null => {
    if (!('touches' in e) || (e as any).touches.length < 2) return null;
    const t0 = (e as any).touches[0];
    const t1 = (e as any).touches[1];
    return Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180 / Math.PI;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Two-finger: pinch zoom + rotate
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e);
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);

      // Also handle rotation if an obstacle is selected
      if (selected) {
        const angle = getTouchAngle(e);
        if (angle !== null) {
          const obs = obstacles.find(o => o.id === selected);
          if (obs) {
            setTouchRotating(true);
            setTouchStartAngle(angle);
            setTouchStartRotation(obs.rotation);
          }
        }
      }
      return;
    }

    const pos = getCanvasPos(e);

    if (drawingMode) {
      setIsDrawing(true);
      setHandlerPath([{ x: pos.x, y: pos.y }]);
      return;
    }

    if (numberingMode) {
      // Check if clicking on an existing free number to drag it
      const hitNum = findFreeNumberAt(pos.x, pos.y);
      if (hitNum) {
        setDraggingNumber(hitNum.id);
        setNumberDragOffset({ x: pos.x - hitNum.x, y: pos.y - hitNum.y });
        return;
      }
      // Place a new free number at the clicked position
      const newFN: FreeNumber = {
        id: `fn_${Date.now()}_${nextNumberToAssign}`,
        num: nextNumberToAssign,
        color: numberingColor,
        x: pos.x,
        y: pos.y,
      };
      setFreeNumbers(prev => [...prev, newFN]);
      setNumberingHistory(prev => [...prev, { obsId: newFN.id, num: nextNumberToAssign, color: numberingColor }]);
      setNextNumberToAssign(prev => prev + 1);
      setIsDirty(true);
      return;
    }

    // Double tap = zoom to 100%
    if ('touches' in e && e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap
        if (Math.abs(zoom - 1) < 0.05) {
          fitToScreen();
        } else {
          setZoom(1);
          const client = getClientPos(e);
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            setPanX(rect.width / 2 - (client.x - rect.left));
            setPanY(rect.height / 2 - (client.y - rect.top));
          }
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    }

    // Measure mode
    if (measureMode) {
      if (measurePoints.length < 2) {
        setMeasurePoints(prev => [...prev, { x: pos.x, y: pos.y }]);
      } else {
        setMeasurePoints([{ x: pos.x, y: pos.y }]);
      }
      return;
    }

    if (isOnRotationHandle(pos.x, pos.y)) {
      const obs = obstacles.find(o => o.id === selected)!;
      const angle = Math.atan2(pos.y - obs.y, pos.x - obs.x) * 180 / Math.PI;
      setRotatingId(selected);
      setRotateStart({ angle, obsRotation: obs.rotation });
      return;
    }

    const obs = findObstacleAt(pos.x, pos.y);
    if (obs) {
      // Shift+click for multi-select (desktop)
      if ('shiftKey' in e && (e as React.MouseEvent).shiftKey) {
        setMultiSelected(prev => {
          const next = new Set(prev);
          if (next.has(obs.id)) next.delete(obs.id);
          else next.add(obs.id);
          return next;
        });
        return;
      }

      // Mobile: multi-select mode tap
      if (multiSelectMode) {
        setMultiSelected(prev => {
          const next = new Set(prev);
          if (next.has(obs.id)) next.delete(obs.id);
          else next.add(obs.id);
          return next;
        });
        return;
      }

      // If clicking a multi-selected obstacle, start group drag
      if (multiSelected.has(obs.id) && multiSelected.size > 0) {
        setGroupDragging(true);
        setGroupDragStart({ x: pos.x, y: pos.y });
        return;
      }

      // Mobile: long-press to enter multi-select mode
      if ('touches' in e) {
        longPressTimer.current = setTimeout(() => {
          setMultiSelectMode(true);
          setMultiSelected(new Set([obs.id]));
          longPressTimer.current = null;
        }, 500);
      }

      setSelected(obs.id);
      setMultiSelected(new Set());
      setDragging(obs.id);
      setDragOffset({ x: pos.x - obs.x, y: pos.y - obs.y });
    } else {
      setSelected(null);
      setMultiSelected(new Set());
      setMultiSelectMode(false);
      // Start panning
      const client = getClientPos(e);
      setIsPanning(true);
      setPanStart({ x: client.x, y: client.y, panX, panY });
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    // Two-finger pinch zoom + rotation
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e);
      if (pinchStartDist > 0) {
        const newZoom = Math.max(0.2, Math.min(3, pinchStartZoom * (dist / pinchStartDist)));
        setZoom(newZoom);
      }
      if (touchRotating && selected) {
        const angle = getTouchAngle(e);
        if (angle !== null) {
          const delta = angle - touchStartAngle;
          setObstacles(prev => prev.map(o =>
            o.id === selected ? { ...o, rotation: (touchStartRotation + delta + 360) % 360 } : o
          ));
        }
      }
      return;
    }

    if (drawingMode && isDrawing) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const last = handlerPath[handlerPath.length - 1];
      if (last && Math.hypot(pos.x - last.x, pos.y - last.y) > 3) {
        setHandlerPath(prev => [...prev, { x: pos.x, y: pos.y }]);
      }
      return;
    }

    if (rotatingId) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const obs = obstacles.find(o => o.id === rotatingId);
      if (obs) {
        const angle = Math.atan2(pos.y - obs.y, pos.x - obs.x) * 180 / Math.PI;
        const delta = angle - rotateStart.angle;
        setObstacles(prev => prev.map(o =>
          o.id === rotatingId ? { ...o, rotation: (rotateStart.obsRotation + delta + 360) % 360 } : o
        ));
      }
      return;
    }

    // Dragging a free number
    if (draggingNumber) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      setFreeNumbers(prev => prev.map(fn =>
        fn.id === draggingNumber ? { ...fn, x: pos.x - numberDragOffset.x, y: pos.y - numberDragOffset.y } : fn
      ));
      return;
    }

    // Group drag
    if (groupDragging && multiSelected.size > 0) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const dx = pos.x - groupDragStart.x;
      const dy = pos.y - groupDragStart.y;
      setObstaclesRaw(prev => prev.map(o => {
        if (!multiSelected.has(o.id)) return o;
        return { ...o, x: snapToGrid(o.x + dx), y: snapToGrid(o.y + dy) };
      }));
      setGroupDragStart({ x: pos.x, y: pos.y });
      return;
    }

    if (dragging) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const rawX = pos.x - dragOffset.x;
      const rawY = pos.y - dragOffset.y;
      const { x: newX, y: newY } = magneticSnap(rawX, rawY, dragging);
      setObstaclesRaw(prev => prev.map(o =>
        o.id === dragging ? { ...o, x: newX, y: newY } : o
      ));
      return;
    }

    if (isPanning) {
      e.preventDefault();
      const client = getClientPos(e);
      setPanX(panStart.panX + (client.x - panStart.x));
      setPanY(panStart.panY + (client.y - panStart.y));
      return;
    }
  };

  const handlePointerUp = () => {
    // Cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Push history on drag end
    if (dragging) {
      const obs = obstacles.find(o => o.id === dragging);
      pushHistory(obstacles, handlerPath, `Flyttade ${obs?.label || 'hinder'}`);
      setIsDirty(true);
    }
    if (groupDragging) {
      pushHistory(obstacles, handlerPath, `Flyttade ${multiSelected.size} hinder`);
      setIsDirty(true);
    }
    if (draggingNumber) {
      setIsDirty(true);
    }
    if (rotatingId) {
      const obs = obstacles.find(o => o.id === rotatingId);
      pushHistory(obstacles, handlerPath, `Roterade ${obs?.label || 'hinder'}`);
      setIsDirty(true);
    }
    if (isDrawing && handlerPath.length > 1) {
      pushHistory(obstacles, handlerPath, 'Ritade förarlinje');
      setIsDirty(true);
    }
    setDragging(null);
    setDraggingNumber(null);
    setIsDrawing(false);
    setRotatingId(null);
    setTouchRotating(false);
    setIsPanning(false);
    setPinchStartDist(0);
    setGroupDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(3, zoom * delta));

    // Zoom towards mouse position
    const wx = (mx - panX) / zoom;
    const wy = (my - panY) / zoom;
    setPanX(mx - wx * newZoom);
    setPanY(my - wy * newZoom);
    setZoom(newZoom);
  }, [zoom, panX, panY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Keyboard shortcuts: Ctrl+0 = fit, Ctrl+Z = undo, Ctrl+Y = redo, Ctrl+C/V = copy/paste, Del = delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fitToScreen();
      }
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selected) {
        e.preventDefault();
        const obs = obstacles.find(o => o.id === selected);
        if (obs) clipboardRef.current = JSON.parse(JSON.stringify(obs));
      }
      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboardRef.current) {
        e.preventDefault();
        const copy = { ...JSON.parse(JSON.stringify(clipboardRef.current)), id: nextId(), x: clipboardRef.current.x + 20, y: clipboardRef.current.y + 20 };
        setObstaclesRaw(prev => {
          const next = [...prev, copy];
          pushHistory(next, handlerPath, `Klistrade in ${copy.label}`);
          setIsDirty(true);
          return next;
        });
        setSelected(copy.id);
      }
      // Delete
      if (e.key === 'Delete' && selected) {
        const obs = obstacles.find(o => o.id === selected);
        setObstaclesRaw(prev => {
          const next = prev.filter(o => o.id !== selected);
          pushHistory(next, handlerPath, `Raderade ${obs?.label || 'hinder'}`);
          setIsDirty(true);
          return next;
        });
        setSelected(null);
      }
      // Escape
      if (e.key === 'Escape') {
        setSelected(null);
        setMultiSelected(new Set());
        setMeasureMode(false);
        setMeasurePoints([]);
        setDrawingMode(false);
        setNumberingMode(false);
      }
      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fitToScreen, handleUndo, handleRedo, selected, obstacles, handlerPath, pushHistory]);

  const rotateSelected = () => {
    if (!selected) return;
    const obs = obstacles.find(o => o.id === selected);
    setObstaclesRaw(prev => {
      const next = prev.map(o =>
        o.id === selected ? { ...o, rotation: (o.rotation + 15) % 360 } : o
      );
      pushHistory(next, handlerPath, `Roterade ${obs?.label || 'hinder'}`);
      setIsDirty(true);
      return next;
    });
  };

  const deleteSelected = () => {
    if (!selected) return;
    const obs = obstacles.find(o => o.id === selected);
    setObstaclesRaw(prev => {
      const next = prev.filter(o => o.id !== selected);
      pushHistory(next, handlerPath, `Raderade ${obs?.label || 'hinder'}`);
      setIsDirty(true);
      return next;
    });
    setSelected(null);
  };

  const addNumberToSelected = (num: number) => {
    if (!selected || num <= 0) return;
    setObstacles(prev => prev.map(o => {
      if (o.id !== selected) return o;
      if (o.numbers.includes(num)) return o;
      const newColorNums = [...(o.colorNumbers || []), { num, color: '#22c55e' }];
      return { ...o, numbers: [...o.numbers, num].sort((a, b) => a - b), colorNumbers: newColorNums };
    }));
  };

  const removeNumberFromSelected = (num: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o => {
      if (o.id !== selected) return o;
      return {
        ...o,
        numbers: o.numbers.filter(n => n !== num),
        colorNumbers: (o.colorNumbers || []).filter(e => e.num !== num),
      };
    }));
  };

  const updateTunnelBend = (delta: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected && o.type === 'tunnel'
        ? { ...o, bendAngle: Math.max(-360, Math.min(360, (o.bendAngle || 0) + delta)) }
        : o
    ));
  };

  const setTunnelBend = (angle: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected && o.type === 'tunnel'
        ? { ...o, bendAngle: angle }
        : o
    ));
  };

  // ── Group rotate ──
  const rotateGroup = (delta: number) => {
    if (multiSelected.size === 0) return;
    const selectedObs = obstacles.filter(o => multiSelected.has(o.id));
    if (selectedObs.length === 0) return;
    const cx = selectedObs.reduce((s, o) => s + o.x, 0) / selectedObs.length;
    const cy = selectedObs.reduce((s, o) => s + o.y, 0) / selectedObs.length;
    const rad = (delta * Math.PI) / 180;
    setObstaclesRaw(prev => {
      const next = prev.map(o => {
        if (!multiSelected.has(o.id)) return o;
        const dx = o.x - cx;
        const dy = o.y - cy;
        return {
          ...o,
          x: snapToGrid(cx + dx * Math.cos(rad) - dy * Math.sin(rad)),
          y: snapToGrid(cy + dx * Math.sin(rad) + dy * Math.cos(rad)),
          rotation: (o.rotation + delta + 360) % 360,
        };
      });
      pushHistory(next, handlerPath, `Roterade ${multiSelected.size} hinder`);
      setIsDirty(true);
      return next;
    });
  };

  const deleteMultiSelected = () => {
    if (multiSelected.size === 0) return;
    setObstaclesRaw(prev => {
      const next = prev.filter(o => !multiSelected.has(o.id));
      pushHistory(next, handlerPath, `Raderade ${multiSelected.size} hinder`);
      setIsDirty(true);
      return next;
    });
    setMultiSelected(new Set());
    setMultiSelectMode(false);
  };

  const toggleTunnelLength = () => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected && o.type === 'tunnel'
        ? { ...o, tunnelLength: o.tunnelLength === 4 ? 6 : 4 }
        : o
    ));
  };

  const setRotationManual = (deg: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected ? { ...o, rotation: ((deg % 360) + 360) % 360 } : o
    ));
  };

  const clearNumbering = () => {
    setObstacles(prev => prev.map(o => ({ ...o, numbers: [], colorNumbers: [] })));
    setFreeNumbers([]);
    setNextNumberToAssign(1);
    setNumberingHistory([]);
  };

  const clearColorNumbering = (color: string) => {
    setObstacles(prev => prev.map(o => {
      const newColorNums = (o.colorNumbers || []).filter(e => e.color !== color);
      const newNums = [...new Set(newColorNums.map(e => e.num))].sort((a, b) => a - b);
      return { ...o, colorNumbers: newColorNums, numbers: newNums };
    }));
    setFreeNumbers(prev => prev.filter(fn => fn.color !== color));
    setNumberingHistory(prev => prev.filter(h => h.color !== color));
  };

  const undoLastNumber = () => {
    if (numberingHistory.length === 0) return;
    const last = numberingHistory[numberingHistory.length - 1];
    // Check if it's a free number
    if (last.obsId.startsWith('fn_')) {
      setFreeNumbers(prev => prev.filter(fn => fn.id !== last.obsId));
    } else {
      setObstacles(prev => prev.map(o => {
        if (o.id !== last.obsId) return o;
        const arr = o.colorNumbers || [];
        let idx = -1;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i].num === last.num && arr[i].color === last.color) { idx = i; break; }
        }
        if (idx < 0) return o;
        const newColorNums = [...(o.colorNumbers || [])];
        newColorNums.splice(idx, 1);
        const newNums = [...new Set(newColorNums.map(e => e.num))].sort((a, b) => a - b);
        return { ...o, colorNumbers: newColorNums, numbers: newNums };
      }));
    }
    setNumberingHistory(prev => prev.slice(0, -1));
    setNextNumberToAssign(prev => Math.max(1, prev - 1));
  };

  /* ───── Feature 4: Copy obstacle ───── */

  const copySelected = () => {
    if (!selected) return;
    const obs = obstacles.find(o => o.id === selected);
    if (obs) {
      const copy: Obstacle = { ...JSON.parse(JSON.stringify(obs)), id: nextId(), x: obs.x + 20, y: obs.y + 20 };
      setObstaclesRaw(prev => {
        const next = [...prev, copy];
        pushHistory(next, handlerPath, `Kopierade ${obs.label}`);
        setIsDirty(true);
        return next;
      });
      setSelected(copy.id);
    }
  };

  /* ───── Feature 9: Course stats ───── */

  const courseStats = useMemo(() => {
    const total = obstacles.filter(o => o.type !== 'start' && o.type !== 'finish').length;
    const contactCount = obstacles.filter(o => CONTACT_TYPES.includes(o.type)).length;

    // Calculate course length from numbered obstacles
    const numberedObs = obstacles
      .filter(o => (o.colorNumbers || o.numbers || []).length > 0)
      .sort((a, b) => {
        const aMin = Math.min(...(a.colorNumbers?.map(e => e.num) || a.numbers));
        const bMin = Math.min(...(b.colorNumbers?.map(e => e.num) || b.numbers));
        return aMin - bMin;
      });

    let length = 0;
    for (let i = 1; i < numberedObs.length; i++) {
      const a = numberedObs[i - 1];
      const b = numberedObs[i];
      length += Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) * METERS_PER_PX;
    }

    // Check proximity warnings
    const warnings: string[] = [];
    for (const rule of MIN_DISTANCES) {
      const typeA = obstacles.filter(o => o.type === rule.types[0]);
      const typeB = rule.types[0] === rule.types[1] ? typeA : obstacles.filter(o => o.type === rule.types[1]);
      for (const a of typeA) {
        for (const b of typeB) {
          if (a.id === b.id) continue;
          const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) * METERS_PER_PX;
          if (dist < rule.minMeters) {
            warnings.push(`⚠️ ${rule.label} för nära! (${dist.toFixed(1)}m, min ${rule.minMeters}m)`);
          }
        }
      }
    }

    return { total, contactCount, length, warnings };
  }, [obstacles]);

  /* ───── Feature 10: Unsaved changes warning ───── */

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);


  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      const el = fullscreenContainerRef.current || document.documentElement;
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) setTimeout(() => fitToScreen(), 100);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [fitToScreen]);

  /* ───── Visibility change (prevent white screen after sleep) ───── */

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        requestAnimationFrame(() => draw());
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [draw]);

  /* ───── Save/Load ───── */

  const handleSave = async () => {
    if (!courseName.trim()) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from('saved_courses').insert({
      user_id: userId, name: courseName.trim(),
      course_data: { obstacles, handlerPath, freeNumbers, themeId: activeThemeId, customOverrides } as any,
      canvas_width: rawW, canvas_height: rawH,
    });
    if (error) { toast.error('Kunde inte spara'); }
    else {
      toast.success('Bana sparad!');
      setSaveOpen(false); setCourseName('');
      setIsDirty(false);
      const { data } = await supabase.from('saved_courses').select('*').order('created_at', { ascending: false });
      if (data) setSavedCourses(data as unknown as SavedCourse[]);
    }
  };

  const loadCourse = (course: SavedCourse) => {
    const data = course.course_data as any;
    let loadedObstacles: Obstacle[];
    let loadedPath: PathPoint[] = [];
    if (Array.isArray(data)) {
      loadedObstacles = data.map(migrateObstacle);
    } else {
      loadedObstacles = (data.obstacles || []).map(migrateObstacle);
      loadedPath = data.handlerPath || [];
    }
    setObstaclesRaw(loadedObstacles);
    setHandlerPath(loadedPath);
    setFreeNumbers(data.freeNumbers || []);
    // Reset history on load
    historyRef.current = [{ obstacles: JSON.parse(JSON.stringify(loadedObstacles)), handlerPath: JSON.parse(JSON.stringify(loadedPath)), label: 'Start' }];
    historyIndexRef.current = 0;
    setHistoryVersion(v => v + 1);
    setIsDirty(false);
    // Restore color theme if saved
    if (data.themeId) {
      setActiveThemeId(data.themeId);
      saveActiveThemeId(data.themeId);
    }
    if (data.customOverrides && typeof data.customOverrides === 'object') {
      setCustomOverrides(data.customOverrides);
      saveCustomOverrides(data.customOverrides);
    } else if (data.themeId) {
      setCustomOverrides({});
      saveCustomOverrides({});
    }
    if (course.canvas_width && course.canvas_height) {
      const match = CANVAS_SIZES.find(s => s.width === course.canvas_width && s.height === course.canvas_height);
      if (match) setCanvasSize(match);
    }
    setLoadOpen(false);
    setLoadedCourseId(course.id);
    toast.success(`Laddade "${course.name}"`);
  };

  const handleDeleteCourse = async (id: string) => {
    await supabase.from('saved_courses').delete().eq('id', id);
    setSavedCourses(prev => prev.filter(c => c.id !== id));
    toast.success('Bana raderad');
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const padding = 40;
    const headerH = 48;
    const footerH = 36;
    const totalW = canvasWidth + MARGIN + padding * 2;
    const totalH = canvasHeight + MARGIN + padding * 2 + headerH + footerH;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalW * dpr;
    exportCanvas.height = totalH * dpr;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);
    ctx.fillStyle = 'hsl(221, 79%, 48%)';
    ctx.fillRect(0, 0, totalW, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐕 AgilityManager – Banplanerare', padding, headerH / 2);
    const widthM = Math.round(canvasWidth / PX_PER_METER);
    const heightM = Math.round(canvasHeight / PX_PER_METER);
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${widthM} × ${heightM} m`, totalW - padding, headerH / 2);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, padding, headerH + padding, canvasWidth + MARGIN, canvasHeight + MARGIN);
    const footerY = totalH - footerH;
    ctx.fillStyle = 'hsl(210, 22%, 96%)';
    ctx.fillRect(0, footerY, totalW, footerH);
    ctx.fillStyle = 'hsl(0, 0%, 45%)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Skapad med AgilityManager · agilitymanager.se', totalW / 2, footerY + footerH / 2);
    const link = document.createElement('a');
    link.download = 'agility-bana.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    toast.success('Bana exporterad som PNG');
  };

  const exportJSON = () => {
    const data = JSON.stringify({ obstacles, handlerPath, freeNumbers, canvasWidth: rawW, canvasHeight: rawH }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'agility-bana.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Bana exporterad som JSON');
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.obstacles && Array.isArray(parsed.obstacles)) {
          setObstacles(parsed.obstacles.map(migrateObstacle));
          setHandlerPath(parsed.handlerPath || []);
          setFreeNumbers(parsed.freeNumbers || []);
          if (parsed.canvasWidth && parsed.canvasHeight) {
            const match = CANVAS_SIZES.find(s => s.width === parsed.canvasWidth && s.height === parsed.canvasHeight);
            if (match) setCanvasSize(match);
          }
          toast.success('Bana importerad!');
        } else { toast.error('Ogiltig fil'); }
      } catch { toast.error('Kunde inte läsa filen'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadPreset = (preset: typeof PRESET_COURSES[0]) => {
    const loaded = preset.obstacles.map(o => ({ ...o, id: nextId() }));
    setObstaclesRaw(loaded);
    setHandlerPath([]);
    historyRef.current = [{ obstacles: JSON.parse(JSON.stringify(loaded)), handlerPath: [], label: 'Start' }];
    historyIndexRef.current = 0;
    setHistoryVersion(v => v + 1);
    setIsDirty(false);
    setLoadOpen(false);
    toast.success(`Laddade "${preset.name}"`);
  };

  const isPremium = usePremium();

  /* ───── Obstacle palette (shared) ───── */

  const obstaclePalette = (vertical: boolean) => {
    const types = showStartFinish
      ? OBSTACLE_TYPES
      : OBSTACLE_TYPES.filter(o => o.type !== 'start' && o.type !== 'finish');
    return (
      <TooltipProvider delayDuration={300}>
        <div className={vertical
          ? "flex flex-col gap-1 overflow-y-auto py-1 px-0.5"
          : "grid grid-cols-5 sm:grid-cols-7 gap-1.5"
        }>
          {types.map(o => {
            const info = OBSTACLE_INFO[o.type];
            return (
              <Tooltip key={o.type}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => addObstacle(o.type)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg font-medium bg-card shadow-card border border-border hover:border-primary active:scale-95 transition-all ${
                      vertical ? 'px-1 py-1 text-[9px] min-h-[44px] min-w-[44px]' : 'px-1 py-1.5 text-[10px] min-h-[44px]'
                    }`}
                  >
                    <span className={vertical ? "text-sm leading-none" : "text-base leading-none"}>{o.symbol}</span>
                    {!vertical && o.label}
                    {vertical && <span className="truncate w-full text-center">{o.label}</span>}
                  </button>
                </TooltipTrigger>
                {info && (
                  <TooltipContent side={vertical ? "left" : "top"} className="max-w-[200px]">
                    <p className="font-semibold text-xs">{o.label}</p>
                    <p className="text-[10px] text-muted-foreground">{info.dimensions}</p>
                    <p className="text-[10px] text-muted-foreground">{info.classes}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  /* ───── Numbering toolbar (shared) ───── */

  const numberingToolbar = (compact: boolean) => (
    <div className={`flex ${compact ? 'flex-col gap-1 p-1' : 'gap-1.5 items-center flex-wrap'}`}>
      <div className={`flex ${compact ? 'flex-wrap gap-0.5' : 'gap-1'} items-center`}>
        {NUMBERING_COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => setNumberingColor(c.value)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${numberingColor === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>
      <span className={`${compact ? 'text-[9px]' : 'text-xs'} font-medium text-foreground`}>
        Nästa: {nextNumberToAssign}
      </span>
      <button onClick={undoLastNumber} disabled={numberingHistory.length === 0}
        className={`${compact ? 'text-[9px] px-1 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 flex items-center gap-0.5`}>
        <Undo2 size={compact ? 8 : 10} /> Ångra
      </button>
      <button onClick={clearNumbering}
        className={`${compact ? 'text-[9px] px-1 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full border border-border text-muted-foreground hover:text-destructive`}>
        Rensa alla
      </button>
      {!compact && (
        <div className="flex gap-1">
          {NUMBERING_COLORS.filter(c => {
            return obstacles.some(o => (o.colorNumbers || []).some(e => e.color === c.value));
          }).map(c => (
            <button key={c.value} onClick={() => clearColorNumbering(c.value)}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:text-destructive flex items-center gap-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.value }} />
              ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ───── Zoom controls (shared) ───── */

  const zoomControls = (compact: boolean) => (
    <div className={`flex ${compact ? 'flex-col' : ''} items-center gap-0.5`}>
      <button onClick={() => setZoom(z => Math.min(3, z * 1.2))}
        className="p-1 rounded hover:bg-secondary transition-colors" title="Zooma in">
        <ZoomIn size={compact ? 12 : 14} />
      </button>
      <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-muted-foreground font-medium`}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}
        className="p-1 rounded hover:bg-secondary transition-colors" title="Zooma ut">
        <ZoomOut size={compact ? 12 : 14} />
      </button>
      <button onClick={fitToScreen}
        className="p-1 rounded hover:bg-secondary transition-colors" title="Anpassa till skärm">
        <Maximize2 size={compact ? 12 : 14} />
      </button>
    </div>
  );

  /* ───── Canvas element ───── */

  const canvasElement = (
    <canvas
      ref={canvasRef}
      style={{
        width: canvasWidth + MARGIN,
        height: canvasHeight + MARGIN,
        display: 'block',
        cursor: drawingMode ? 'crosshair' : numberingMode ? 'cell' : rotatingId ? 'grabbing' : dragging ? 'grabbing' : isPanning ? 'grabbing' : 'grab',
        transformOrigin: '0 0',
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        pointerEvents: 'auto',
      }}
    />
  );

  // Fullscreen landscape layout
  if (isFullscreen || showLandscapeLayout) {
    return (
      <div ref={fullscreenContainerRef} className="fixed inset-0 z-50 bg-background flex">
        {/* Main canvas area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          style={{ touchAction: 'none' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {canvasElement}
          {/* Close fullscreen button */}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow-sm border border-border transition-colors"
              title="Avsluta fullskärm"
            >
              <Minimize size={16} />
            </button>
          )}
          {/* Zoom indicator */}
          <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/80 rounded px-1.5 py-0.5">
            {Math.round(zoom * 100)}%
          </div>

          {/* Selected obstacle controls overlay (inside fullscreen container) */}
          {selectedObs && !numberingMode && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg flex gap-2 items-center flex-wrap max-w-[90vw]"
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              <button onClick={rotateSelected} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors" title="Rotera 15°">
                <RotateCcw size={14} />
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">°</span>
                <input
                  type="number"
                  value={Math.round(selectedObs.rotation)}
                  onChange={e => setRotationManual(parseInt(e.target.value) || 0)}
                  className="w-12 h-6 text-xs text-center bg-secondary border border-border rounded"
                />
              </div>
              <button onClick={deleteSelected} className="p-1.5 rounded bg-secondary hover:bg-destructive/20 text-destructive transition-colors" title="Radera">
                <Trash2 size={14} />
              </button>
              <button onClick={copySelected} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors" title="Kopiera">
                <Copy size={14} />
              </button>

              {selectedObs.type === 'tunnel' && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={toggleTunnelLength} className="text-[10px] px-2 py-1 rounded bg-secondary border border-border font-medium">
                    {selectedObs.tunnelLength || 4}m
                  </button>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Böj:</span>
                    <button onClick={() => updateTunnelBend(-15)} className="p-1 rounded bg-secondary hover:bg-secondary/80">
                      <Minus size={10} />
                    </button>
                    <span className="text-[10px] font-medium w-8 text-center">{selectedObs.bendAngle || 0}°</span>
                    <button onClick={() => updateTunnelBend(15)} className="p-1 rounded bg-secondary hover:bg-secondary/80">
                      <Plus size={10} />
                    </button>
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {[0, 45, 90, 180].map(a => (
                      <button
                        key={a}
                        onClick={() => setTunnelBend(a)}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                          (selectedObs.bendAngle || 0) === a
                            ? 'bg-primary/15 border-primary text-primary'
                            : 'bg-secondary border-border text-muted-foreground'
                        }`}
                      >
                        {a === 0 ? 'Rak' : a === 180 ? 'U' : `${a}°`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={-360}
                    max={360}
                    step={5}
                    value={selectedObs.bendAngle || 0}
                    onChange={e => setTunnelBend(Number(e.target.value))}
                    className="w-24 h-1.5 accent-primary"
                    onMouseDown={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                  />
                </>
              )}
            </div>
          )}

          {/* Multi-select controls overlay */}
          {multiSelected.size > 0 && !numberingMode && !selectedObs && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-primary/30 rounded-lg p-2 shadow-lg flex gap-2 items-center"
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            >
              <span className="text-[10px] font-medium text-primary">{multiSelected.size} markerade</span>
              <button onClick={() => rotateGroup(15)} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors" title="Rotera grupp 15°">
                <RotateCcw size={14} />
              </button>
              <button onClick={deleteMultiSelected} className="p-1.5 rounded bg-secondary hover:bg-destructive/20 text-destructive transition-colors" title="Radera markerade">
                <Trash2 size={14} />
              </button>
              <button onClick={() => { setMultiSelected(new Set()); setMultiSelectMode(false); }} className="p-1.5 rounded bg-secondary hover:bg-secondary/80 transition-colors" title="Avmarkera">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Multi-select mode indicator (mobile) */}
          {multiSelectMode && isMobile && (
            <div className="absolute top-2 left-2 z-20 bg-primary/90 text-primary-foreground text-[10px] px-2 py-1 rounded-lg shadow-sm">
              Multimarkering · Tryck hinder för att markera
              <button onClick={() => { setMultiSelectMode(false); setMultiSelected(new Set()); }} className="ml-2 underline">Avsluta</button>
            </div>
          )}
        </div>

        {/* Sidebar toggle when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card border border-border border-r-0 rounded-l-md p-1.5 shadow-sm"
            title="Visa hinderpanel"
          >
            <span className="text-xs">←</span>
          </button>
        )}

        {/* Right sidebar */}
        {!sidebarCollapsed && (
        <div className="w-16 sm:w-[70px] bg-card border-l border-border flex flex-col overflow-hidden relative">
          {/* Collapse button */}
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 text-center text-[10px] text-muted-foreground hover:text-foreground border-b border-border transition-colors"
            title="Dölj panel"
          >
            →
          </button>
          <div className="flex flex-col gap-0.5 p-1 border-b border-border">
            <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-30" title="Ångra (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-30" title="Gör om (Ctrl+Y)">
              <RotateCcw size={14} className="scale-x-[-1]" />
            </button>
            <TutorialButton onClick={() => setShowTutorial(true)} />
            <div className="h-px bg-border" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
              title={isFullscreen ? 'Avsluta fullskärm' : 'Fullskärm'}
            >
              {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            </button>
            <button
              onClick={() => { setDrawingMode(!drawingMode); setNumberingMode(false); }}
              className={`p-1.5 rounded transition-colors ${drawingMode ? 'bg-orange-500/15 text-orange-600' : 'hover:bg-secondary'}`}
              title="Förarlinje"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => { setNumberingMode(!numberingMode); setDrawingMode(false); if (!numberingMode) { setNextNumberToAssign(1); setNumberingHistory([]); } }}
              className={`p-1.5 rounded transition-colors ${numberingMode ? 'bg-blue-500/15 text-blue-600' : 'hover:bg-secondary'}`}
              title="Numreringsläge"
            >
              <Hash size={14} />
            </button>
            <button
              onClick={() => { setMeasureMode(!measureMode); setDrawingMode(false); setNumberingMode(false); setMeasurePoints([]); }}
              className={`p-1.5 rounded transition-colors ${measureMode ? 'bg-yellow-500/15 text-yellow-600' : 'hover:bg-secondary'}`}
              title="Mätverktyg"
            >
              <Ruler size={14} />
            </button>
            {selected && (
              <>
                <button onClick={rotateSelected} className="p-1.5 rounded hover:bg-secondary" title="Rotera 15°">
                  <RotateCcw size={14} />
                </button>
                <button onClick={copySelected} className="p-1.5 rounded hover:bg-secondary" title="Kopiera">
                  <Copy size={14} />
                </button>
                <button onClick={deleteSelected} className="p-1.5 rounded hover:bg-secondary text-destructive" title="Radera">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {handlerPath.length > 0 && (
              <button onClick={() => setHandlerPath([])} className="p-1.5 rounded hover:bg-secondary text-destructive" title="Radera linje">
                <Eraser size={14} />
              </button>
            )}
            {zoomControls(true)}
          </div>
          {/* Course stats in sidebar */}
          {obstacles.length > 0 && (
            <div className="p-1 border-b border-border text-[8px] text-muted-foreground space-y-0.5">
              <div className="font-medium text-foreground">{courseStats.total} hinder</div>
              {courseStats.contactCount > 0 && <div>{courseStats.contactCount} kontakt</div>}
              {courseStats.length > 0 && <div>~{Math.round(courseStats.length)}m</div>}
              <button onClick={() => setSnapEnabled(!snapEnabled)}
                className={`text-[8px] px-1 rounded ${snapEnabled ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                Snap {snapEnabled ? 'PÅ' : 'AV'}
              </button>
              {isDirty && <div className="text-amber-500 font-medium">● Osparad</div>}
            </div>
          )}

          {/* Numbering color picker in compact mode */}
          {numberingMode && (
            <div className="p-1 border-b border-border">
              {numberingToolbar(true)}
            </div>
          )}

          {/* Obstacle palette */}
          <div className="flex-1 overflow-y-auto">
            {obstaclePalette(true)}
          </div>
        </div>
        )}
        {showTutorial && <CoursePlannerTutorial />}
      </div>
    );
  }

  return (
    <>
    <Helmet>
      <title>Banplanerare Agility – Rita och spara banor | AgilityManager</title>
      <meta name="description" content="Designa agilitybanor med alla SAgiK-godkända hinder i korrekta proportioner. Spara, återanvänd och dela dina banor." />
      <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
    </Helmet>
    <PageContainer title="Banplanerare" subtitle="Rita agility-banor">
      <PremiumGate fullPage featureName="Banplaneraren">

      {/* Toolbar row 1 */}
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        <Select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onValueChange={(v) => {
            const s = CANVAS_SIZES.find(s => `${s.width}x${s.height}` === v);
            if (s) setCanvasSize(s);
          }}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CANVAS_SIZES.map(s => (
              <SelectItem key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-8" disabled={obstacles.length === 0}>
              <Save size={14} /> Spara
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Spara bana</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Namn</Label><Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="T.ex. Söndagsträning" /></div>
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!courseName.trim()}>Spara</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="gap-1 h-8" disabled={savedCourses.length === 0} onClick={() => setShareOpen(true)}>
          <Share2 size={14} /> Dela
        </Button>

        <ShareCourseDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          savedCourses={savedCourses}
          currentCourseId={loadedCourseId}
        />

        <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-8">
              <FolderOpen size={14} /> Ladda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">Ladda bana</DialogTitle></DialogHeader>
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Sparkles size={12} /> Färdiga exempelbanor</h3>
              <div className="space-y-1.5">
                {PRESET_COURSES.map((p, i) => (
                  <button key={i} onClick={() => loadPreset(p)}
                    className="w-full text-left bg-primary/5 hover:bg-primary/10 rounded-lg p-2.5 transition-colors">
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Dina sparade banor</h3>
              {savedCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2 text-center">Inga sparade banor.</p>
              ) : (
                <div className="space-y-1.5">
                  {savedCourses.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg p-2.5">
                      <button onClick={() => loadCourse(c)} className="text-sm font-medium text-foreground text-left flex-1">{c.name}</button>
                      <button onClick={() => handleDeleteCourse(c.id)} className="text-muted-foreground hover:text-destructive ml-2"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" className="gap-1 h-8" onClick={toggleFullscreen} title="Fullskärm">
          <Maximize size={14} />
        </Button>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={!canUndo} title="Ångra (Ctrl+Z)">
            <Undo2 size={14} />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={!canRedo} title="Gör om (Ctrl+Y)">
            <RotateCcw size={14} className="scale-x-[-1]" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-6" onClick={() => setShowHistoryDropdown(!showHistoryDropdown)} title="Historik">
              <ChevronDown size={12} />
            </Button>
            {showHistoryDropdown && (
              <div className="absolute top-full left-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px] max-w-[260px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground">Senaste åtgärder</span>
                  <button onClick={() => setShowHistoryDropdown(false)} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
                </div>
                {getRecentActions(8).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-1">Ingen historik ännu</p>
                ) : (
                  getRecentActions(8).map((a, i) => (
                    <div key={i} className="text-[10px] text-foreground py-0.5 border-b border-border/50 last:border-0">{a}</div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {zoomControls(false)}

        {/* Unsaved indicator */}
        {isDirty && (
          <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
            ● Osparade ändringar
          </span>
        )}

        <Button variant="outline" size="sm" onClick={() => {
          const emptyObs: Obstacle[] = [];
          setObstaclesRaw(emptyObs);
          setSelected(null);
          setHandlerPath([]);
          setFreeNumbers([]);
          setNumberingMode(false);
          setNextNumberToAssign(1);
          setNumberingHistory([]);
          pushHistory(emptyObs, [], 'Rensade banan');
          setIsDirty(true);
        }} className="gap-1 h-8 ml-auto">
          Rensa
        </Button>
      </div>

      {/* Course stats bar */}
      {obstacles.length > 0 && (
        <div className="flex gap-3 mb-2 items-center flex-wrap text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5">
          <span className="font-medium text-foreground">{courseStats.total} hinder</span>
          {courseStats.contactCount > 0 && <span>{courseStats.contactCount} kontakt</span>}
          {courseStats.length > 0 && <span>Banlängd: ~{Math.round(courseStats.length)}m</span>}
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${snapEnabled ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
            <button onClick={() => setSnapEnabled(!snapEnabled)} className="flex items-center gap-1">
              📐 Snap {snapEnabled ? 'PÅ' : 'AV'}
            </button>
          </span>
          {courseStats.warnings.length > 0 && (
            <div className="w-full mt-1">
              {courseStats.warnings.map((w, i) => (
                <div key={i} className="text-[10px] text-amber-500">{w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar row 2 */}
      <div className="flex gap-1.5 mb-3 items-center flex-wrap">
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { if (!isPremium) { toast.error('Export kräver Premium'); return; } exportPNG(); }} disabled={obstacles.length === 0}>
          <Download size={12} /> PNG {!isPremium && <PremiumBadge />}
        </Button>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => { if (!isPremium) { toast.error('Export kräver Premium'); return; } exportJSON(); }} disabled={obstacles.length === 0}>
          <Download size={12} /> JSON {!isPremium && <PremiumBadge />}
        </Button>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
          <Upload size={12} /> Importera
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON} className="hidden" />

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={() => { setDrawingMode(!drawingMode); setNumberingMode(false); if (drawingMode) setIsDrawing(false); }}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${drawingMode ? 'bg-orange-500/15 border-orange-500 text-orange-600' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          <Pencil size={10} /> {drawingMode ? 'Rita: PÅ' : 'Förarlinje'}
        </button>

        {(drawingMode || handlerPath.length > 0) && (
          <>
            <Select value={handlerColor} onValueChange={setHandlerColor}>
              <SelectTrigger className="h-6 w-16 text-[10px] border-none px-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: handlerColor }} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {HANDLER_COLORS.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => setHandlerDashed(!handlerDashed)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${handlerDashed ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}
            >
              {handlerDashed ? '- - -' : '───'}
            </button>
          </>
        )}
        {handlerPath.length > 0 && (
          <button onClick={() => setHandlerPath([])} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-destructive flex items-center gap-1">
            <Eraser size={10} /> Radera linje
          </button>
        )}

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={() => { setNumberingMode(!numberingMode); setDrawingMode(false); setMeasureMode(false); if (!numberingMode) { setNextNumberToAssign(1); setNumberingHistory([]); } }}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${numberingMode ? 'bg-blue-500/15 border-blue-500 text-blue-600' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          <Hash size={10} /> {numberingMode ? 'Numrera bana' : 'Numrera bana'}
        </button>

        <button
          onClick={() => { setMeasureMode(!measureMode); setDrawingMode(false); setNumberingMode(false); setMeasurePoints([]); }}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${measureMode ? 'bg-yellow-500/15 border-yellow-500 text-yellow-600' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          <Ruler size={10} /> {measureMode ? 'Mät: PÅ' : 'Mät'}
        </button>

        {selected && (
          <button
            onClick={copySelected}
            className="text-xs px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            title="Kopiera hinder (Ctrl+C, sedan Ctrl+V)"
          >
            <Copy size={10} /> Kopiera
          </button>
        )}

        <button
          onClick={() => setShowStartFinish(!showStartFinish)}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${showStartFinish ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          ▸◼ {showStartFinish ? 'Start/Mål: PÅ' : 'Start/Mål'}
        </button>

        <button
          onClick={() => setShowDistances(!showDistances)}
          className={`ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors ${showDistances ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          {showDistances ? '📏 Mått på' : '📏 Mått av'}
        </button>
      </div>

      {/* Measure result */}
      {measureMode && measurePoints.length === 2 && (
        <div className="mb-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-xs text-foreground flex items-center gap-2">
          <Ruler size={14} className="text-yellow-600" />
          <span className="font-semibold">
            {(Math.sqrt(
              Math.pow(measurePoints[0].x - measurePoints[1].x, 2) +
              Math.pow(measurePoints[0].y - measurePoints[1].y, 2)
            ) * METERS_PER_PX).toFixed(1)} m
          </span>
          <span className="text-muted-foreground">— Klicka för att mäta igen</span>
        </div>
      )}

      {/* Color theme panel */}
      {showColorPanel && (
        <ObstacleColorPanel
          activeThemeId={activeThemeId}
          currentTheme={currentTheme}
          customOverrides={customOverrides}
          onSelectPreset={handleSelectPreset}
          onSetTypeColor={handleSetTypeColor}
          onResetAll={handleResetColors}
          onClose={() => setShowColorPanel(false)}
        />
      )}

      {/* Color theme toggle button + reset */}
      {!showColorPanel && (
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => setShowColorPanel(true)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Palette size={12} />
            <span>Hinderfärger ({PRESET_THEMES.find(p => p.id === activeThemeId)?.label ?? 'Anpassad'})</span>
          </button>
          {(activeThemeId !== 'standard' || Object.keys(customOverrides).length > 0) && (
            <button
              onClick={handleResetColors}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw size={10} /> Återställ
            </button>
          )}
        </div>
      )}

      {/* Numbering toolbar */}
      {numberingMode && (
        <div className="mb-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Hash size={12} className="text-blue-600" />
            <span className="text-xs font-semibold text-foreground">Numreringsläge</span>
            <span className="text-[10px] text-muted-foreground ml-1">– Tryck var som helst på banan för att placera nummer. Dra för att flytta.</span>
          </div>
          {numberingToolbar(false)}
        </div>
      )}

      {/* Selected obstacle controls */}
      {selectedObs && !numberingMode && (
        <div className="flex gap-2 mb-3 items-center flex-wrap bg-card rounded-lg p-2 shadow-card border border-border">
          <Button variant="outline" size="sm" onClick={rotateSelected} className="gap-1 h-8">
            <RotateCcw size={14} /> 15°
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Grader:</span>
            <Input
              type="number"
              value={Math.round(selectedObs.rotation)}
              onChange={e => setRotationManual(parseInt(e.target.value) || 0)}
              className="w-14 h-7 text-xs text-center"
            />
          </div>
          <Button variant="outline" size="sm" onClick={deleteSelected} className="gap-1 h-8 text-destructive">
            <Trash2 size={14} />
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-muted-foreground">Nr:</span>
            {selectedObs.numbers.length > 0 && (
              <div className="flex gap-0.5">
                {[...selectedObs.numbers].sort((a, b) => a - b).map(n => (
                  <button
                    key={n}
                    onClick={() => removeNumberFromSelected(n)}
                    className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title={`Klicka för att ta bort ${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <Input
              type="number"
              min={1}
              value={numberInput}
              onChange={e => setNumberInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addNumberToSelected(parseInt(numberInput) || 0); setNumberInput(''); } }}
              placeholder="+"
              className="w-10 h-7 text-xs text-center"
            />
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { addNumberToSelected(parseInt(numberInput) || 0); setNumberInput(''); }} disabled={!numberInput}>
              <Plus size={12} />
            </Button>
          </div>

           {selectedObs.type === 'tunnel' && (
            <>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleTunnelLength}>
                  {selectedObs.tunnelLength || 4}m
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Böj:</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateTunnelBend(-15)}>
                  <Minus size={12} />
                </Button>
                <span className="text-xs font-medium w-10 text-center text-foreground">{selectedObs.bendAngle || 0}°</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateTunnelBend(15)}>
                  <Plus size={12} />
                </Button>
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {[0, 45, 90, 135, 180, 270].map(a => (
                  <button
                    key={a}
                    onClick={() => setTunnelBend(a)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                      (selectedObs.bendAngle || 0) === a
                        ? 'bg-primary/15 border-primary text-primary'
                        : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {a === 0 ? 'Rak' : a === 180 ? 'U' : `${a}°`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 w-full">
                <input
                  type="range"
                  min={-360}
                  max={360}
                  step={5}
                  value={selectedObs.bendAngle || 0}
                  onChange={e => setTunnelBend(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-primary"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="bg-card rounded-xl shadow-elevated overflow-hidden mb-3 relative"
        style={{ touchAction: 'none', minHeight: isMobile ? 300 : 500, height: isDesktop ? 'calc(100vh - 340px)' : undefined }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {canvasElement}
        {/* Orientation hint */}
        {showOrientationHint && isMobile && !isLandscape && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-primary/90 text-primary-foreground text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            📐 Vänd telefonen för bästa upplevelse
            <button onClick={() => setShowOrientationHint(false)} className="text-primary-foreground/70 hover:text-primary-foreground">✕</button>
          </div>
        )}
        {/* Numbering tip when start/finish is on */}
        {showStartFinish && numberingMode && (
          <div className="absolute top-3 left-3 z-10 bg-secondary/90 text-muted-foreground text-[10px] px-2 py-1 rounded pointer-events-none">
            Tips: Med numrering behövs ofta inte start/mål-markeringar
          </div>
        )}
        {/* Zoom indicator */}
        <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground bg-background/80 rounded px-1.5 py-0.5 pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>

        {/* Minimap */}
        {showMinimap && zoom < 0.95 && obstacles.length > 0 && !isMobile && (
          <div className="absolute bottom-10 right-2 z-10">
            <div className="relative bg-card/90 border border-border rounded shadow-sm">
              <button onClick={() => setShowMinimap(false)} className="absolute -top-1.5 -right-1.5 z-10 bg-card border border-border rounded-full w-4 h-4 flex items-center justify-center text-[8px] text-muted-foreground hover:text-foreground">
                ✕
              </button>
              <canvas
                ref={minimapRef}
                width={120}
                height={Math.round(120 * (canvasHeight / canvasWidth))}
                className="rounded cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mx = e.clientX - rect.left;
                  const my = e.clientY - rect.top;
                  const scaleX = canvasWidth / 120;
                  const scaleY = canvasHeight / Math.round(120 * (canvasHeight / canvasWidth));
                  const worldX = mx * scaleX;
                  const worldY = my * scaleY;
                  const container = containerRef.current;
                  if (container) {
                    const rect2 = container.getBoundingClientRect();
                    setPanX(rect2.width / 2 - (worldX + MARGIN) * zoom);
                    setPanY(rect2.height / 2 - worldY * zoom);
                  }
                }}
              />
            </div>
          </div>
        )}
        {!showMinimap && !isMobile && obstacles.length > 0 && zoom < 0.95 && (
          <button onClick={() => setShowMinimap(true)} className="absolute bottom-10 right-2 z-10 text-[9px] bg-card/90 border border-border rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground">
            🗺
          </button>
        )}

        {/* Measure mode indicator */}
        {measureMode && (
          <div className="absolute top-3 left-3 z-10 bg-yellow-500/90 text-foreground text-[10px] px-2 py-1 rounded pointer-events-none font-medium">
            📏 Klicka på två punkter för att mäta avstånd
          </div>
        )}
      </div>

      {/* Quick-select obstacle palette (portrait/desktop) */}
      <div className="sticky bottom-16 bg-background/95 backdrop-blur-sm border-t border-border pt-2 pb-2 -mx-4 px-4 rounded-t-xl shadow-elevated z-10">
        {obstaclePalette(false)}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Dra hinder för att flytta · Dra i ⟳ för att rotera · Scrollhjul/pinch för att zooma · Shift+klick = markera flera
        {!isMobile && (
          <span className="block mt-0.5 text-[10px]">
            Del = radera · Ctrl+Z/Y = ångra/gör om · Ctrl+C/V = kopiera · Ctrl+S = spara · Escape = avmarkera
          </span>
        )}
      </p>
      </PremiumGate>
    </PageContainer>
    </>
  );
}
