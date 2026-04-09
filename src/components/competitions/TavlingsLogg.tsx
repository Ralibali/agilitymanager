import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Dog } from '@/types';
import type { CompetitionLogEntry } from '@/types/competitions';

interface Props {
  dogs: Dog[];
}

export function TavlingsLogg({ dogs }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<CompetitionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterDog, setFilterDog] = useState('all');

  // Form state
  const [dogName, setDogName] = useState('');
  const [city, setCity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [discipline, setDiscipline] = useState('Agility');
  const [classLevel, setClassLevel] = useState('Klass 1');
  const [starts, setStarts] = useState('1');
  const [notes, setNotes] = useState('');

  const fetchEntries = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('competition_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    setEntries((data || []) as unknown as CompetitionLogEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const handleSave = async () => {
    if (!user || !dogName) return;
    setSaving(true);
    const { error } = await supabase.from('competition_log').insert({
      user_id: user.id,
      dog_name: dogName,
      city: city.trim(),
      date,
      discipline,
      class: classLevel,
      starts: parseInt(starts) || 1,
      notes: notes.trim(),
    });
    if (error) {
      toast({ title: 'Fel', description: 'Kunde inte spara', variant: 'destructive' });
    } else {
      toast({ title: 'Sparat!' });
      setCity('');
      setNotes('');
      setStarts('1');
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('competition_log').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = filterDog === 'all' ? entries : entries.filter(e => e.dog_name === filterDog);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm">Logga genomförd tävling</h3>

        <div>
          <Label className="text-xs">Hund</Label>
          <Select value={dogName} onValueChange={setDogName}>
            <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
            <SelectContent>
              {dogs.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Stad/plats</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} placeholder="T.ex. Göteborg" />
          </div>
          <div>
            <Label className="text-xs">Datum</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Disciplin</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Agility">Agility</SelectItem>
                <SelectItem value="Hopp">Hopp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Klass</Label>
            <Select value={classLevel} onValueChange={setClassLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Klass 1">Klass 1</SelectItem>
                <SelectItem value="Klass 2">Klass 2</SelectItem>
                <SelectItem value="Klass 3">Klass 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Antal starter</Label>
          <Input type="number" min={1} max={10} value={starts} onChange={e => setStarts(e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">Anteckningar</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
        </div>

        <Button onClick={handleSave} disabled={!dogName || saving} className="w-full gradient-accent text-accent-foreground">
          {saving ? 'Sparar...' : 'Spara'}
        </Button>
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">Loggade tävlingar</h3>
          {dogs.length > 0 && (
            <Select value={filterDog} onValueChange={setFilterDog}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla hundar</SelectItem>
                {dogs.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Inga loggade tävlingar ännu</p>
        ) : (
          filtered.map(e => (
            <div key={e.id} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{e.dog_name} — {e.discipline} {e.class}</div>
                <div className="text-xs text-muted-foreground">{e.city} • {e.date} • {e.starts} starter</div>
                {e.notes && <div className="text-xs text-muted-foreground mt-0.5">{e.notes}</div>}
              </div>
              <button onClick={() => handleDelete(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
