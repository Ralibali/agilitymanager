import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DogAvatar } from '@/components/DogAvatar';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import type { Dog } from '@/types';
import { Plus, Stethoscope, Syringe, Weight, Calendar, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

type HealthLog = {
  id: string;
  dog_id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  weight_kg: number | null;
  next_date: string | null;
  created_at: string;
};

const LOG_TYPES = [
  { value: 'vet_visit', label: 'Veterinärbesök', icon: Stethoscope },
  { value: 'vaccination', label: 'Vaccination', icon: Syringe },
  { value: 'weight', label: 'Vägning', icon: Weight },
  { value: 'other', label: 'Övrigt', icon: Calendar },
];

export default function HealthPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Form state
  const [dogId, setDogId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('vet_visit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [d, { data }] = await Promise.all([
      store.getDogs(),
      supabase.from('health_logs').select('*').order('date', { ascending: false }),
    ]);
    setDogs(d);
    setLogs((data as HealthLog[]) || []);
    if (d.length > 0 && !dogId) setDogId(d[0].id);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleSubmit = async () => {
    if (!dogId || !title.trim()) return;
    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from('health_logs').insert({
      user_id: userId,
      dog_id: dogId,
      date,
      type,
      title: title.trim(),
      description: description.trim(),
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      next_date: nextDate || null,
    });
    setSaving(false);
    if (error) {
      toast.error('Kunde inte spara');
    } else {
      toast.success('Hälsologg sparad!');
      setOpen(false);
      setTitle('');
      setDescription('');
      setWeightKg('');
      setNextDate('');
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('health_logs').delete().eq('id', id);
    toast.success('Raderad');
    refresh();
  };

  const getDog = (id: string) => dogs.find(d => d.id === id);
  const getTypeInfo = (t: string) => LOG_TYPES.find(lt => lt.value === t) || LOG_TYPES[3];

  if (loading) return <PageContainer title="Hälsa"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <PageContainer
      title="Hälsa"
      subtitle={`${logs.length} loggar`}
      action={
        dogs.length > 0 ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus size={16} /> Lägg till
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Ny hälsologg</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Hund</Label>
                  <Select value={dogId} onValueChange={setDogId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Datum</Label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Typ</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LOG_TYPES.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Titel *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="T.ex. Årlig kontroll" />
                </div>
                <div>
                  <Label>Beskrivning</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                </div>
                {type === 'weight' && (
                  <div>
                    <Label>Vikt (kg)</Label>
                    <Input type="number" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                  </div>
                )}
                {(type === 'vaccination' || type === 'vet_visit') && (
                  <div>
                    <Label>Nästa datum</Label>
                    <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} />
                  </div>
                )}
                <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground" disabled={!title.trim() || saving}>
                  {saving ? 'Sparar...' : 'Spara'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      {logs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-2">Inga hälsologgar ännu.</p>
          {dogs.length === 0 && <p className="text-sm">Lägg till en hund först!</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => {
            const dog = getDog(log.dog_id);
            const typeInfo = getTypeInfo(log.type);
            const TypeIcon = typeInfo.icon;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TypeIcon size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-foreground text-sm">{log.title}</h3>
                      <button onClick={() => handleDelete(log.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.date), 'd MMM yyyy', { locale: sv })} · {typeInfo.label}
                      {dog && ` · ${dog.name}`}
                    </div>
                    {log.description && <p className="mt-1 text-xs text-muted-foreground">{log.description}</p>}
                    {log.weight_kg && (
                      <div className="mt-1 text-xs font-medium text-foreground">{log.weight_kg} kg</div>
                    )}
                    {log.next_date && (
                      <div className="mt-1 text-xs text-primary">
                        Nästa: {format(new Date(log.next_date), 'd MMM yyyy', { locale: sv })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
