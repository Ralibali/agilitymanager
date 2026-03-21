import { useState, useRef, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, FolderOpen, Download, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumGate, usePremium, PremiumBadge } from '@/components/PremiumGate';

type Obstacle = {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  label: string;
};

type SavedCourse = {
  id: string;
  name: string;
  course_data: Obstacle[];
  canvas_width: number;
  canvas_height: number;
  created_at: string;
};

const OBSTACLE_TYPES = [
  { type: 'jump', label: 'Hopp', color: 'hsl(221, 79%, 48%)', width: 40, height: 8 },
  { type: 'long_jump', label: 'Långhopp', color: 'hsl(221, 60%, 58%)', width: 50, height: 16 },
  { type: 'oxer', label: 'Oxer', color: 'hsl(200, 70%, 45%)', width: 40, height: 14 },
  { type: 'wall', label: 'Muren', color: 'hsl(30, 30%, 50%)', width: 36, height: 20 },
  { type: 'tunnel', label: 'Tunnel', color: 'hsl(152, 60%, 42%)', width: 60, height: 20 },
  { type: 'a_frame', label: 'A-hinder', color: 'hsl(16, 100%, 60%)', width: 36, height: 36 },
  { type: 'dog_walk', label: 'Brygga', color: 'hsl(45, 90%, 50%)', width: 80, height: 12 },
  { type: 'seesaw', label: 'Vipp', color: 'hsl(270, 60%, 55%)', width: 60, height: 10 },
  { type: 'balance', label: 'Balans', color: 'hsl(180, 50%, 45%)', width: 70, height: 10 },
  { type: 'weave', label: 'Slalom', color: 'hsl(340, 70%, 55%)', width: 50, height: 10 },
  { type: 'tire', label: 'Däck', color: 'hsl(200, 70%, 50%)', width: 24, height: 24 },
  { type: 'start', label: 'Start', color: 'hsl(120, 60%, 40%)', width: 30, height: 6 },
  { type: 'finish', label: 'Mål', color: 'hsl(0, 70%, 50%)', width: 30, height: 6 },
];

const CANVAS_SIZES = [
  { label: 'Liten (320×400)', width: 320, height: 400 },
  { label: 'Medium (360×500)', width: 360, height: 500 },
  { label: 'Stor (420×600)', width: 420, height: 600 },
  { label: 'XL (500×700)', width: 500, height: 700 },
];

// Scale factor: 1 canvas pixel ≈ 0.05m (adjustable per canvas size)
const METERS_PER_PX = 0.05;

const PRESET_COURSES: { name: string; obstacles: Obstacle[] }[] = [
  {
    name: 'Nybörjarbana (6 hinder)',
    obstacles: [
      { id: 'p1', type: 'start', x: 180, y: 450, rotation: 0, label: 'Start' },
      { id: 'p2', type: 'jump', x: 180, y: 380, rotation: 0, label: 'Hopp' },
      { id: 'p3', type: 'tunnel', x: 180, y: 300, rotation: 0, label: 'Tunnel' },
      { id: 'p4', type: 'jump', x: 120, y: 220, rotation: 45, label: 'Hopp' },
      { id: 'p5', type: 'weave', x: 180, y: 140, rotation: 0, label: 'Slalom' },
      { id: 'p6', type: 'jump', x: 240, y: 80, rotation: 0, label: 'Hopp' },
      { id: 'p7', type: 'finish', x: 180, y: 30, rotation: 0, label: 'Mål' },
    ],
  },
  {
    name: 'Kontaktbana (8 hinder)',
    obstacles: [
      { id: 'c1', type: 'start', x: 80, y: 460, rotation: 0, label: 'Start' },
      { id: 'c2', type: 'jump', x: 80, y: 390, rotation: 0, label: 'Hopp' },
      { id: 'c3', type: 'a_frame', x: 160, y: 330, rotation: 0, label: 'A-hinder' },
      { id: 'c4', type: 'tunnel', x: 260, y: 270, rotation: 90, label: 'Tunnel' },
      { id: 'c5', type: 'dog_walk', x: 180, y: 200, rotation: 0, label: 'Brygga' },
      { id: 'c6', type: 'seesaw', x: 100, y: 140, rotation: 0, label: 'Vipp' },
      { id: 'c7', type: 'jump', x: 200, y: 80, rotation: 30, label: 'Hopp' },
      { id: 'c8', type: 'weave', x: 280, y: 40, rotation: 0, label: 'Slalom' },
      { id: 'c9', type: 'finish', x: 280, y: 10, rotation: 0, label: 'Mål' },
    ],
  },
  {
    name: 'Tävlingsbana K1 (12 hinder)',
    obstacles: [
      { id: 't1', type: 'start', x: 60, y: 470, rotation: 0, label: 'Start' },
      { id: 't2', type: 'jump', x: 60, y: 420, rotation: 0, label: 'Hopp' },
      { id: 't3', type: 'jump', x: 130, y: 370, rotation: 30, label: 'Hopp' },
      { id: 't4', type: 'tunnel', x: 240, y: 340, rotation: 90, label: 'Tunnel' },
      { id: 't5', type: 'a_frame', x: 300, y: 270, rotation: 0, label: 'A-hinder' },
      { id: 't6', type: 'jump', x: 220, y: 220, rotation: 0, label: 'Hopp' },
      { id: 't7', type: 'weave', x: 120, y: 190, rotation: 0, label: 'Slalom' },
      { id: 't8', type: 'dog_walk', x: 180, y: 140, rotation: 0, label: 'Brygga' },
      { id: 't9', type: 'long_jump', x: 280, y: 110, rotation: 0, label: 'Långhopp' },
      { id: 't10', type: 'tire', x: 200, y: 70, rotation: 0, label: 'Däck' },
      { id: 't11', type: 'seesaw', x: 100, y: 40, rotation: 0, label: 'Vipp' },
      { id: 't12', type: 'jump', x: 60, y: 15, rotation: 0, label: 'Hopp' },
      { id: 't13', type: 'finish', x: 60, y: 5, rotation: 0, label: 'Mål' },
    ],
  },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;

  useEffect(() => {
    supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setSavedCourses(data as unknown as SavedCourse[]);
    });
  }, []);

  const distBetween = (a: Obstacle, b: Obstacle) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) * METERS_PER_PX;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = 'hsl(120, 30%, 92%)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid
    ctx.strokeStyle = 'hsl(120, 20%, 85%)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvasWidth; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Path lines + distance labels
    if (obstacles.length > 1) {
      ctx.strokeStyle = 'hsl(0, 0%, 60%)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      obstacles.forEach((obs, i) => {
        if (i === 0) ctx.moveTo(obs.x, obs.y);
        else ctx.lineTo(obs.x, obs.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Distance labels between consecutive obstacles
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
          ctx.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
          const text = `${dist.toFixed(1)}m`;
          const tw = ctx.measureText(text).width + 6;
          ctx.fillRect(mx - tw / 2, my - 6, tw, 12);
          ctx.fillStyle = 'hsl(0, 0%, 35%)';
          ctx.fillText(text, mx, my);
        }
      }
    }

    // Draw obstacles
    obstacles.forEach((obs, i) => {
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) return;

      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate((obs.rotation * Math.PI) / 180);

      const hw = info.width / 2;
      const hh = info.height / 2;

      ctx.fillStyle = info.color;

      // Draw shapes by type
      if (obs.type === 'tire') {
        ctx.beginPath();
        ctx.arc(0, 0, hw, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'hsla(0,0%,0%,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, hw * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (obs.type === 'a_frame') {
        ctx.beginPath();
        ctx.moveTo(-hw, hh);
        ctx.lineTo(0, -hh);
        ctx.lineTo(hw, hh);
        ctx.closePath();
        ctx.fill();
      } else if (obs.type === 'wall') {
        ctx.fillRect(-hw, -hh, info.width, info.height);
        // Brick pattern
        ctx.strokeStyle = 'hsla(0,0%,100%,0.3)';
        ctx.lineWidth = 0.5;
        for (let r = -hh + 5; r < hh; r += 5) {
          ctx.beginPath(); ctx.moveTo(-hw, r); ctx.lineTo(hw, r); ctx.stroke();
        }
      } else if (obs.type === 'long_jump') {
        // Multiple bars
        for (let j = 0; j < 3; j++) {
          ctx.fillRect(-hw, -hh + j * 6, info.width, 3);
        }
      } else if (obs.type === 'oxer') {
        ctx.fillRect(-hw, -hh, info.width, 4);
        ctx.fillRect(-hw, hh - 4, info.width, 4);
      } else if (obs.type === 'balance') {
        ctx.fillRect(-hw, -hh, info.width, info.height);
        ctx.strokeStyle = 'hsla(0,0%,100%,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0);
        ctx.stroke();
      } else {
        ctx.fillRect(-hw, -hh, info.width, info.height);
      }

      // Rotation indicator arrow
      if (obs.rotation !== 0) {
        ctx.fillStyle = 'hsla(0,0%,100%,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -hh - 2);
        ctx.lineTo(-4, -hh - 8);
        ctx.lineTo(4, -hh - 8);
        ctx.closePath();
        ctx.fill();
      }

      // Selection border
      if (selected === obs.id) {
        ctx.strokeStyle = 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(-hw - 4, -hh - 4, info.width + 8, info.height + 8);
        ctx.setLineDash([]);
        // Rotation angle badge
        if (obs.rotation !== 0) {
          ctx.fillStyle = 'hsl(221, 79%, 48%)';
          ctx.globalAlpha = 0.85;
          const badge = `${obs.rotation}°`;
          ctx.font = 'bold 9px sans-serif';
          const bw = ctx.measureText(badge).width + 6;
          ctx.fillRect(hw + 2, -hh - 10, bw, 14);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badge, hw + 2 + bw / 2, -hh - 3);
        }
      }

      ctx.restore();

      // Number label
      ctx.fillStyle = 'hsl(0, 0%, 20%)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${i + 1}`, obs.x, obs.y - (info.height || 10) / 2 - 4);
    });
  }, [obstacles, selected, showDistances, canvasWidth, canvasHeight]);

  useEffect(() => { draw(); }, [draw]);

  const addObstacle = (type: string) => {
    const info = OBSTACLE_TYPES.find(o => o.type === type)!;
    setObstacles(prev => [...prev, {
      id: nextId(), type, x: canvasWidth / 2, y: canvasHeight / 2, rotation: 0, label: info.label,
    }]);
  };

  const findObstacleAt = (x: number, y: number): Obstacle | null => {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) continue;
      const hw = Math.max(info.width, 24) / 2;
      const hh = Math.max(info.height, 24) / 2;
      if (Math.abs(x - obs.x) <= hw + 10 && Math.abs(y - obs.y) <= hh + 10) return obs;
    }
    return null;
  };

  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX; clientY = e.clientY;
    } else return { x: 0, y: 0 };
    return { x: (clientX - rect.left) * (canvasWidth / rect.width), y: (clientY - rect.top) * (canvasHeight / rect.height) };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e);
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
    if (!dragging) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    setObstacles(prev => prev.map(o =>
      o.id === dragging ? { ...o, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y } : o
    ));
  };

  const handlePointerUp = () => setDragging(null);

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
    const totalW = canvasWidth + padding * 2;
    const totalH = canvasHeight + padding * 2 + headerH + footerH;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalW * dpr;
    exportCanvas.height = totalH * dpr;
    const ctx = exportCanvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // Header
    ctx.fillStyle = 'hsl(221, 79%, 48%)';
    ctx.fillRect(0, 0, totalW, headerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐕 AgilityManager – Banplanerare', padding, headerH / 2);

    // Canvas size in meters
    const widthM = (canvasWidth * METERS_PER_PX).toFixed(0);
    const heightM = (canvasHeight * METERS_PER_PX).toFixed(0);
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${widthM} × ${heightM} m`, totalW - padding, headerH / 2);

    // Draw course canvas content
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, padding, headerH + padding, canvasWidth, canvasHeight);

    // Dimension labels on sides
    ctx.fillStyle = 'hsl(0, 0%, 45%)';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${widthM} m`, totalW / 2, headerH + padding + canvasHeight + 4);

    ctx.save();
    ctx.translate(padding - 6, headerH + padding + canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${heightM} m`, 0, 0);
    ctx.restore();

    // Obstacle legend
    const legendY = headerH + padding + canvasHeight + 18;
    const usedTypes = [...new Set(obstacles.map(o => o.type))];
    if (usedTypes.length > 0 && legendY + 14 < totalH - footerH) {
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let lx = padding;
      usedTypes.forEach(t => {
        const info = OBSTACLE_TYPES.find(o => o.type === t);
        if (!info) return;
        const count = obstacles.filter(o => o.type === t).length;
        ctx.fillStyle = info.color;
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
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Skapad med AgilityManager · agilitymanager.lovable.app', totalW / 2, footerY + footerH / 2);

    // Orange accent line
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

            {/* Presets */}
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

            {/* Saved courses */}
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

        {selected && (
          <>
            <Button variant="outline" size="sm" onClick={rotateSelected} className="gap-1 h-8">
              <RotateCcw size={14} /> 15°
            </Button>
            <Button variant="outline" size="sm" onClick={deleteSelected} className="gap-1 h-8 text-destructive">
              <Trash2 size={14} />
            </Button>
          </>
        )}

        <Button variant="outline" size="sm" onClick={() => { setObstacles([]); setSelected(null); }} className="gap-1 h-8 ml-auto">
          Rensa
        </Button>
      </div>

      {/* Toolbar row 2: export/import + distance toggle */}
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

      {/* Obstacle palette – compact grid */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-3">
        {OBSTACLE_TYPES.map(o => (
          <button
            key={o.type}
            onClick={() => addObstacle(o.type)}
            className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg text-[10px] font-medium bg-card shadow-card border border-border hover:border-primary transition-colors"
          >
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: o.color }} />
            {o.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="bg-card rounded-xl shadow-elevated overflow-auto mb-4">
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: canvasHeight, touchAction: 'none', display: 'block', margin: '0 auto', cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Dra hinder för att flytta. Rotera i 15°-steg. {obstacles.length} hinder på banan.
      </p>
      </PremiumGate>
    </PageContainer>
  );
}
