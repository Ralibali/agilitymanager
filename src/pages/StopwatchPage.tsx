import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { store } from '@/lib/store';
import type { Dog } from '@/types';
import { Play, Square, RotateCcw, AlertTriangle, Ban, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

type StopwatchState = 'idle' | 'running' | 'stopped';

export default function StopwatchPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState('');
  const [state, setState] = useState<StopwatchState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [faults, setFaults] = useState(0);
  const [refusals, setRefusals] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Array<{ id: string; time_ms: number; faults: number; refusals: number; date: string }>>([]);

  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    store.getDogs().then(d => {
      setDogs(d);
      if (d.length > 0) setDogId(d[0].id);
    });
  }, []);

  useEffect(() => {
    if (dogId) {
      loadHistory();
    }
  }, [dogId]);

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
    setElapsed(0);
    setFaults(0);
    setRefusals(0);
    setState('running');
    rafRef.current = requestAnimationFrame(tick);
    tryHaptic();
  };

  const handleStop = () => {
    cancelAnimationFrame(rafRef.current);
    setState('stopped');
    tryHaptic();
  };

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setFaults(0);
    setRefusals(0);
    setNotes('');
    setState('idle');
  };

  const handleFault = () => {
    setFaults(f => f + 1);
    tryHaptic();
  };

  const handleRefusal = () => {
    setRefusals(r => r + 1);
    tryHaptic();
  };

  const tryHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleSave = async () => {
    if (!dogId || elapsed === 0) return;
    setSaving(true);
    const userId = (await (await import('@/integrations/supabase/client')).supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await (await import('@/integrations/supabase/client')).supabase
      .from('stopwatch_results')
      .insert({
        user_id: userId,
        dog_id: dogId,
        time_ms: elapsed,
        faults,
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
      <title>Tidtagarur Agility | AgilityManager</title>
      <meta name="description" content="Mät tider med fel- och vägringsregistrering. Spara resultat per hund." />
    </Helmet>
    <PageContainer title="Tidtagarur" subtitle="Mät dina banor">
      {/* Dog selector */}
      {dogs.length > 0 && (
        <div className="mb-4">
          <Label>Hund</Label>
          <Select value={dogId} onValueChange={setDogId}>
            <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
            <SelectContent>
              {dogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Timer display */}
      <motion.div
        className="bg-card rounded-2xl p-8 shadow-elevated mb-6 text-center"
        animate={state === 'running' ? { boxShadow: '0 0 30px hsl(221 79% 48% / 0.2)' } : {}}
      >
        <div className={`font-display text-6xl font-bold tabular-nums ${state === 'running' ? 'text-primary' : 'text-foreground'}`}>
          {formatTime(elapsed)}
        </div>

        {/* Fault/refusal counters */}
        <div className="flex items-center justify-center gap-8 mt-4">
          <button
            onClick={handleFault}
            disabled={state !== 'running'}
            className="flex flex-col items-center gap-1 disabled:opacity-30"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center active:scale-90 transition-transform">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Fel</span>
            <span className="text-lg font-bold text-foreground">{faults}</span>
          </button>
          <button
            onClick={handleRefusal}
            disabled={state !== 'running'}
            className="flex flex-col items-center gap-1 disabled:opacity-30"
          >
            <div className="w-14 h-14 rounded-full bg-warning/10 flex items-center justify-center active:scale-90 transition-transform">
              <Ban size={24} className="text-warning" />
            </div>
            <span className="text-xs text-muted-foreground">Väg.</span>
            <span className="text-lg font-bold text-foreground">{refusals}</span>
          </button>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {state === 'idle' && (
          <Button onClick={handleStart} className="flex-1 h-14 text-lg gradient-primary text-primary-foreground gap-2" disabled={!dogId}>
            <Play size={22} /> Starta
          </Button>
        )}
        {state === 'running' && (
          <Button onClick={handleStop} variant="destructive" className="flex-1 h-14 text-lg gap-2">
            <Square size={22} /> Stoppa
          </Button>
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

      {/* Notes (when stopped) */}
      <AnimatePresence>
        {state === 'stopped' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
            <Label>Notering</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Hur gick det?" />
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
  );
}
