import { Helmet } from 'react-helmet-async';
import { useState, useRef, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, FolderOpen, Download, Upload, Sparkles, Minus, Plus, Pencil, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumGate, usePremium, PremiumBadge } from '@/components/PremiumGate';

type Obstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
  number?: number;
  tunnelLength?: 4 | 6;
  bendAngle?: number; // degrees, 0 = straight, positive = curve right
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

const OBSTACLE_TYPES = [
  { type: 'jump', label: 'Hopp', symbol: '┃', width: 40, height: 8 },
  { type: 'long_jump', label: 'Långhopp', symbol: '═', width: 50, height: 16 },
  { type: 'oxer', label: 'Oxer', symbol: '‖', width: 40, height: 14 },
  { type: 'wall', label: 'Muren', symbol: '▬', width: 36, height: 20 },
  { type: 'tunnel', label: 'Tunnel', symbol: '⌒', width: 60, height: 20 },
  { type: 'a_frame', label: 'A-hinder', symbol: '△', width: 36, height: 36 },
  { type: 'dog_walk', label: 'Brygga', symbol: '━', width: 80, height: 12 },
  { type: 'seesaw', label: 'Vipp', symbol: '⏤', width: 60, height: 10 },
  { type: 'balance', label: 'Balans', symbol: '─', width: 70, height: 10 },
  { type: 'weave', label: 'Slalom', symbol: '⫶', width: 50, height: 10 },
  { type: 'tire', label: 'Däck', symbol: '◯', width: 24, height: 24 },
  { type: 'start', label: 'Start', symbol: '▸', width: 30, height: 6 },
  { type: 'finish', label: 'Mål', symbol: '◼', width: 30, height: 6 },
];

const CANVAS_SIZES = [
  { label: 'Liten (320×400)', width: 320, height: 400 },
  { label: 'Medium (360×500)', width: 360, height: 500 },
  { label: 'Stor (420×600)', width: 420, height: 600 },
  { label: 'XL (500×700)', width: 500, height: 700 },
];

const PRESET_COURSES: { name: string; obstacles: Obstacle[] }[] = [
  {
    name: 'Nybörjarbana (6 hinder)',
    obstacles: [
      { id: 'p1', type: 'start', x: 180, y: 450, rotation: 0, label: 'Start', number: 0 },
      { id: 'p2', type: 'jump', x: 180, y: 380, rotation: 0, label: 'Hopp', number: 1 },
      { id: 'p3', type: 'tunnel', x: 180, y: 300, rotation: 0, label: 'Tunnel', number: 2, tunnelLength: 4, bendAngle: 0 },
      { id: 'p4', type: 'jump', x: 120, y: 220, rotation: 45, label: 'Hopp', number: 3 },
      { id: 'p5', type: 'weave', x: 180, y: 140, rotation: 0, label: 'Slalom', number: 4 },
      { id: 'p6', type: 'jump', x: 240, y: 80, rotation: 0, label: 'Hopp', number: 5 },
      { id: 'p7', type: 'finish', x: 180, y: 30, rotation: 0, label: 'Mål', number: 0 },
    ],
  },
  {
    name: 'Kontaktbana (8 hinder)',
    obstacles: [
      { id: 'c1', type: 'start', x: 80, y: 460, rotation: 0, label: 'Start', number: 0 },
      { id: 'c2', type: 'jump', x: 80, y: 390, rotation: 0, label: 'Hopp', number: 1 },
      { id: 'c3', type: 'a_frame', x: 160, y: 330, rotation: 0, label: 'A-hinder', number: 2 },
      { id: 'c4', type: 'tunnel', x: 260, y: 270, rotation: 90, label: 'Tunnel', number: 3, tunnelLength: 6, bendAngle: 45 },
      { id: 'c5', type: 'dog_walk', x: 180, y: 200, rotation: 0, label: 'Brygga', number: 4 },
      { id: 'c6', type: 'seesaw', x: 100, y: 140, rotation: 0, label: 'Vipp', number: 5 },
      { id: 'c7', type: 'jump', x: 200, y: 80, rotation: 30, label: 'Hopp', number: 6 },
      { id: 'c8', type: 'weave', x: 280, y: 40, rotation: 0, label: 'Slalom', number: 7 },
      { id: 'c9', type: 'finish', x: 280, y: 10, rotation: 0, label: 'Mål', number: 0 },
    ],
  },
];

const METERS_PER_PX = 0.05;
const GRID_STEP = 20;

let idCounter = 0;
const nextId = () => `obs_${++idCounter}_${Date.now()}`;

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
  const [nextNumber, setNextNumber] = useState(1);
  const [handlerPath, setHandlerPath] = useState<PathPoint[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;
  // Margin for coordinate labels
  const MARGIN = 24;

  useEffect(() => {
    supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setSavedCourses(data as unknown as SavedCourse[]);
    });
  }, []);

  // Recalculate next number when obstacles change
  useEffect(() => {
    const maxNum = obstacles.reduce((max, o) => Math.max(max, o.number || 0), 0);
    setNextNumber(maxNum + 1);
  }, [obstacles]);

  const selectedObs = obstacles.find(o => o.id === selected);

  const distBetween = (a: Obstacle, b: Obstacle) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) * METERS_PER_PX;
  };

  const drawTunnel = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
    const length = (obs.tunnelLength || 4) / METERS_PER_PX;
    const bendAngle = obs.bendAngle || 0;
    const tubeWidth = 18;

    ctx.strokeStyle = 'hsl(152, 50%, 35%)';
    ctx.lineWidth = tubeWidth;
    ctx.lineCap = 'round';

    if (Math.abs(bendAngle) < 5) {
      // Straight tunnel
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
      // Inner lighter fill
      ctx.strokeStyle = 'hsl(152, 40%, 55%)';
      ctx.lineWidth = tubeWidth - 6;
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
    } else {
      // Curved tunnel
      const bendRad = (bendAngle * Math.PI) / 180;
      const radius = length / Math.abs(bendRad);
      const cx = bendAngle > 0 ? radius : -radius;
      const startAngle = bendAngle > 0 ? Math.PI : 0;
      const endAngle = startAngle - bendRad;

      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, bendAngle > 0);
      ctx.stroke();
      // Inner
      ctx.strokeStyle = 'hsl(152, 40%, 55%)';
      ctx.lineWidth = tubeWidth - 6;
      ctx.beginPath();
      ctx.arc(cx, 0, radius, startAngle, endAngle, bendAngle > 0);
      ctx.stroke();
    }

    // Opening circles at ends
    ctx.fillStyle = 'hsl(152, 60%, 25%)';
    if (Math.abs(bendAngle) < 5) {
      ctx.beginPath(); ctx.arc(0, -length / 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, length / 2, 5, 0, Math.PI * 2); ctx.fill();
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

    // White background for margin area
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // Course background (offset by margin)
    ctx.save();
    ctx.translate(MARGIN, 0);

    ctx.fillStyle = 'hsl(0, 0%, 97%)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid
    ctx.strokeStyle = 'hsl(0, 0%, 88%)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvasWidth; x += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += GRID_STEP) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Thicker grid every 5 steps (1m)
    ctx.strokeStyle = 'hsl(0, 0%, 78%)';
    ctx.lineWidth = 1;
    const majorStep = GRID_STEP * 5;
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    ctx.restore();

    // Coordinate labels along top
    ctx.fillStyle = 'hsl(0, 0%, 50%)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let x = 0; x <= canvasWidth; x += majorStep) {
      const meters = Math.round(x * METERS_PER_PX);
      ctx.fillText(`${meters}`, x + MARGIN, canvasHeight + MARGIN - 2);
    }

    // Coordinate labels along left
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 0; y <= canvasHeight; y += majorStep) {
      const meters = Math.round(y * METERS_PER_PX);
      ctx.fillText(`${meters}`, MARGIN - 3, y);
    }

    // Draw obstacles in canvas coordinate space
    ctx.save();
    ctx.translate(MARGIN, 0);

    // Path lines + distance labels
    if (obstacles.length > 1) {
      ctx.strokeStyle = 'hsl(0, 0%, 65%)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      obstacles.forEach((obs, i) => {
        if (i === 0) ctx.moveTo(obs.x, obs.y);
        else ctx.lineTo(obs.x, obs.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      if (showDistances) {
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 1; i < obstacles.length; i++) {
          const a = obstacles[i - 1];
          const b = obstacles[i];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const dist = distBetween(a, b);
          ctx.fillStyle = 'hsla(0, 0%, 100%, 0.9)';
          const text = `${dist.toFixed(1)}m`;
          const tw = ctx.measureText(text).width + 6;
          ctx.fillRect(mx - tw / 2, my - 6, tw, 12);
          ctx.fillStyle = 'hsl(0, 0%, 35%)';
          ctx.fillText(text, mx, my);
        }
      }
    }

    // Draw each obstacle
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
        ctx.strokeStyle = 'hsl(200, 50%, 40%)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, hw, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'hsl(200, 40%, 55%)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, hw * 0.6, 0, Math.PI * 2); ctx.stroke();
      } else if (obs.type === 'a_frame') {
        ctx.strokeStyle = 'hsl(16, 80%, 45%)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-hw, hh); ctx.lineTo(0, -hh); ctx.lineTo(hw, hh);
        ctx.stroke();
        // Contact zones
        ctx.strokeStyle = 'hsl(45, 90%, 50%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(-hw * 0.5, hh * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, hh); ctx.lineTo(hw * 0.5, hh * 0.3); ctx.stroke();
      } else if (obs.type === 'dog_walk') {
        ctx.fillStyle = 'hsl(45, 70%, 55%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        // Contact zones
        ctx.fillStyle = 'hsl(45, 90%, 45%)';
        ctx.fillRect(-hw, -hh, 14, info.height);
        ctx.fillRect(hw - 14, -hh, 14, info.height);
        ctx.strokeStyle = 'hsl(45, 60%, 40%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'seesaw') {
        ctx.fillStyle = 'hsl(270, 40%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        // Pivot point
        ctx.fillStyle = 'hsl(270, 50%, 35%)';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'hsl(270, 40%, 40%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'balance') {
        ctx.fillStyle = 'hsl(180, 35%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsl(180, 30%, 40%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
      } else if (obs.type === 'weave') {
        // Draw weave poles as dots
        const poleCount = 12;
        const spacing = info.width / (poleCount - 1);
        for (let i = 0; i < poleCount; i++) {
          ctx.fillStyle = i % 2 === 0 ? 'hsl(340, 70%, 50%)' : 'hsl(340, 50%, 65%)';
          ctx.beginPath();
          ctx.arc(-hw + i * spacing, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obs.type === 'jump') {
        // Jump bar
        ctx.strokeStyle = 'hsl(0, 0%, 25%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        // Wings/posts
        ctx.fillStyle = 'hsl(0, 0%, 20%)';
        ctx.fillRect(-hw - 2, -6, 4, 12);
        ctx.fillRect(hw - 2, -6, 4, 12);
      } else if (obs.type === 'long_jump') {
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = `hsl(221, ${50 + j * 15}%, ${50 + j * 5}%)`;
          ctx.fillRect(-hw, -hh + j * 6, info.width, 3);
        }
      } else if (obs.type === 'oxer') {
        ctx.strokeStyle = 'hsl(200, 50%, 40%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-hw, -hh); ctx.lineTo(hw, -hh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh); ctx.stroke();
        // Posts
        ctx.fillStyle = 'hsl(200, 40%, 35%)';
        ctx.fillRect(-hw - 2, -hh - 2, 4, info.height + 4);
        ctx.fillRect(hw - 2, -hh - 2, 4, info.height + 4);
      } else if (obs.type === 'wall') {
        ctx.fillStyle = 'hsl(30, 25%, 55%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsl(30, 20%, 40%)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hh, info.width, info.height);
        // Brick lines
        ctx.strokeStyle = 'hsla(30, 15%, 70%, 0.6)';
        ctx.lineWidth = 0.5;
        for (let r = -hh + 5; r < hh; r += 5) {
          ctx.beginPath(); ctx.moveTo(-hw, r); ctx.lineTo(hw, r); ctx.stroke();
        }
      } else if (obs.type === 'start') {
        ctx.strokeStyle = 'hsl(120, 60%, 35%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-hw, -8); ctx.lineTo(-hw, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -8); ctx.lineTo(hw, 8); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'hsl(120, 50%, 45%)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else if (obs.type === 'finish') {
        ctx.strokeStyle = 'hsl(0, 70%, 45%)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-hw, -8); ctx.lineTo(-hw, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hw, -8); ctx.lineTo(hw, 8); ctx.stroke();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'hsl(0, 60%, 55%)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = 'hsl(0, 0%, 50%)';
        ctx.fillRect(-hw, -hh, info.width, info.height);
      }

      // Selection border
      if (selected === obs.id) {
        ctx.strokeStyle = 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        const selSize = Math.max(info.width, info.height, 30);
        ctx.strokeRect(-selSize / 2 - 4, -selSize / 2 - 4, selSize + 8, selSize + 8);
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Number label (circled)
      const num = obs.number;
      if (num && num > 0) {
        const nx = obs.x + MARGIN;
        const ny = obs.y - Math.max((info.height || 10) / 2, 12) - 6;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'hsl(0, 0%, 25%)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(nx, ny, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'hsl(0, 0%, 15%)';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${num}`, nx, ny);
      }
    });

    // Draw handler path
    if (handlerPath.length > 1) {
      ctx.save();
      ctx.translate(MARGIN, 0);
      ctx.strokeStyle = 'hsl(16, 100%, 55%)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(handlerPath[0].x, handlerPath[0].y);
      // Smooth curve through points using quadratic bezier
      for (let i = 1; i < handlerPath.length - 1; i++) {
        const xc = (handlerPath[i].x + handlerPath[i + 1].x) / 2;
        const yc = (handlerPath[i].y + handlerPath[i + 1].y) / 2;
        ctx.quadraticCurveTo(handlerPath[i].x, handlerPath[i].y, xc, yc);
      }
      // Last point
      const last = handlerPath[handlerPath.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Arrow at end
      if (handlerPath.length >= 2) {
        const p1 = handlerPath[handlerPath.length - 2];
        const p2 = last;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.fillStyle = 'hsl(16, 100%, 55%)';
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 8 * Math.cos(angle - 0.4), p2.y - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(p2.x - 8 * Math.cos(angle + 0.4), p2.y - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [obstacles, selected, showDistances, canvasWidth, canvasHeight, handlerPath]);

  useEffect(() => { draw(); }, [draw]);

  const addObstacle = (type: string) => {
    const info = OBSTACLE_TYPES.find(o => o.type === type)!;
    const isStartFinish = type === 'start' || type === 'finish';
    const num = isStartFinish ? 0 : nextNumber;
    const newObs: Obstacle = {
      id: nextId(), type, x: canvasWidth / 2, y: canvasHeight / 2,
      rotation: 0, label: info.label, number: num,
      ...(type === 'tunnel' ? { tunnelLength: 4 as const, bendAngle: 0 } : {}),
    };
    setObstacles(prev => [...prev, newObs]);
  };

  const findObstacleAt = (cx: number, cy: number): Obstacle | null => {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) continue;
      const hitR = Math.max(info.width, info.height, 24) / 2 + 10;
      if (Math.abs(cx - obs.x) <= hitR && Math.abs(cy - obs.y) <= hitR) return obs;
    }
    return null;
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
    // Convert to canvas coordinates, subtracting margin
    const rawX = (clientX - rect.left) * (totalW / rect.width) - MARGIN;
    const rawY = (clientY - rect.top) * (totalH / rect.height);
    return { x: rawX, y: rawY };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e);
    if (drawingMode) {
      setIsDrawing(true);
      setHandlerPath([{ x: pos.x, y: pos.y }]);
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
    if (drawingMode && isDrawing) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      // Only add point if moved enough distance (reduces points for smoothing)
      const last = handlerPath[handlerPath.length - 1];
      if (last && Math.hypot(pos.x - last.x, pos.y - last.y) > 3) {
        setHandlerPath(prev => [...prev, { x: pos.x, y: pos.y }]);
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

  const updateSelectedNumber = (delta: number) => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected ? { ...o, number: Math.max(0, (o.number || 0) + delta) } : o
    ));
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

  const handleSave = async () => {
    if (!courseName.trim()) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from('saved_courses').insert({
      user_id: userId, name: courseName.trim(), course_data: obstacles as any,
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
    setObstacles(course.course_data);
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

    // Header
    ctx.fillStyle = 'hsl(221, 79%, 48%)';
    ctx.fillRect(0, 0, totalW, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐕 AgilityManager – Banplanerare', padding, headerH / 2);
    const widthM = (canvasWidth * METERS_PER_PX).toFixed(0);
    const heightM = (canvasHeight * METERS_PER_PX).toFixed(0);
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${widthM} × ${heightM} m`, totalW - padding, headerH / 2);

    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, padding, headerH + padding, canvasWidth + MARGIN, canvasHeight + MARGIN);

    // Legend
    const legendY = headerH + padding + canvasHeight + MARGIN + 18;
    const usedTypes = [...new Set(obstacles.map(o => o.type))];
    if (usedTypes.length > 0) {
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let lx = padding;
      usedTypes.forEach(t => {
        const info = OBSTACLE_TYPES.find(o => o.type === t);
        if (!info) return;
        const count = obstacles.filter(o => o.type === t).length;
        ctx.fillStyle = 'hsl(0, 0%, 50%)';
        ctx.fillRect(lx, legendY, 8, 8);
        ctx.fillStyle = 'hsl(0, 0%, 35%)';
        const label = `${info.label} (${count})`;
        ctx.fillText(label, lx + 11, legendY);
        lx += ctx.measureText(label).width + 22;
      });
    }

    // Footer
    const footerY = totalH - footerH;
    ctx.fillStyle = 'hsl(210, 22%, 96%)';
    ctx.fillRect(0, footerY, totalW, footerH);
    ctx.fillStyle = 'hsl(0, 0%, 45%)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Skapad med AgilityManager · agilitymanager.se', totalW / 2, footerY + footerH / 2);
    ctx.fillStyle = 'hsl(16, 100%, 60%)';
    ctx.fillRect(0, footerY, totalW, 2);

    const link = document.createElement('a');
    link.download = 'agility-bana.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
    toast.success('Bana exporterad som PNG');
  };

  const exportJSON = () => {
    const data = JSON.stringify({ obstacles, canvasWidth, canvasHeight }, null, 2);
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
          setObstacles(parsed.obstacles);
          if (parsed.canvasWidth && parsed.canvasHeight) {
            const match = CANVAS_SIZES.find(s => s.width === parsed.canvasWidth && s.height === parsed.canvasHeight);
            if (match) setCanvasSize(match);
          }
          toast.success('Bana importerad!');
        } else {
          toast.error('Ogiltig fil');
        }
      } catch { toast.error('Kunde inte läsa filen'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadPreset = (preset: typeof PRESET_COURSES[0]) => {
    setObstacles(preset.obstacles.map(o => ({ ...o, id: nextId() })));
    setLoadOpen(false);
    toast.success(`Laddade "${preset.name}"`);
  };

  const isPremium = usePremium();

  return (
    <>
    <Helmet>
      <title>Banplanerare Agility – Rita och spara banor | AgilityManager</title>
      <meta name="description" content="Designa agilitybanor med alla SAgiK-godkända hinder. Spara, återanvänd och dela dina banor. Fungerar på mobil och desktop." />
      <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
    </Helmet>
    <PageContainer title="Banplanerare" subtitle="Rita agility-banor">
      <PremiumGate fullPage featureName="Banplaneraren">
      {/* Toolbar */}
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        <Select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onValueChange={(v) => {
            const s = CANVAS_SIZES.find(s => `${s.width}x${s.height}` === v);
            if (s) setCanvasSize(s);
          }}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
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

        <Button variant="outline" size="sm" onClick={() => { setObstacles([]); setSelected(null); }} className="gap-1 h-8 ml-auto">
          Rensa
        </Button>
      </div>

      {/* Toolbar row 2 */}
      <div className="flex gap-2 mb-3 items-center flex-wrap">
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
        <button
          onClick={() => setShowDistances(!showDistances)}
          className={`ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors ${showDistances ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}
        >
          {showDistances ? '📏 Mått på' : '📏 Mått av'}
        </button>
      </div>

      {/* Selected obstacle controls */}
      {selectedObs && (
        <div className="flex gap-2 mb-3 items-center flex-wrap bg-card rounded-lg p-2 shadow-card border border-border">
          <Button variant="outline" size="sm" onClick={rotateSelected} className="gap-1 h-8">
            <RotateCcw size={14} /> 15°
          </Button>
          <Button variant="outline" size="sm" onClick={deleteSelected} className="gap-1 h-8 text-destructive">
            <Trash2 size={14} />
          </Button>

          {/* Number control */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-xs text-muted-foreground">Nr:</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateSelectedNumber(-1)}>
              <Minus size={12} />
            </Button>
            <span className="text-sm font-bold w-6 text-center text-foreground">{selectedObs.number || 0}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateSelectedNumber(1)}>
              <Plus size={12} />
            </Button>
          </div>

          {/* Tunnel controls */}
          {selectedObs.type === 'tunnel' && (
            <>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={toggleTunnelLength}>
                  {selectedObs.tunnelLength || 4}m
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Böj:</span>
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
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth + MARGIN, height: canvasHeight + MARGIN, touchAction: 'none', display: 'block', margin: '0 auto', cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Quick-select obstacle palette at bottom */}
      <div className="sticky bottom-16 bg-background/95 backdrop-blur-sm border-t border-border pt-2 pb-2 -mx-4 px-4 rounded-t-xl shadow-elevated z-10">
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
          {OBSTACLE_TYPES.map(o => (
            <button
              key={o.type}
              onClick={() => addObstacle(o.type)}
              className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-medium bg-card shadow-card border border-border hover:border-primary active:scale-95 transition-all"
            >
              <span className="text-base leading-none">{o.symbol}</span>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Dra hinder för att flytta. {obstacles.length} hinder på banan.
      </p>
      </PremiumGate>
    </PageContainer>
    </>
  );
}
