import { Helmet } from 'react-helmet-async';
import { useState, useRef, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, FolderOpen, Download, Upload, Sparkles, Minus, Plus, Pencil, Eraser, Hash, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumGate, usePremium, PremiumBadge } from '@/components/PremiumGate';
import { useIsMobile } from '@/hooks/use-mobile';

/* ───── Types ───── */

type Obstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
  numbers: number[];
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
  { type: 'balance',   label: 'Balans',   symbol: '─', width: 3.6 * PX_PER_METER, height: 0.3 * PX_PER_METER },
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

const PRESET_COURSES: { name: string; obstacles: Obstacle[] }[] = [
  {
    name: 'Nybörjarbana (6 hinder)',
    obstacles: [
      { id: 'p1', type: 'start', x: 200, y: 700, rotation: 0, label: 'Start', numbers: [] },
      { id: 'p2', type: 'jump', x: 200, y: 600, rotation: 0, label: 'Hopp', numbers: [1] },
      { id: 'p3', type: 'tunnel', x: 200, y: 480, rotation: 0, label: 'Tunnel', numbers: [2], tunnelLength: 4, bendAngle: 0 },
      { id: 'p4', type: 'jump', x: 140, y: 350, rotation: 45, label: 'Hopp', numbers: [3] },
      { id: 'p5', type: 'weave', x: 250, y: 220, rotation: 0, label: 'Slalom', numbers: [4] },
      { id: 'p6', type: 'jump', x: 300, y: 120, rotation: 0, label: 'Hopp', numbers: [5] },
      { id: 'p7', type: 'finish', x: 200, y: 40, rotation: 0, label: 'Mål', numbers: [] },
    ],
  },
  {
    name: 'Kontaktbana (8 hinder)',
    obstacles: [
      { id: 'c1', type: 'start', x: 100, y: 720, rotation: 0, label: 'Start', numbers: [] },
      { id: 'c2', type: 'jump', x: 100, y: 620, rotation: 0, label: 'Hopp', numbers: [1] },
      { id: 'c3', type: 'a_frame', x: 200, y: 500, rotation: 0, label: 'A-hinder', numbers: [2] },
      { id: 'c4', type: 'tunnel', x: 320, y: 380, rotation: 90, label: 'Tunnel', numbers: [3], tunnelLength: 6, bendAngle: 45 },
      { id: 'c5', type: 'dog_walk', x: 200, y: 280, rotation: 0, label: 'Brygga', numbers: [4] },
      { id: 'c6', type: 'seesaw', x: 120, y: 180, rotation: 0, label: 'Vipp', numbers: [5] },
      { id: 'c7', type: 'jump', x: 260, y: 120, rotation: 30, label: 'Hopp', numbers: [6] },
      { id: 'c8', type: 'weave', x: 300, y: 60, rotation: 0, label: 'Slalom', numbers: [7] },
      { id: 'c9', type: 'finish', x: 300, y: 20, rotation: 0, label: 'Mål', numbers: [] },
    ],
  },
];

let idCounter = 0;
const nextId = () => `obs_${++idCounter}_${Date.now()}`;

function migrateObstacle(o: any): Obstacle {
  if (o.numbers && Array.isArray(o.numbers)) return o;
  const nums: number[] = [];
  if (typeof o.number === 'number' && o.number > 0) nums.push(o.number);
  return { ...o, numbers: nums, number: undefined };
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
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
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

  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateStart, setRotateStart] = useState({ angle: 0, obsRotation: 0 });
  const [touchRotating, setTouchRotating] = useState(false);
  const [touchStartAngle, setTouchStartAngle] = useState(0);
  const [touchStartRotation, setTouchStartRotation] = useState(0);

  const [numberInput, setNumberInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const showLandscapeLayout = isMobile && isLandscape;

  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;
  const MARGIN = 28;

  // Portrait toast
  useEffect(() => {
    if (isMobile && !isLandscape) {
      const t = toast('📐 Vänd telefonen för bästa upplevelse', { duration: 3000 });
    }
  }, []);

  useEffect(() => {
    supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setSavedCourses(data as unknown as SavedCourse[]);
    });
  }, []);

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

    ctx.strokeStyle = 'hsl(152, 50%, 35%)';
    ctx.lineWidth = tubeWidth;
    ctx.lineCap = 'round';

    if (Math.abs(bendAngle) < 5) {
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
      ctx.strokeStyle = 'hsl(152, 40%, 55%)';
      ctx.lineWidth = tubeWidth - 4;
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
    } else {
      const bendRad = (bendAngle * Math.PI) / 180;
      const radius = length / Math.abs(bendRad);
      const cx = bendAngle > 0 ? radius : -radius;
      const startAngle = bendAngle > 0 ? Math.PI : 0;
      const endAngle = startAngle - bendRad;
      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, bendAngle > 0);
      ctx.stroke();
      ctx.strokeStyle = 'hsl(152, 40%, 55%)';
      ctx.lineWidth = tubeWidth - 4;
      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, bendAngle > 0);
      ctx.stroke();
    }

    ctx.fillStyle = 'hsl(152, 60%, 25%)';
    if (Math.abs(bendAngle) < 5) {
      ctx.beginPath(); ctx.arc(0, -length / 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, length / 2, 4, 0, Math.PI * 2); ctx.fill();
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // All drawing in MARGIN-translated space
    ctx.save();
    ctx.translate(MARGIN, 0);

    // Course area
    ctx.fillStyle = 'hsl(0, 0%, 97%)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Minor grid (1m)
    ctx.strokeStyle = 'hsl(0, 0%, 90%)';
    ctx.lineWidth = 0.3;
    for (let x = 0; x <= canvasWidth; x += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Major grid (5m)
    ctx.strokeStyle = 'hsl(0, 0%, 78%)';
    ctx.lineWidth = 0.8;
    const majorStep = GRID_STEP * 5;
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Coordinate labels (in MARGIN space - need to go left of 0)
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
    const numberedObs = obstacles.filter(o => o.numbers.length > 0).sort((a, b) => {
      const aMin = Math.min(...a.numbers);
      const bMin = Math.min(...b.numbers);
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
        ctx.strokeStyle = 'hsl(200, 50%, 40%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'hsl(200, 40%, 55%)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
      } else if (obs.type === 'table') {
        ctx.fillStyle = 'hsl(45, 60%, 75%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsl(45, 50%, 55%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsl(45, 40%, 60%)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, hh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -hh); ctx.lineTo(-hw, hh); ctx.stroke();
      } else if (obs.type === 'a_frame') {
        ctx.strokeStyle = 'hsl(16, 80%, 45%)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-hw, hh); ctx.lineTo(0, -hh); ctx.lineTo(hw, hh);
        ctx.stroke();
        ctx.strokeStyle = 'hsl(45, 90%, 50%)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(-hw * 0.5, hh * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, hh); ctx.lineTo(hw * 0.5, hh * 0.3); ctx.stroke();
      } else if (obs.type === 'dog_walk' || obs.type === 'balance') {
        const color = obs.type === 'dog_walk' ? 'hsl(45, 70%, 55%)' : 'hsl(180, 35%, 50%)';
        const contactColor = obs.type === 'dog_walk' ? 'hsl(45, 90%, 45%)' : 'hsl(180, 50%, 40%)';
        ctx.fillStyle = color;
        ctx.fillRect(-hw, -hh, info.width, info.height);
        const cz = 0.9 * PX_PER_METER;
        ctx.fillStyle = contactColor;
        ctx.fillRect(-hw, -hh, cz, info.height);
        ctx.fillRect(hw - cz, -hh, cz, info.height);
        ctx.strokeStyle = obs.type === 'dog_walk' ? 'hsl(45, 60%, 40%)' : 'hsl(180, 30%, 40%)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'seesaw') {
        ctx.fillStyle = 'hsl(270, 40%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.fillStyle = 'hsl(270, 50%, 35%)';
        ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'hsl(270, 40%, 40%)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'weave') {
        const poleCount = 12;
        const spacing = info.width / (poleCount - 1);
        for (let i = 0; i < poleCount; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'hsl(340, 70%, 50%)' : 'hsl(340, 50%, 65%)';
          ctx.beginPath();
          ctx.arc(-hw + i * spacing, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'hsl(340, 30%, 70%)';
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
      } else if (obs.type === 'jump') {
        ctx.strokeStyle = 'hsl(0, 0%, 25%)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.fillStyle = 'hsl(0, 0%, 20%)';
        ctx.fillRect(-hw - 1.5, -5, 3, 10);
        ctx.fillRect(hw - 1.5, -5, 3, 10);
      } else if (obs.type === 'long_jump') {
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = `hsl(221, ${50 + j * 15}%, ${50 + j * 5}%)`;
          ctx.fillRect(-hw, -hh + j * (info.height / 3), info.width, info.height / 3 - 1);
        }
      } else if (obs.type === 'oxer') {
        ctx.strokeStyle = 'hsl(200, 50%, 40%)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh); ctx.stroke();
        ctx.fillStyle = 'hsl(200, 40%, 35%)';
        ctx.fillRect(-hw - 1.5, -hh - 1.5, 3, info.height + 3);
        ctx.fillRect(hw - 1.5, -hh - 1.5, 3, info.height + 3);
      } else if (obs.type === 'wall') {
        ctx.fillStyle = 'hsl(30, 25%, 55%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsl(30, 20%, 40%)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsla(30, 15%, 70%, 0.6)';
        ctx.lineWidth = 0.3;
        for (let r = -hh + 4; r < hh; r += 4) {
          ctx.beginPath(); ctx.moveTo(-hw, r); ctx.lineTo(hw, r); ctx.stroke();
        }
      } else if (obs.type === 'start') {
        ctx.strokeStyle = 'hsl(120, 60%, 35%)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -6); ctx.lineTo(-hw, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -6); ctx.lineTo(hw, 6); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'hsl(120, 50%, 45%)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else if (obs.type === 'finish') {
        ctx.strokeStyle = 'hsl(0, 70%, 45%)';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-hw, -6); ctx.lineTo(-hw, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -6); ctx.lineTo(hw, 6); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'hsl(0, 60%, 55%)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'hsl(0, 0%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
      }

      // Selection highlight
      if (selected === obs.id) {
        ctx.strokeStyle = 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        const selSize = Math.max(info.width, info.height, 20) / 2 + 6;
        ctx.strokeRect(-selSize, -selSize, selSize * 2, selSize * 2);
        ctx.setLineDash([]);

        // Rotation handle
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

      ctx.restore();

      // Number labels (still in MARGIN-translated space, no extra offset needed)
      if (obs.numbers.length > 0) {
        const sortedNums = [...obs.numbers].sort((a, b) => a - b);
        const numText = sortedNums.join('/');
        const maxDim = Math.max((info?.height || 10) / 2, (info?.width || 10) / 2, 10);
        const nx = obs.x;
        const ny = obs.y - maxDim - 8;

        ctx.font = 'bold 9px sans-serif';
        const tw = ctx.measureText(numText).width;
        const pillW = Math.max(tw + 8, 16);
        const pillH = 14;
        const pr = pillH / 2;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'hsl(0, 0%, 25%)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(nx - pillW / 2 + pr, ny - pr);
        ctx.arcTo(nx + pillW / 2, ny - pr, nx + pillW / 2, ny + pr, pr);
        ctx.arcTo(nx + pillW / 2, ny + pr, nx - pillW / 2, ny + pr, pr);
        ctx.arcTo(nx - pillW / 2, ny + pr, nx - pillW / 2, ny - pr, pr);
        ctx.arcTo(nx - pillW / 2, ny - pr, nx + pillW / 2, ny - pr, pr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'hsl(0, 0%, 15%)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numText, nx, ny);
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

    // "1 ruta = 1 meter" label
    ctx.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
    ctx.fillRect(4, 4, 80, 14);
    ctx.fillStyle = 'hsl(0, 0%, 45%)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('1 ruta = 1 meter', 8, 6);

    ctx.restore(); // restore MARGIN translate
  }, [obstacles, selected, showDistances, canvasWidth, canvasHeight, handlerPath, handlerColor, handlerDashed]);

  useEffect(() => { draw(); }, [draw]);

  /* ───── Interaction ───── */

  const addObstacle = (type: string) => {
    const info = OBSTACLE_TYPES.find(o => o.type === type)!;
    const newObs: Obstacle = {
      id: nextId(), type, x: canvasWidth / 2, y: canvasHeight / 2,
      rotation: 0, label: info.label, numbers: [],
      ...(type === 'tunnel' ? { tunnelLength: 4 as const, bendAngle: 0 } : {}),
    };
    setObstacles(prev => [...prev, newObs]);
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

  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const totalW = canvasWidth + MARGIN;
    const totalH = canvasHeight + MARGIN;
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX; clientY = e.clientY;
    } else return { x: 0, y: 0 };
    const rawX = (clientX - rect.left) * (totalW / rect.width) - MARGIN;
    const rawY = (clientY - rect.top) * (totalH / rect.height);
    return { x: rawX, y: rawY };
  };

  const getTouchAngle = (e: React.TouchEvent): number | null => {
    if (!('touches' in e) || e.touches.length < 2) return null;
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    return Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX) * 180 / Math.PI;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2 && selected) {
      e.preventDefault();
      const angle = getTouchAngle(e);
      if (angle !== null) {
        const obs = obstacles.find(o => o.id === selected);
        if (obs) {
          setTouchRotating(true);
          setTouchStartAngle(angle);
          setTouchStartRotation(obs.rotation);
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
      const obs = findObstacleAt(pos.x, pos.y);
      if (obs) {
        setObstacles(prev => prev.map(o => {
          if (o.id !== obs.id) return o;
          return { ...o, numbers: [...o.numbers, nextNumberToAssign].sort((a, b) => a - b) };
        }));
        setNextNumberToAssign(prev => prev + 1);
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
      setSelected(obs.id);
      setDragging(obs.id);
      setDragOffset({ x: pos.x - obs.x, y: pos.y - obs.y });
    } else {
      setSelected(null);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (touchRotating && 'touches' in e && e.touches.length === 2 && selected) {
      e.preventDefault();
      const angle = getTouchAngle(e);
      if (angle !== null) {
        const delta = angle - touchStartAngle;
        setObstacles(prev => prev.map(o =>
          o.id === selected ? { ...o, rotation: (touchStartRotation + delta + 360) % 360 } : o
        ));
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

    if (!dragging) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    setObstacles(prev => prev.map(o =>
      o.id === dragging ? { ...o, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : o
    ));
  };

  const handlePointerUp = () => {
    setDragging(null);
    setIsDrawing(false);
    setRotatingId(null);
    setTouchRotating(false);
  };

  const rotateSelected = () => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected ? { ...o, rotation: (o.rotation + 15) % 360 } : o
    ));
  };

  const deleteSelected = () => {
    if (!selected) return;
    setObstacles(prev => prev.filter(o => o.id !== selected));
    setSelected(null);
  };

  const addNumberToSelected = (num: number) => {
    if (!selected || num <= 0) return;
    setObstacles(prev => prev.map(o => {
      if (o.id !== selected) return o;
      if (o.numbers.includes(num)) return o;
      return { ...o, numbers: [...o.numbers, num].sort((a, b) => a - b) };
    }));
  };

  const removeNumberFromSelected = (num: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o => {
      if (o.id !== selected) return o;
      return { ...o, numbers: o.numbers.filter(n => n !== num) };
    }));
  };

  const updateTunnelBend = (delta: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected && o.type === 'tunnel'
        ? { ...o, bendAngle: Math.max(-90, Math.min(90, (o.bendAngle || 0) + delta)) }
        : o
    ));
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
    setObstacles(prev => prev.map(o => ({ ...o, numbers: [] })));
    setNextNumberToAssign(1);
  };

  /* ───── Fullscreen ───── */

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ───── Save/Load ───── */

  const handleSave = async () => {
    if (!courseName.trim()) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from('saved_courses').insert({
      user_id: userId, name: courseName.trim(), course_data: { obstacles, handlerPath } as any,
      canvas_width: canvasWidth, canvas_height: canvasHeight,
    });
    if (error) { toast.error('Kunde inte spara'); }
    else {
      toast.success('Bana sparad!');
      setSaveOpen(false); setCourseName('');
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
    setObstacles(loadedObstacles);
    setHandlerPath(loadedPath);
    if (course.canvas_width && course.canvas_height) {
      const match = CANVAS_SIZES.find(s => s.width === course.canvas_width && s.height === course.canvas_height);
      if (match) setCanvasSize(match);
    }
    setLoadOpen(false);
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
    const data = JSON.stringify({ obstacles, handlerPath, canvasWidth, canvasHeight }, null, 2);
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
    setObstacles(preset.obstacles.map(o => ({ ...o, id: nextId() })));
    setHandlerPath([]);
    setLoadOpen(false);
    toast.success(`Laddade "${preset.name}"`);
  };

  const isPremium = usePremium();

  /* ───── Obstacle palette (shared) ───── */

  const obstaclePalette = (vertical: boolean) => (
    <div className={vertical
      ? "flex flex-col gap-1 overflow-y-auto py-1 px-0.5"
      : "grid grid-cols-5 sm:grid-cols-7 gap-1.5"
    }>
      {OBSTACLE_TYPES.map(o => (
        <button
          key={o.type}
          onClick={() => addObstacle(o.type)}
          className={`flex flex-col items-center gap-0.5 rounded-lg font-medium bg-card shadow-card border border-border hover:border-primary active:scale-95 transition-all ${
            vertical ? 'px-1 py-1 text-[9px]' : 'px-1 py-1.5 text-[10px]'
          }`}
        >
          <span className={vertical ? "text-sm leading-none" : "text-base leading-none"}>{o.symbol}</span>
          {!vertical && o.label}
          {vertical && <span className="truncate w-full text-center">{o.label}</span>}
        </button>
      ))}
    </div>
  );

  /* ───── Render ───── */

  const canvasElement = (
    <canvas
      ref={canvasRef}
      style={{
        width: canvasWidth + MARGIN,
        height: canvasHeight + MARGIN,
        touchAction: 'none',
        display: 'block',
        margin: '0 auto',
        cursor: drawingMode ? 'crosshair' : numberingMode ? 'cell' : rotatingId ? 'grabbing' : dragging ? 'grabbing' : 'grab',
        maxWidth: '100%',
        maxHeight: showLandscapeLayout ? 'calc(100vh - 16px)' : undefined,
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  );

  // Fullscreen landscape layout
  if (isFullscreen || showLandscapeLayout) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex">
        {/* Main canvas area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-1">
          {canvasElement}
        </div>

        {/* Right sidebar - obstacle palette + tools */}
        <div className="w-16 sm:w-[70px] bg-card border-l border-border flex flex-col overflow-hidden">
          {/* Top tools */}
          <div className="flex flex-col gap-0.5 p-1 border-b border-border">
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
              onClick={() => { setNumberingMode(!numberingMode); setDrawingMode(false); if (!numberingMode) setNextNumberToAssign(1); }}
              className={`p-1.5 rounded transition-colors ${numberingMode ? 'bg-blue-500/15 text-blue-600' : 'hover:bg-secondary'}`}
              title="Numreringsläge"
            >
              <Hash size={14} />
            </button>
            {selected && (
              <>
                <button onClick={rotateSelected} className="p-1.5 rounded hover:bg-secondary" title="Rotera 15°">
                  <RotateCcw size={14} />
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
          </div>

          {/* Obstacle palette */}
          <div className="flex-1 overflow-y-auto">
            {obstaclePalette(true)}
          </div>
        </div>
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
                    className="w-full text-left text-sm font-medium text-foreground bg-primary/5 hover:bg-primary/10 rounded-lg p-2.5 transition-colors">
                    {p.name}
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

        <Button variant="outline" size="sm" onClick={() => { setObstacles([]); setSelected(null); setHandlerPath([]); setNumberingMode(false); setNextNumberToAssign(1); }} className="gap-1 h-8 ml-auto">
          Rensa
        </Button>
      </div>

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
          onClick={() => { setNumberingMode(!numberingMode); setDrawingMode(false); if (!numberingMode) setNextNumberToAssign(1); }}
          className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${numberingMode ? 'bg-blue-500/15 border-blue-500 text-blue-600' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          <Hash size={10} /> {numberingMode ? `Numrera: ${nextNumberToAssign}` : 'Numreringsläge'}
        </button>
        {numberingMode && (
          <button onClick={clearNumbering} className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-destructive">
            Rensa numrering
          </button>
        )}

        <button
          onClick={() => setShowDistances(!showDistances)}
          className={`ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors ${showDistances ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          {showDistances ? '📏 Mått på' : '📏 Mått av'}
        </button>
      </div>

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
                <span className="text-xs font-medium w-8 text-center text-foreground">{selectedObs.bendAngle || 0}°</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateTunnelBend(15)}>
                  <Plus size={12} />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="bg-card rounded-xl shadow-elevated overflow-auto mb-3">
        {canvasElement}
      </div>

      {/* Quick-select obstacle palette (portrait/desktop) */}
      <div className="sticky bottom-16 bg-background/95 backdrop-blur-sm border-t border-border pt-2 pb-2 -mx-4 px-4 rounded-t-xl shadow-elevated z-10">
        {obstaclePalette(false)}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Dra hinder för att flytta · Dra i ⟳ för att rotera · {obstacles.length} hinder på banan
      </p>
      </PremiumGate>
    </PageContainer>
    </>
  );
}
