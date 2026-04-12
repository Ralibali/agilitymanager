import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Check, Camera, Dog, Target } from 'lucide-react';
import { store } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Enums } from '@/integrations/supabase/types';

interface Props {
  onComplete: () => void;
}

type Sport = Enums<'sport'>;
type SizeClass = Enums<'size_class'>;

const STEPS = ['Välkommen', 'Hund', 'Träning', 'Mål', 'Klar'];

const SIZE_OPTIONS: { value: SizeClass; label: string }[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
];

const OBSTACLE_CHIPS = ['Slalom', 'Kontakt', 'Hopp', 'Tunnel', 'Bord'];

const GOAL_OPTIONS = [
  { value: 'compete_k1', label: 'Tävla i Klass 1' },
  { value: 'improve_times', label: 'Förbättra tider' },
  { value: 'train_more', label: 'Träna mer regelbundet' },
  { value: 'track', label: 'Bara ha koll' },
  { value: 'other', label: 'Annat' },
];

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 2 - Dog
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [sizeClass, setSizeClass] = useState<SizeClass>('L');
  const [birthdate, setBirthdate] = useState('');
  const [createdDogId, setCreatedDogId] = useState<string | null>(null);

  // Step 3 - Training
  const [duration, setDuration] = useState('30');
  const [obstacles, setObstacles] = useState<string[]>([]);
  const [trainingNotes, setTrainingNotes] = useState('');

  // Step 4 - Goal
  const [selectedGoal, setSelectedGoal] = useState('');

  const handleCreateDog = async () => {
    if (!dogName.trim()) return;
    setLoading(true);
    try {
      const dog = await store.addDog({
        name: dogName.trim(),
        breed: breed.trim(),
        gender: 'Hane',
        color: '',
        birthdate: birthdate || null,
        photo_url: null,
        size_class: sizeClass,
        competition_level: 'Nollklass',
        jumping_level: 'Nollklass',
        is_active_competition_dog: true,
        notes: '',
        theme_color: 'hsl(221, 79%, 48%)',
        sport: 'Agility',
        hoopers_level: 'Startklass',
        hoopers_size: 'Large',
        withers_cm: null,
      });
      if (dog) setCreatedDogId(dog.id);
      setStep(2);
    } catch {
      toast.error('Kunde inte skapa hund');
    }
    setLoading(false);
  };

  const handleLogTraining = async () => {
    if (!createdDogId) { setStep(3); return; }
    setLoading(true);
    try {
      const notesAll = [
        ...obstacles,
        trainingNotes.trim(),
      ].filter(Boolean).join('. ');

      await store.addTraining({
        dog_id: createdDogId,
        date: new Date().toISOString().split('T')[0],
        duration_min: parseInt(duration) || 30,
        type: 'Bana',
        sport: 'Agility',
        reps: 0,
        dog_energy: 3,
        handler_energy: 3,
        notes_good: notesAll,
        notes_improve: '',
        tags: obstacles,
        obstacles_trained: obstacles,
        overall_mood: null,
        fault_count: null,
        best_time_sec: null,
        location: null,
        jump_height_used: null,
        dirigering_score: null,
        banflyt_score: null,
        handler_zone_kept: null,
      });
      toast.success('Träningspass loggat!');
    } catch {
      toast.error('Kunde inte logga pass');
    }
    setLoading(false);
    setStep(3);
  };

  const handleSetGoal = async () => {
    if (selectedGoal && createdDogId) {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await supabase.from('training_goals').insert({
            user_id: userId,
            dog_id: createdDogId,
            title: GOAL_OPTIONS.find(g => g.value === selectedGoal)?.label || selectedGoal,
            goal_type: selectedGoal,
            category: 'onboarding',
            status: 'active',
          });
        }
      } catch { /* ignore */ }
    }
    setStep(4);
  };

  const handleFinish = async (skipped = false) => {
    await supabase.auth.updateUser({
      data: {
        onboarding_complete: true,
        onboarding_skipped: skipped,
      },
    });
    onComplete();
  };

  const handleSkip = () => handleFinish(true);

  // Confetti on step 4
  useEffect(() => {
    if (step === 4) {
      import('canvas-confetti').then(mod => {
        const fire = mod.default;
        fire({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      });
    }
  }, [step]);

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
          {/* Step 0 - Welcome */}
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles size={36} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Välkommen till AgilityManager!</h1>
                <p className="text-muted-foreground mt-2">Låt oss komma igång.</p>
              </div>
              <Button onClick={() => setStep(1)} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2 text-base font-semibold">
                Lägg till din första hund <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}

          {/* Step 1 - Add dog */}
          {step === 1 && (
            <motion.div key="dog" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Dog size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">Lägg till din hund</h2>
              </div>
              <div>
                <Label>Namn *</Label>
                <Input value={dogName} onChange={e => setDogName(e.target.value)} placeholder="T.ex. Bella" autoFocus />
              </div>
              <div>
                <Label>Ras <span className="text-muted-foreground text-xs">(valfritt)</span></Label>
                <Input value={breed} onChange={e => setBreed(e.target.value)} placeholder="T.ex. Border Collie" />
              </div>
              <div>
                <Label>Storleksklass</Label>
                <div className="flex gap-2 mt-1">
                  {SIZE_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setSizeClass(s.value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        sizeClass === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Födelsedatum <span className="text-muted-foreground text-xs">(valfritt)</span></Label>
                <Input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
              </div>
              <Button onClick={handleCreateDog} disabled={!dogName.trim() || loading} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2">
                {loading ? 'Skapar...' : 'Spara och fortsätt'} <ArrowRight size={18} />
              </Button>
              <button onClick={() => setStep(0)} className="text-xs text-muted-foreground mx-auto block">← Tillbaka</button>
            </motion.div>
          )}

          {/* Step 2 - First training log */}
          {step === 2 && (
            <motion.div key="training" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-display font-bold text-foreground">Logga ditt första träningspass!</h2>
                <p className="text-sm text-muted-foreground mt-1">Snabbt och enkelt – tar 30 sekunder.</p>
              </div>
              <div>
                <Label>Längd (minuter)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} max={300} />
              </div>
              <div>
                <Label>Vad tränade ni?</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {OBSTACLE_CHIPS.map(o => (
                    <button
                      key={o}
                      onClick={() => setObstacles(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        obstacles.includes(o)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Anteckningar <span className="text-muted-foreground text-xs">(valfritt)</span></Label>
                <Textarea value={trainingNotes} onChange={e => setTrainingNotes(e.target.value)} rows={2} placeholder="T.ex. Bra fokus idag!" />
              </div>
              <Button onClick={handleLogTraining} disabled={loading} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2">
                {loading ? 'Sparar...' : 'Logga pass'} <ArrowRight size={18} />
              </Button>
              <button onClick={() => setStep(3)} className="text-xs text-muted-foreground mx-auto block mt-1 underline">
                Hoppa över, jag loggar senare
              </button>
            </motion.div>
          )}

          {/* Step 3 - Goal */}
          {step === 3 && (
            <motion.div key="goal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Target size={28} className="text-primary" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">Vad är ditt mål?</h2>
                <p className="text-sm text-muted-foreground mt-1">Välj det som passar bäst.</p>
              </div>
              <div className="space-y-2">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setSelectedGoal(g.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all text-sm font-medium ${
                      selectedGoal === g.value
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/50'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <Button onClick={handleSetGoal} disabled={!selectedGoal} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2">
                Fortsätt <ArrowRight size={18} />
              </Button>
              <button onClick={() => setStep(4)} className="text-xs text-muted-foreground mx-auto block mt-1 underline">
                Hoppa över
              </button>
            </motion.div>
          )}

          {/* Step 4 - Done */}
          {step === 4 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
              <div className="text-5xl">🐾</div>
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Du är redo!</h2>
                <p className="text-muted-foreground mt-2">
                  <strong>{dogName}</strong> är tillagd. Här är vad du kan göra nu:
                </p>
              </div>
              <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex items-center gap-2"><span>📊</span> Följ träningsstatistik</div>
                <div className="flex items-center gap-2"><span>🏆</span> Registrera tävlingsresultat</div>
                <div className="flex items-center gap-2"><span>🎯</span> Sätt och uppnå mål</div>
                <div className="flex items-center gap-2"><span>👥</span> Gå med i en klubb</div>
              </div>
              <Button onClick={() => handleFinish(false)} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white gap-2 text-base font-semibold">
                Gå till din dashboard <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global skip */}
        {step > 0 && step < 4 && (
          <button onClick={handleSkip} className="text-xs text-muted-foreground mx-auto block mt-6 underline">
            Hoppa över hela guiden
          </button>
        )}
      </div>
    </div>
  );
}
