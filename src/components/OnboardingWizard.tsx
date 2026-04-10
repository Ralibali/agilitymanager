import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Dog, Sparkles, ArrowRight, Check } from 'lucide-react';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

interface Props {
  onComplete: () => void;
}

type Sport = Enums<'sport'>;

const STEPS = ['Välkommen', 'Sport', 'Hund', 'Klar'];

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<Sport>('Agility');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [withersCm, setWithersCm] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedSize = withersCm ? (parseInt(withersCm) < 40 ? 'Small' : 'Large') : null;

  const handleCreateDog = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await store.addDog({
        name: name.trim(),
        breed: breed.trim(),
        gender: 'Hane',
        color: '',
        birthdate: null,
        photo_url: null,
        size_class: 'L',
        competition_level: 'Nollklass',
        jumping_level: 'Nollklass',
        is_active_competition_dog: true,
        notes: '',
        theme_color: 'hsl(221, 79%, 48%)',
        sport,
        hoopers_level: 'Startklass',
        hoopers_size: (suggestedSize as 'Small' | 'Large') || 'Large',
        withers_cm: withersCm ? parseInt(withersCm) : null,
      });
      setStep(3);
    } catch {
      toast.error('Kunde inte skapa hund');
    }
    setLoading(false);
  };

  const handleFinish = async () => {
    // Mark onboarding complete in user metadata
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? 'bg-primary' : i < step ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles size={36} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Välkommen till AgilityManager</h1>
                <p className="text-muted-foreground mt-2">Appen för agility och hoopers. Kom igång på 2 minuter.</p>
              </div>
              <Button onClick={() => setStep(1)} className="w-full h-12 gradient-primary text-primary-foreground gap-2">
                Lägg till din hund <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="sport" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <h2 className="text-xl font-display font-bold text-foreground text-center">Välj sport</h2>
              <div className="space-y-3">
                {[
                  { value: 'Agility' as Sport, emoji: '🐕', title: 'Agility', desc: 'Hoppa, kontakthinder, slalom' },
                  { value: 'Hoopers' as Sport, emoji: '🅞', title: 'Hoopers', desc: 'Bågar, tunnlar, distanshandling – inga hopp' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSport(opt.value); setStep(2); }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                      sport === opt.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{opt.emoji}</span>
                      <div>
                        <div className="font-semibold text-foreground">{opt.title}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(0)} className="text-xs text-muted-foreground mx-auto block mt-2">← Tillbaka</button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="dog" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <h2 className="text-xl font-display font-bold text-foreground text-center">Hundens info</h2>
              <div>
                <Label>Namn *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="T.ex. Bella" autoFocus />
              </div>
              <div>
                <Label>Ras</Label>
                <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="T.ex. Border Collie" />
              </div>
              {(sport === 'Hoopers') && (
                <div>
                  <Label>Mankhöjd (cm)</Label>
                  <Input type="number" value={withersCm} onChange={e => setWithersCm(e.target.value)} placeholder="T.ex. 42" />
                  {suggestedSize && (
                    <p className="text-xs text-primary mt-1">→ Storleksklass: {suggestedSize} (baserat på mankhöjd)</p>
                  )}
                </div>
              )}
              <Button onClick={handleCreateDog} disabled={!name.trim() || loading} className="w-full h-12 gradient-primary text-primary-foreground gap-2">
                {loading ? 'Skapar...' : 'Skapa hund'} <ArrowRight size={18} />
              </Button>
              <button onClick={() => setStep(1)} className="text-xs text-muted-foreground mx-auto block">← Tillbaka</button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check size={36} className="text-success" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Klar!</h2>
                <p className="text-muted-foreground mt-2">
                  <strong>{name}</strong> är tillagd som {sport === 'Hoopers' ? 'hoopers' : 'agility'}hund.
                </p>
                {sport === 'Hoopers' && (
                  <p className="text-xs text-muted-foreground mt-3 bg-secondary/50 rounded-lg p-3">
                    Hoopers är officiell SKK-sport sedan november 2025, organiserat av Svenska Hoopersklubben (SHoK).
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Button onClick={handleFinish} className="w-full h-12 gradient-primary text-primary-foreground">
                  Logga mitt första träningspass
                </Button>
                <Button onClick={handleFinish} variant="ghost" className="w-full">
                  Utforska appen
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip button */}
        {step > 0 && step < 3 && (
          <button onClick={handleFinish} className="text-xs text-muted-foreground mx-auto block mt-6 underline">
            Hoppa över
          </button>
        )}
      </div>
    </div>
  );
}
