import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Dog, SizeClass, CompetitionLevel, Gender } from '@/types';
import { store, generateId, getNextDogColor } from '@/lib/store';

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
  const [sizeClass, setSizeClass] = useState<SizeClass>('Medium');
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel>('Öppen');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    const dog: Dog = {
      id: generateId(),
      name: name.trim(),
      breed: breed.trim(),
      gender,
      color: color.trim(),
      birthdate,
      sizeClass,
      competitionLevel,
      notes: notes.trim(),
      themeColor: getNextDogColor(),
      createdAt: new Date().toISOString(),
    };
    store.addDog(dog);
    setOpen(false);
    resetForm();
    onAdded();
  };

  const resetForm = () => {
    setName(''); setBreed(''); setColor(''); setBirthdate(''); setNotes('');
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Storleksklass</Label>
              <Select value={sizeClass} onValueChange={v => setSizeClass(v as SizeClass)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XSmall">XSmall</SelectItem>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tävlingsnivå</Label>
              <Select value={competitionLevel} onValueChange={v => setCompetitionLevel(v as CompetitionLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Öppen">Öppen</SelectItem>
                  <SelectItem value="Mellan">Mellan</SelectItem>
                  <SelectItem value="Elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Anteckningar</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fritext om hunden..." rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground" disabled={!name.trim()}>
            Spara hund
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
