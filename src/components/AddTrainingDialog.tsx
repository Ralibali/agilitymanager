import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dumbbell, Star } from 'lucide-react';
import type { TrainingType, Dog } from '@/types';
import { store } from '@/lib/store';
import { Constants } from '@/integrations/supabase/types';

const TRAINING_TYPES = Constants.public.Enums.training_type;
const COMMON_TAGS = ['A-hinder', 'Tunneln', 'Kontaktfält', 'Slalom', 'Svängar', 'Starter', 'Distans', 'Balans', 'Gungan', 'Målgång'];

interface Props {
  onAdded: () => void;
  dogs: Dog[];
  trigger?: React.ReactNode;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)}>
          <Star size={20} className={i <= value ? 'fill-accent text-accent' : 'text-muted-foreground'} />
        </button>
      ))}
    </div>
  );
}

export function AddTrainingDialog({ onAdded, dogs, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [dogId, setDogId] = useState(dogs[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('30');
  const [type, setType] = useState<TrainingType>('Bana');
  const [reps, setReps] = useState('5');
  const [notesGood, setNotesGood] = useState('');
  const [notesImprove, setNotesImprove] = useState('');
  const [dogEnergy, setDogEnergy] = useState(3);
  const [handlerEnergy, setHandlerEnergy] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!dogId) return;
    setLoading(true);
    await store.addTraining({
      dog_id: dogId,
      date,
      duration_min: parseInt(duration) || 0,
      type,
      reps: parseInt(reps) || 0,
      notes_good: notesGood.trim(),
      notes_improve: notesImprove.trim(),
      dog_energy: dogEnergy,
      handler_energy: handlerEnergy,
      tags: selectedTags,
    });
    setLoading(false);
    setOpen(false);
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gradient-primary text-primary-foreground gap-1.5">
            <Dumbbell size={16} /> Logga träning
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Logga träningspass</DialogTitle>
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
              <Label>Typ</Label>
              <Select value={type} onValueChange={v => setType(v as TrainingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAINING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Varaktighet (min)</Label>
              <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
            <div>
              <Label>Repetitioner</Label>
              <Input type="number" value={reps} onChange={e => setReps(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Vad funkade bra?</Label>
            <Textarea value={notesGood} onChange={e => setNotesGood(e.target.value)} rows={2} placeholder="T.ex. Snabb slalom, bra kontaktzoner" />
          </div>
          <div>
            <Label>Vad behöver jobbas mer på?</Label>
            <Textarea value={notesImprove} onChange={e => setNotesImprove(e.target.value)} rows={2} placeholder="T.ex. Vägran vid tunneln" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hundens energi</Label>
              <StarRating value={dogEnergy} onChange={setDogEnergy} />
            </div>
            <div>
              <Label>Din energi</Label>
              <StarRating value={handlerEnergy} onChange={setHandlerEnergy} />
            </div>
          </div>
          <div>
            <Label>Taggar</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground" disabled={!dogId || loading}>
            {loading ? 'Sparar...' : 'Spara träning'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
