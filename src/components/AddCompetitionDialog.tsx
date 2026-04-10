import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Trophy } from 'lucide-react';
import type { Discipline, SizeClass, CompetitionLevel, Dog } from '@/types';
import { store } from '@/lib/store';

interface Props {
  onAdded: () => void;
  dogs: Dog[];
  trigger?: React.ReactNode;
}

export function AddCompetitionDialog({ onAdded, dogs, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [dogId, setDogId] = useState(dogs[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventName, setEventName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('Agility');
  const [sizeClass, setSizeClass] = useState<SizeClass>('L');
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel>('K1');
  const [faults, setFaults] = useState('0');
  const [timeSec, setTimeSec] = useState('');
  const [passed, setPassed] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [placement, setPlacement] = useState('');
  const [courseLength, setCourseLength] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedDog = dogs.find(d => d.id === dogId);

  // Auto-fill size class when dog changes
  useEffect(() => {
    if (selectedDog) {
      setSizeClass(selectedDog.size_class);
    }
  }, [dogId]);

  // Auto-fill competition level when dog or discipline changes
  useEffect(() => {
    if (!selectedDog) return;
    if (discipline === 'Agility') {
      setCompetitionLevel(selectedDog.competition_level);
    } else if (discipline === 'Jumping') {
      setCompetitionLevel(selectedDog.jumping_level);
    }
  }, [dogId, discipline]);

  const handleSubmit = async () => {
    if (!dogId || !eventName.trim()) return;
    setLoading(true);
    await store.addCompetition({
      sport: 'Agility',
      dog_id: dogId,
      date,
      event_name: eventName.trim(),
      organizer: organizer.trim(),
      discipline,
      size_class: sizeClass,
      competition_level: competitionLevel,
      faults: parseInt(faults) || 0,
      time_sec: parseFloat(timeSec) || 0,
      passed,
      disqualified,
      placement: placement ? parseInt(placement) : null,
      course_length_m: courseLength ? parseFloat(courseLength) : 0,
      notes: notes.trim(),
    });
    setLoading(false);
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-1.5 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Trophy size={16} /> Logga tävling
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Logga tävlingsresultat</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Hund</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
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
              <Label>Disciplin</Label>
              <Select value={discipline} onValueChange={v => setDiscipline(v as Discipline)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agility">Agility</SelectItem>
                  <SelectItem value="Jumping">Hopp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tävlingsnamn *</Label>
            <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="T.ex. SM i Agility" />
          </div>
          <div>
            <Label>Arrangör</Label>
            <Input value={organizer} onChange={e => setOrganizer(e.target.value)} placeholder="T.ex. SKK" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Storleksklass</Label>
              <Select value={sizeClass} onValueChange={v => setSizeClass(v as SizeClass)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tävlingsklass</Label>
              <Select value={competitionLevel} onValueChange={v => setCompetitionLevel(v as CompetitionLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nollklass">Nollklass</SelectItem>
                  <SelectItem value="K1">Klass 1</SelectItem>
                  <SelectItem value="K2">Klass 2</SelectItem>
                  <SelectItem value="K3">Klass 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Fel</Label>
              <Input type="number" value={faults} onChange={e => setFaults(e.target.value)} />
            </div>
            <div>
              <Label>Tid (s)</Label>
              <Input type="number" step="0.01" value={timeSec} onChange={e => setTimeSec(e.target.value)} />
            </div>
            <div>
              <Label>Placering</Label>
              <Input type="number" value={placement} onChange={e => setPlacement(e.target.value)} placeholder="-" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Banlängd (m)</Label>
              <Input type="number" value={courseLength} onChange={e => setCourseLength(e.target.value)} placeholder="T.ex. 165" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={passed} onCheckedChange={(v) => { setPassed(v); if (v) setDisqualified(false); }} />
              <Label>Pinne / Cert</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={disqualified} onCheckedChange={(v) => { setDisqualified(v); if (v) setPassed(false); }} />
              <Label className="text-destructive">Disk</Label>
            </div>
          </div>
          <div>
            <Label>Notering</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-accent text-accent-foreground" disabled={!dogId || !eventName.trim() || loading}>
            {loading ? 'Sparar...' : 'Spara resultat'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}