import { useState, useRef, useCallback, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Trash2, RotateCcw, Plus, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
  created_at: string;
};

const OBSTACLE_TYPES = [
  { type: 'jump', label: 'Hopp', color: 'hsl(221, 79%, 48%)', width: 40, height: 8 },
  { type: 'tunnel', label: 'Tunnel', color: 'hsl(152, 60%, 42%)', width: 60, height: 20 },
  { type: 'a_frame', label: 'A-hinder', color: 'hsl(16, 100%, 60%)', width: 36, height: 36 },
  { type: 'dog_walk', label: 'Brygga', color: 'hsl(45, 90%, 50%)', width: 80, height: 12 },
  { type: 'seesaw', label: 'Vipp', color: 'hsl(270, 60%, 55%)', width: 60, height: 10 },
  { type: 'weave', label: 'Slalom', color: 'hsl(340, 70%, 55%)', width: 50, height: 10 },
  { type: 'tire', label: 'Däck', color: 'hsl(200, 70%, 50%)', width: 24, height: 24 },
  { type: 'table', label: 'Bord', color: 'hsl(30, 60%, 45%)', width: 30, height: 30 },
  { type: 'start', label: 'Start', color: 'hsl(120, 60%, 40%)', width: 30, height: 6 },
  { type: 'finish', label: 'Mål', color: 'hsl(0, 70%, 50%)', width: 30, height: 6 },
];

const CANVAS_SIZES = [
  { label: 'Liten (320×400)', width: 320, height: 400 },
  { label: 'Medium (360×500)', width: 360, height: 500 },
  { label: 'Stor (420×600)', width: 420, height: 600 },
  { label: 'XL (500×700)', width: 500, height: 700 },
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
  const [canvasSize, setCanvasSize] = useState(CANVAS_SIZES[1]); // Medium default

  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;

  // Load saved courses
  useEffect(() => {
    supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
    if (data) setSavedCourses(data as unknown as SavedCourse[]);
    });
  }, []);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Background - grass green
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

    // Draw numbered path
    if (obstacles.length > 1) {
      ctx.strokeStyle = 'hsl(0, 0%, 60%)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      obstacles.forEach((obs, i) => {
        const cx = obs.x;
        const cy = obs.y;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
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

      // Shape
      ctx.fillStyle = info.color;
      if (obs.type === 'tire') {
        ctx.beginPath();
        ctx.arc(0, 0, hw, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'a_frame') {
        ctx.beginPath();
        ctx.moveTo(-hw, hh);
        ctx.lineTo(0, -hh);
        ctx.lineTo(hw, hh);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-hw, -hh, info.width, info.height);
      }

      // Selection border
      if (selected === obs.id) {
        ctx.strokeStyle = 'hsl(221, 79%, 48%)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-hw - 3, -hh - 3, info.width + 6, info.height + 6);
      }

      ctx.restore();

      // Number label
      ctx.fillStyle = 'hsl(0, 0%, 20%)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, obs.x, obs.y - (OBSTACLE_TYPES.find(o => o.type === obs.type)?.height || 10) / 2 - 6);
    });
  }, [obstacles, selected]);

  useEffect(() => { draw(); }, [draw]);

  const addObstacle = (type: string) => {
    const info = OBSTACLE_TYPES.find(o => o.type === type)!;
    const newObs: Obstacle = {
      id: nextId(),
      type,
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      rotation: 0,
      label: info.label,
    };
    setObstacles(prev => [...prev, newObs]);
    setSelected(newObs.id);
  };

  const findObstacleAt = (x: number, y: number): Obstacle | null => {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const info = OBSTACLE_TYPES.find(o => o.type === obs.type);
      if (!info) continue;
      const hw = Math.max(info.width, 20) / 2;
      const hh = Math.max(info.height, 20) / 2;
      if (Math.abs(x - obs.x) <= hw + 5 && Math.abs(y - obs.y) <= hh + 5) {
        return obs;
      }
    }
    return null;
  };

  const getCanvasPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvasWidth / rect.width),
      y: (clientY - rect.top) * (canvasHeight / rect.height),
    };
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

  const handlePointerUp = () => { setDragging(null); };

  const rotateSelected = () => {
    if (!selected) return;
    setObstacles(prev => prev.map(o =>
      o.id === selected ? { ...o, rotation: (o.rotation + 45) % 360 } : o
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
      user_id: userId,
      name: courseName.trim(),
      course_data: obstacles as any,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
    });
    if (error) {
      toast.error('Kunde inte spara');
    } else {
      toast.success('Bana sparad!');
      setSaveOpen(false);
      setCourseName('');
      supabase.from('saved_courses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        if (data) setSavedCourses(data as unknown as SavedCourse[]);
      });
    }
  };

  const loadCourse = (course: SavedCourse) => {
    setObstacles(course.course_data);
    setLoadOpen(false);
    toast.success(`Laddade "${course.name}"`);
  };

  const handleDeleteCourse = async (id: string) => {
    await supabase.from('saved_courses').delete().eq('id', id);
    setSavedCourses(prev => prev.filter(c => c.id !== id));
    toast.success('Bana raderad');
  };

  return (
    <PageContainer title="Banplanerare" subtitle="Rita agility-banor">
      {/* Toolbar */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1" disabled={obstacles.length === 0}>
              <Save size={14} /> Spara
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Spara bana</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Namn</Label>
                <Input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="T.ex. Söndagsträning" />
              </div>
              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground" disabled={!courseName.trim()}>
                Spara
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <FolderOpen size={14} /> Ladda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Sparade banor</DialogTitle></DialogHeader>
            {savedCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Inga sparade banor.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {savedCourses.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <button onClick={() => loadCourse(c)} className="text-sm font-medium text-foreground text-left flex-1">
                      {c.name}
                    </button>
                    <button onClick={() => handleDeleteCourse(c.id)} className="text-muted-foreground hover:text-destructive ml-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {selected && (
          <>
            <Button variant="outline" size="sm" onClick={rotateSelected} className="gap-1">
              <RotateCcw size={14} /> Rotera
            </Button>
            <Button variant="outline" size="sm" onClick={deleteSelected} className="gap-1 text-destructive">
              <Trash2 size={14} /> Ta bort
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => { setObstacles([]); setSelected(null); }} className="gap-1 ml-auto">
          Rensa
        </Button>
      </div>

      {/* Obstacle palette */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {OBSTACLE_TYPES.map(o => (
          <button
            key={o.type}
            onClick={() => addObstacle(o.type)}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-card shadow-card border border-border hover:border-primary transition-colors"
            style={{ borderLeftColor: o.color, borderLeftWidth: 3 }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="bg-card rounded-xl shadow-elevated overflow-hidden mb-4">
        <canvas
          ref={canvasRef}
          style={{ width: canvasWidth, height: canvasHeight, touchAction: 'none', display: 'block', margin: '0 auto' }}
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
        Tryck på ett hinder i paletten för att lägga till. Dra för att flytta. {obstacles.length} hinder på banan.
      </p>
    </PageContainer>
  );
}
