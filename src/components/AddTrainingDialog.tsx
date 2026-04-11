import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dumbbell, Star, MapPin } from 'lucide-react';
import type { TrainingType, Dog } from '@/types';
import { store } from '@/lib/store';

const TRAINING_TYPES: TrainingType[] = ['Bana', 'Hinder', 'Kontakt', 'Vändning', 'Distans', 'Kombination', 'Annan', 'Målgång'];
const HOOPERS_TRAINING_TYPES: TrainingType[] = ['Bana', 'Dirigering', 'Hoop', 'Tunnel', 'Tunna', 'Kombination', 'Annan'];

const AGILITY_OBSTACLES = ['Hopp', 'Tunnel', 'A-ram', 'Gångbro', 'Gungbräda', 'Slalom', 'Bordstopp', 'Hoppring', 'Helrunda'];
const HOOPERS_OBSTACLES = ['Hoop (Båge)', 'Tunnel', 'Tunna', 'Staket', 'Helrunda'];
const COMMON_TAGS = ['A-hinder', 'Tunneln', 'Kontaktfält', 'Slalom', 'Svängar', 'Starter', 'Distans', 'Balans', 'Gungan', 'Målgång'];

interface Props {
  onAdded: () => void;
  dogs: Dog[];
  trigger?: React.ReactNode;
  prefillTime?: number;
  prefillFaults?: number;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="flex gap-1 mt-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => onChange(i)}>
            <Star size={20} className={i <= value ? 'fill-accent text-accent' : 'text-muted-foreground'} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ObstacleCheckboxes({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (o: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            selected.includes(o) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function AddTrainingDialog({ onAdded, dogs, trigger, prefillTime, prefillFaults }: Props) {
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
  const [location, setLocation] = useState('');
  const [overallMood, setOverallMood] = useState(3);
  const [obstaclesTrained, setObstaclesTrained] = useState<string[]>([]);
  const [faultCount, setFaultCount] = useState(prefillFaults?.toString() || '0');
  const [bestTimeSec, setBestTimeSec] = useState(prefillTime ? (prefillTime / 1000).toFixed(2) : '');
  const [distanceRating, setDistanceRating] = useState(3);
  const [flowRating, setFlowRating] = useState(3);
  const [handlerZoneKept, setHandlerZoneKept] = useState(false);

  const selectedDog = useMemo(() => dogs.find(d => d.id === dogId), [dogs, dogId]);
  const isBoth = selectedDog?.sport === 'Båda';
  const isHoopers = selectedDog?.sport === 'Hoopers';
  const [sportTab, setSportTab] = useState<'agility' | 'hoopers'>(isHoopers ? 'hoopers' : 'agility');

  // Reset tab when dog changes
  const effectiveSportTab = isBoth ? sportTab : (isHoopers ? 'hoopers' : 'agility');
  const showHoopersFields = effectiveSportTab === 'hoopers';

  const trainingTypes = showHoopersFields ? HOOPERS_TRAINING_TYPES : TRAINING_TYPES;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleObstacle = (o: string) => {
    setObstaclesTrained(prev => prev.includes(o) ? prev.filter(t => t !== o) : [...prev, o]);
  };

  const handleSubmit = async () => {
    if (!dogId) return;
    setLoading(true);
    const saveSport = isBoth ? (effectiveSportTab === 'hoopers' ? 'Hoopers' : 'Agility') : (selectedDog?.sport || 'Agility');
    await store.addTraining({
      sport: saveSport as any,
      dirigering_score: showHoopersFields ? distanceRating : null,
      banflyt_score: showHoopersFields ? flowRating : null,
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
      obstacles_trained: obstaclesTrained,
      fault_count: parseInt(faultCount) || 0,
      best_time_sec: bestTimeSec ? parseFloat(bestTimeSec) : null,
      jump_height_used: !showHoopersFields ? (selectedDog?.size_class || null) : null,
      handler_zone_kept: showHoopersFields ? handlerZoneKept : null,
      overall_mood: overallMood,
      location: location.trim(),
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
          {/* Dog + Date */}
          <div>
            <Label>Hund</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
              <SelectContent>
                {dogs.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} {d.sport === 'Båda' ? '🐕🅞' : d.sport === 'Hoopers' ? '🅞' : '🐕'}
                  </SelectItem>
                ))}
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
                  {trainingTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
              <Label className="flex items-center gap-1"><MapPin size={12} /> Plats</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="T.ex. klubben" />
            </div>
          </div>

          {/* Sport tabs for 'Båda' dogs */}
          {isBoth && (
            <Tabs value={effectiveSportTab} onValueChange={v => setSportTab(v as 'agility' | 'hoopers')} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="agility">🐕 Agility</TabsTrigger>
                <TabsTrigger value="hoopers">🅞 Hoopers</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Sport-specific section */}
          <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {showHoopersFields ? '🅞 Hoopers' : '🐕 Agility'}-specifikt
            </Label>

            <div>
              <Label className="text-xs">Tränade hinder</Label>
              <ObstacleCheckboxes
                options={showHoopersFields ? HOOPERS_OBSTACLES : AGILITY_OBSTACLES}
                selected={obstaclesTrained}
                onToggle={toggleObstacle}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Antal fel</Label>
                <Input type="number" min="0" value={faultCount} onChange={e => setFaultCount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bästa tid (sek)</Label>
                <Input type="number" step="0.01" value={bestTimeSec} onChange={e => setBestTimeSec(e.target.value)} placeholder="T.ex. 32.45" />
              </div>
            </div>

            {showHoopersFields && (
              <>
                <StarRating value={distanceRating} onChange={setDistanceRating} label="Dirigeringskvalitet" />
                <StarRating value={flowRating} onChange={setFlowRating} label="Banflyt" />
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Höll dig i dirigeringsområdet?</Label>
                  <Switch checked={handlerZoneKept} onCheckedChange={setHandlerZoneKept} />
                </div>
              </>
            )}
          </div>

          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Repetitioner</Label>
              <Input type="number" value={reps} onChange={e => setReps(e.target.value)} />
            </div>
            <div>
              <StarRating value={overallMood} onChange={setOverallMood} label="Känsla för passet" />
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
            <StarRating value={dogEnergy} onChange={setDogEnergy} label="Hundens energi" />
            <StarRating value={handlerEnergy} onChange={setHandlerEnergy} label="Din energi" />
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
