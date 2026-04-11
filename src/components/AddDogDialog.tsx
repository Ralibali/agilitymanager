import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import type { SizeClass, CompetitionLevel, Gender } from '@/types';
import type { Enums } from '@/integrations/supabase/types';
import { store, getNextDogColor } from '@/lib/store';

type Sport = Enums<'sport'>;
type HoopersLevel = Enums<'hoopers_level'>;
type HoopersSize = Enums<'hoopers_size'>;

interface Props {
  onAdded: () => void;
  trigger?: React.ReactNode;
}

export function AddDogDialog({ onAdded, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState<Gender>('Tik');
  const [color, setColor] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sport, setSport] = useState<Sport>('Agility');
  const [sizeClass, setSizeClass] = useState<SizeClass>('L');
  const [agilityLevel, setAgilityLevel] = useState<CompetitionLevel>('Nollklass');
  const [jumpingLevel, setJumpingLevel] = useState<CompetitionLevel>('Nollklass');
  const [hoopersLevel, setHoopersLevel] = useState<HoopersLevel>('Startklass');
  const [hoopersSize, setHoopersSize] = useState<HoopersSize>('Large');
  const [withersCm, setWithersCm] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const isHoopers = sport === 'Hoopers' || sport === 'Båda';
  const isAgility = sport === 'Agility' || sport === 'Båda';

  // Auto-suggest hoopers size from withers
  const suggestedSize: HoopersSize | null = withersCm
    ? parseInt(withersCm) < 40 ? 'Small' : 'Large'
    : null;

  const handleWithersChange = (val: string) => {
    setWithersCm(val);
    if (val && parseInt(val) > 0) {
      setHoopersSize(parseInt(val) < 40 ? 'Small' : 'Large');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const themeColor = await getNextDogColor();
    await store.addDog({
      name: name.trim(),
      breed: breed.trim(),
      gender,
      color: color.trim(),
      birthdate: birthdate || null,
      photo_url: null,
      size_class: sizeClass,
      competition_level: agilityLevel,
      jumping_level: jumpingLevel,
      is_active_competition_dog: true,
      notes: notes.trim(),
      theme_color: themeColor,
      sport,
      hoopers_level: hoopersLevel,
      hoopers_size: hoopersSize,
      withers_cm: withersCm ? parseInt(withersCm) : null,
    });
    setLoading(false);
    setOpen(false);
    resetForm();
    onAdded();
  };

  const resetForm = () => {
    setName(''); setBreed(''); setColor(''); setBirthdate(''); setNotes('');
    setSport('Agility'); setWithersCm('');
    setAgilityLevel('Nollklass'); setJumpingLevel('Nollklass');
    setHoopersLevel('Startklass'); setHoopersSize('Large');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5">
            <Plus size={16} /> Lägg till
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Lägg till hund</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Namn *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Hundens namn" />
          </div>

          {/* Sport selector */}
          <div>
            <Label>Sport</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['Agility', 'Hoopers', 'Båda'] as Sport[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSport(s)}
                  className={`p-3 rounded-xl border-2 text-center transition-all active:scale-[0.98] ${
                    sport === s
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <span className="text-xl block">{s === 'Agility' ? '🐕' : s === 'Hoopers' ? '🅞' : '🐕🅞'}</span>
                  <span className="text-xs font-semibold text-foreground">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ras</Label>
              <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="T.ex. Border Collie" />
            </div>
            <div>
              <Label>Färg</Label>
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="T.ex. Svart/vit" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kön</Label>
              <Select value={gender} onValueChange={v => setGender(v as Gender)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tik">Tik</SelectItem>
                  <SelectItem value="Hane">Hane</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Födelsedatum</Label>
              <Input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
            </div>
          </div>

          {/* Mankhöjd */}
          <div>
            <Label>Mankhöjd (cm)</Label>
            <Input type="number" value={withersCm} onChange={e => handleWithersChange(e.target.value)} placeholder="T.ex. 42" />
            {isHoopers && suggestedSize && (
              <p className="text-xs text-primary mt-1">→ Storleksklass: {suggestedSize} (baserat på mankhöjd)</p>
            )}
          </div>

          {/* Agility fields */}
          {isAgility && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Storleksklass</Label>
                  <Select value={sizeClass} onValueChange={v => setSizeClass(v as SizeClass)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XS">XS (≤28 cm)</SelectItem>
                      <SelectItem value="S">S (≤35 cm)</SelectItem>
                      <SelectItem value="M">M (≤43 cm)</SelectItem>
                      <SelectItem value="L">L (&gt;43 cm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agilityklass</Label>
                  <Select value={agilityLevel} onValueChange={v => setAgilityLevel(v as CompetitionLevel)}>
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
              <div>
                <Label>Hoppklass</Label>
                <Select value={jumpingLevel} onValueChange={v => setJumpingLevel(v as CompetitionLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nollklass">Nollklass</SelectItem>
                    <SelectItem value="K1">Klass 1</SelectItem>
                    <SelectItem value="K2">Klass 2</SelectItem>
                    <SelectItem value="K3">Klass 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Hoopers fields */}
          {isHoopers && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hoopers-storlek</Label>
                <Select value={hoopersSize} onValueChange={v => setHoopersSize(v as HoopersSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Small">Small (&lt;40 cm)</SelectItem>
                    <SelectItem value="Large">Large (≥40 cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hoopers-klass</Label>
                <Select value={hoopersLevel} onValueChange={v => setHoopersLevel(v as HoopersLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Startklass">Startklass</SelectItem>
                    <SelectItem value="Klass 1">Klass 1</SelectItem>
                    <SelectItem value="Klass 2">Klass 2</SelectItem>
                    <SelectItem value="Klass 3">Klass 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )

          <div>
            <Label>Anteckningar</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fritext om hunden..." rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground" disabled={!name.trim() || loading}>
            {loading ? 'Sparar...' : 'Spara hund'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
