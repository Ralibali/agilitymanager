import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/lib/store';
import type { Dog } from '@/types';
import { Play, Square, RotateCcw, Save, Timer, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type StopwatchState = 'idle' | 'running' | 'stopped';

type FaultEntry = { type: string; count: number };

type LapEntry = { time: number; faults: FaultEntry[] };

const AGILITY_FAULT_TYPES = ['Hopp', 'Tunnel', 'Kontakt', 'Slalom', 'Refus', 'Bordstopp'];
const HOOPERS_FAULT_TYPES = ['Hoop', 'Tunnel', 'Tunna', 'Staket', 'DO-zon'];

export default function StopwatchPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState('');
  const [state, setState] = useState<StopwatchState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [faultEntries, setFaultEntries] = useState<FaultEntry[]>([]);
  const [laps, setLaps] = useState<LapEntry[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; time_ms: number; faults: number; refusals: number; date: string }>>([]);

  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const lastLapRef = useRef(0);

  const selectedDog = useMemo(() => dogs.find(d => d.id === dogId), [dogs, dogId]);
  const isHoopers = selectedDog?.sport === 'Hoopers';
  const faultTypes = isHoopers ? HOOPERS_FAULT_TYPES : AGILITY_FAULT_TYPES;
  const currentFaults = faultEntries.reduce((s, f) => s + f.count, 0);
  const lapFaults = laps.reduce((s, lap) => s + lap.faults.reduce((ls, f) => ls + f.count, 0), 0);
  const totalFaults = currentFaults + lapFaults;

  useEffect(() => {
    store.getDogs().then(d => {
      setDogs(d);
      if (d.length > 0) setDogId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (dogId) loadHistory();
  }, [dogId]);

  // Reset fault types when dog changes
  useEffect(() => {
    setFaultEntries(faultTypes.map(t => ({ type: t, count: 0 })));
  }, [isHoopers]);

  const loadHistory = async () => {
    if (!dogId) return;
    const { data } = await (await import('@/integrations/supabase/client')).supabase
      .from('stopwatch_results')
      .select('*')
      .eq('dog_id', dogId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data as any);
  };

  const tick = useCallback(() => {
    setElapsed(Date.now() - startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    lastLapRef.current = 0;
    setElapsed(0);
    setFaultEntries(faultTypes.map(t => ({ type: t, count: 0 })));
    setLaps([]);
    setState('running');
    rafRef.current = requestAnimationFrame(tick);
    tryWakeLock();
    tryHaptic();
  };

  const handleStop = () => {
    cancelAnimationFrame(rafRef.current);
    setState('stopped');
    releaseWakeLock();
    tryHaptic();
  };

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setFaultEntries(faultTypes.map(t => ({ type: t, count: 0 })));
    setLaps([]);
    setNotes('');
    setState('idle');
    releaseWakeLock();
  };

  const handleFaultTap = (faultType: string) => {
    setFaultEntries(prev => prev.map(f => f.type === faultType ? { ...f, count: f.count + 1 } : f));
    tryHaptic();
  };

  const handleLap = () => {
    const lapTime = elapsed - lastLapRef.current;
    lastLapRef.current = elapsed;
    setLaps(prev => [...prev, { time: lapTime, faults: [...faultEntries] }]);
    // Reset fault counters for next lap
    setFaultEntries(faultTypes.map(t => ({ type: t, count: 0 })));
    tryHaptic();
  };

  const tryHaptic = () => {
    if ('vibrate' in navigator) navigator.vibrate(30);
  };

  const wakeLockRef = useRef<any>(null);
  const tryWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  };
  const releaseWakeLock = () => {
    try { wakeLockRef.current?.release(); } catch {}
    wakeLockRef.current = null;
  };

  const handleSave = async () => {
    if (!dogId || elapsed === 0) return;
    setSaving(true);
    const userId = (await (await import('@/integrations/supabase/client')).supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const refusals = faultEntries.find(f => f.type === 'Refus')?.count || 0;
    const { error } = await (await import('@/integrations/supabase/client')).supabase
      .from('stopwatch_results')
      .insert({
        user_id: userId,
        dog_id: dogId,
        time_ms: elapsed,
        faults: totalFaults,
        refusals,
        notes: notes.trim(),
      });
    setSaving(false);
    if (error) {
      toast.error('Kunde inte spara');
    } else {
      toast.success('Tid sparad!');
      handleReset();
      loadHistory();
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const centis = Math.floor((ms % 1000) / 10);
    return `${minutes > 0 ? `${minutes}:` : ''}${seconds.toString().padStart(minutes > 0 ? 2 : 1, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  return (
    <>
    <Helmet>
      <title>Tidtagarur – Agility & Hoopers | AgilityManager</title>
      <meta name="description" content="Mät tider med feltyps-registrering per hinder. Stöd för agility och hoopers." />
    </Helmet>
    <PageContainer title="Tidtagarur" subtitle={isHoopers ? 'Hoopers-läge' : 'Agility-läge'}>
      {/* Dog selector */}
      {dogs.length > 0 && (
        <div className="mb-4">
          <Label>Hund</Label>
          <Select value={dogId} onValueChange={setDogId}>
            <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
            <SelectContent>
              {dogs.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} {d.sport === 'Hoopers' ? '🅞' : '🐕'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Timer display */}
      <motion.div
        className="bg-card rounded-2xl p-6 shadow-elevated mb-4 text-center"
        animate={state === 'running' ? { boxShadow: '0 0 30px hsl(221 79% 48% / 0.2)' } : {}}
      >
        <div className={`font-display text-6xl font-bold tabular-nums ${state === 'running' ? 'text-primary' : 'text-foreground'}`}>
          {formatTime(elapsed)}
        </div>

        {/* Fault counters - total */}
        <div className="flex items-center justify-center gap-4 mt-3 text-sm">
          <span className={totalFaults > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
            {totalFaults} fel
          </span>
          {laps.length > 0 && (
            <span className="text-muted-foreground">{laps.length} varv</span>
          )}
        </div>
      </motion.div>

      {/* Fault type buttons */}
      {state === 'running' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Label className="text-xs text-muted-foreground mb-1.5 block">Tryck för att registrera fel:</Label>
          <div className="grid grid-cols-3 gap-2">
            {faultEntries.map(fe => (
              <button
                key={fe.type}
                onClick={() => handleFaultTap(fe.type)}
                className="relative bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all rounded-xl p-3 text-center"
              >
                <div className="text-xs font-medium text-foreground">{fe.type}</div>
                {fe.count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {fe.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-4">
        {state === 'idle' && (
          <Button onClick={handleStart} className="flex-1 h-14 text-lg gradient-primary text-primary-foreground gap-2" disabled={!dogId}>
            <Play size={22} /> Starta
          </Button>
        )}
        {state === 'running' && (
          <>
            <Button onClick={handleLap} variant="outline" className="h-14 gap-2 px-4">
              <Flag size={18} /> Varv
            </Button>
            <Button onClick={handleStop} variant="destructive" className="flex-1 h-14 text-lg gap-2">
              <Square size={22} /> Stoppa
            </Button>
          </>
        )}
        {state === 'stopped' && (
          <>
            <Button onClick={handleReset} variant="outline" className="flex-1 h-14 gap-2">
              <RotateCcw size={18} /> Nollställ
            </Button>
            <Button onClick={handleSave} className="flex-1 h-14 gradient-accent text-accent-foreground gap-2" disabled={saving}>
              <Save size={18} /> {saving ? 'Sparar...' : 'Spara'}
            </Button>
          </>
        )}
      </div>

      {/* Laps */}
      <AnimatePresence>
        {laps.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
            <Label className="text-xs text-muted-foreground mb-1 block">Varv</Label>
            <div className="space-y-1">
              {laps.map((lap, i) => {
                const lapFaults = lap.faults.reduce((s, f) => s + f.count, 0);
                const faultDetail = lap.faults.filter(f => f.count > 0).map(f => `${f.count} ${f.type}`).join(', ');
                return (
                  <div key={i} className="bg-card rounded-lg p-2 flex items-center justify-between text-sm shadow-card">
                    <span className="font-display font-semibold text-foreground">Varv {i + 1}: {formatTime(lap.time)}</span>
                    <span className={lapFaults > 0 ? 'text-destructive text-xs' : 'text-success text-xs'}>
                      {lapFaults > 0 ? faultDetail : 'Rent!'}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stopped: fault breakdown + notes */}
      <AnimatePresence>
        {state === 'stopped' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 space-y-3">
            {/* Fault breakdown */}
            {totalFaults > 0 && (
              <div className="bg-destructive/5 rounded-lg p-3">
                <Label className="text-xs text-muted-foreground mb-1 block">Felfördelning</Label>
                <div className="grid grid-cols-3 gap-2">
                  {faultEntries.filter(f => f.count > 0).map(f => (
                    <div key={f.type} className="text-center">
                      <div className="text-lg font-bold text-destructive">{f.count}</div>
                      <div className="text-[10px] text-muted-foreground">{f.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>Notering</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Hur gick det?" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-foreground mb-2">Senaste tider</h2>
          <div className="space-y-2">
            {history.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-3 shadow-card flex items-center justify-between"
              >
                <div>
                  <span className="font-display font-bold text-foreground">{formatTime(h.time_ms)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{h.date}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className={h.faults > 0 ? 'text-destructive' : 'text-success'}>{h.faults} fel</span>
                  <span className={h.refusals > 0 ? 'text-warning' : 'text-muted-foreground'}>{h.refusals} väg.</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
    </>
  );
}
