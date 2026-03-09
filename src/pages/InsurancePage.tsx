import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Star, Shield, RotateCcw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

type Priority = 'price' | 'coverage' | 'balance';

interface DogProfile {
  breed: string;
  age: string;
  weight: string;
  isCompetition: string;
}

interface InsuranceProvider {
  name: string;
  rating: number;
  ratingLabel: string;
  description: string;
  maxCoverage: string;
  deductiblePeriod?: string;
  priceFrom: string;
  ageRequirement: string;
  unique: string;
  badge: string;
  affiliateLink: string;
}

const providers: InsuranceProvider[] = [
  {
    name: 'Lassie',
    rating: 5,
    ratingLabel: '5/5 – Bäst enligt Konsumenternas 2025',
    description: 'Prisvärd och flexibel försäkring utan rasbegränsningar. Nöjdast kunder i hela försäkringsbranschen enligt SKI 2025.',
    maxCoverage: 'Upp till 160 000 kr/år',
    deductiblePeriod: '365 dagar',
    priceFrom: '~138 kr/mån',
    ageRequirement: 'Inget ålderstak',
    unique: 'App med hälsokurser ger upp till 500 kr rabatt/år. 50% valprabatt första 6 månaderna.',
    badge: 'Bäst pris & villkor',
    affiliateLink: '#AFFILIATELÄNK_LASSIE',
  },
  {
    name: 'Hedvig',
    rating: 4.8,
    ratingLabel: '4.8/5',
    description: 'Ingen bindningstid och enkel att byta. Marknadens högsta ersättning och möjlighet till 0 kr fast självrisk.',
    maxCoverage: 'Upp till 160 000 kr/år',
    deductiblePeriod: '365 dagar',
    priceFrom: '~119 kr/mån',
    ageRequirement: 'Upp till 20 år',
    unique: 'Enda försäkringen med möjlighet till 0 kr fast självrisk. Ingen bindningstid.',
    badge: 'Mest flexibel',
    affiliateLink: '#AFFILIATELÄNK_HEDVIG',
  },
  {
    name: 'Petson',
    rating: 4.7,
    ratingLabel: '4.7/5',
    description: 'Marknadens högsta maxersättning. Täcker avancerad diagnostik, rehabilitering och vård utomlands.',
    maxCoverage: 'Upp till 175 000 kr/år',
    deductiblePeriod: 'Upp till 4 månader',
    priceFrom: '~259 kr/mån',
    ageRequirement: 'Upp till 10 år',
    unique: 'Täcker kejsarsnitt, dolda fel och vård utomlands. 30% valprabatt under 18 månader.',
    badge: 'Högst ersättning',
    affiliateLink: '#AFFILIATELÄNK_PETSON',
  },
  {
    name: 'Svedea',
    rating: 4.5,
    ratingLabel: '4.5/5',
    description: 'Personlig service och god kundnöjdhet. Samma skyddsnivå oavsett vilken ersättningsnivå du väljer.',
    maxCoverage: 'Valbar nivå',
    deductiblePeriod: undefined,
    priceFrom: 'Varierande',
    ageRequirement: 'Inget ålderskrav',
    unique: 'Inget ålderskrav vid teckning – bra för äldre hundar. Uppskattad kundservice.',
    badge: 'Bra för äldre hundar',
    affiliateLink: '#AFFILIATELÄNK_SVEDEA',
  },
  {
    name: 'Sveland',
    rating: 4.0,
    ratingLabel: '4.0/5 (Trustpilot) – 76.2/100 SKI',
    description: 'Specialiserat djurförsäkringsbolag sedan 1911. Kundägt bolag med fokus på djur – inte vinst.',
    maxCoverage: 'Upp till 120 000 kr/år',
    deductiblePeriod: '180 dagar',
    priceFrom: '~229 kr/mån',
    ageRequirement: 'Upp till 7 år vid teckning',
    unique: '10% mängdrabatt vid 6+ hundar. Bonussystem: upp till 20% rabatt efter 4 skadefria år.',
    badge: 'Bäst för flera hundar',
    affiliateLink: '#AFFILIATELÄNK_SVELAND',
  },
];

function rankProviders(profile: DogProfile, priority: Priority): InsuranceProvider[] {
  const scores = new Map<string, number>();
  providers.forEach(p => scores.set(p.name, 0));

  // Competition dog boost
  if (profile.isCompetition === 'yes') {
    scores.set('Petson', (scores.get('Petson') || 0) + 3);
    scores.set('Sveland', (scores.get('Sveland') || 0) + 2);
  }

  // Priority
  if (priority === 'price') {
    scores.set('Lassie', (scores.get('Lassie') || 0) + 3);
    scores.set('Hedvig', (scores.get('Hedvig') || 0) + 3);
  } else if (priority === 'coverage') {
    scores.set('Petson', (scores.get('Petson') || 0) + 3);
    scores.set('Hedvig', (scores.get('Hedvig') || 0) + 2);
  } else {
    scores.set('Lassie', (scores.get('Lassie') || 0) + 3);
    scores.set('Svedea', (scores.get('Svedea') || 0) + 3);
  }

  // Older dog
  if (profile.age === 'senior') {
    scores.set('Hedvig', (scores.get('Hedvig') || 0) + 2);
    scores.set('Svedea', (scores.get('Svedea') || 0) + 2);
    scores.set('Lassie', (scores.get('Lassie') || 0) + 1);
    scores.set('Sveland', (scores.get('Sveland') || 0) - 2); // age limit
  }

  // Puppy boost
  if (profile.age === 'puppy') {
    scores.set('Lassie', (scores.get('Lassie') || 0) + 1);
    scores.set('Petson', (scores.get('Petson') || 0) + 1);
  }

  return [...providers].sort((a, b) => (scores.get(b.name) || 0) - (scores.get(a.name) || 0));
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          className={i <= Math.floor(rating) ? 'text-accent fill-accent' : i - 0.5 <= rating ? 'text-accent fill-accent/50' : 'text-muted-foreground/30'}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating}</span>
    </div>
  );
}

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

export default function InsurancePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<DogProfile>({ breed: '', age: '', weight: '', isCompetition: '' });
  const [priority, setPriority] = useState<Priority | ''>('');

  const canProceedStep1 = profile.breed.trim() && profile.age && profile.weight && profile.isCompetition;
  const canProceedStep2 = !!priority;

  const results = priority ? rankProviders(profile, priority).slice(0, 3) : [];

  const reset = () => {
    setStep(1);
    setProfile({ breed: '', age: '', weight: '', isCompetition: '' });
    setPriority('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Tillbaka
          </button>
          <h1 className="font-display font-bold text-foreground text-base">Hundförsäkring</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Step indicator */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 justify-center mb-1">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 rounded-full transition-colors ${s < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Steg {step} av 3 – {step === 1 ? 'Hundens profil' : step === 2 ? 'Din prioritet' : 'Resultat'}
        </p>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={20} className="text-primary" />
                    <h2 className="font-display font-bold text-foreground text-lg">Berätta om din hund</h2>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="breed">Ras</Label>
                    <Input id="breed" placeholder="T.ex. Border Collie" value={profile.breed} onChange={e => setProfile(p => ({ ...p, breed: e.target.value }))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Ålder</Label>
                    <Select value={profile.age} onValueChange={v => setProfile(p => ({ ...p, age: v }))}>
                      <SelectTrigger><SelectValue placeholder="Välj ålder" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="puppy">Valp under 1 år</SelectItem>
                        <SelectItem value="adult">1–7 år</SelectItem>
                        <SelectItem value="senior">Över 7 år</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vikt</Label>
                    <Select value={profile.weight} onValueChange={v => setProfile(p => ({ ...p, weight: v }))}>
                      <SelectTrigger><SelectValue placeholder="Välj viktklass" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Under 10 kg</SelectItem>
                        <SelectItem value="medium">10–25 kg</SelectItem>
                        <SelectItem value="large">Över 25 kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Är hunden tävlingshund inom agility?</Label>
                    <Select value={profile.isCompetition} onValueChange={v => setProfile(p => ({ ...p, isCompetition: v }))}>
                      <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Ja</SelectItem>
                        <SelectItem value="no">Nej</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full gradient-primary text-primary-foreground gap-2" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                    Nästa steg <ArrowRight size={16} />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={20} className="text-primary" />
                    <h2 className="font-display font-bold text-foreground text-lg">Vad prioriterar du?</h2>
                  </div>

                  {([
                    { value: 'price' as Priority, label: 'Lägsta pris', desc: 'Billigast möjligt med bra grundskydd' },
                    { value: 'coverage' as Priority, label: 'Bästa skydd', desc: 'Högsta ersättning och mest omfattande villkor' },
                    { value: 'balance' as Priority, label: 'Bra balans', desc: 'Prisvärt med solid täckning' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        priority === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <p className="font-semibold text-foreground text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </button>
                  ))}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                      <ArrowLeft size={16} /> Tillbaka
                    </Button>
                    <Button className="flex-1 gradient-primary text-primary-foreground gap-2" disabled={!canProceedStep2} onClick={() => setStep(3)}>
                      Visa resultat <ArrowRight size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
              <div className="space-y-4">
                <h2 className="font-display font-bold text-foreground text-lg text-center">
                  Topp 3 försäkringar för din hund
                </h2>
                <p className="text-center text-xs text-muted-foreground">
                  Baserat på {profile.breed}, {profile.age === 'puppy' ? 'valp' : profile.age === 'adult' ? '1–7 år' : 'äldre hund'}, {profile.isCompetition === 'yes' ? 'tävlingshund' : 'ej tävlingshund'}
                </p>

                {results.map((provider, i) => (
                  <motion.div
                    key={provider.name}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">
                                {i + 1}
                              </span>
                              <h3 className="font-display font-bold text-foreground text-base">{provider.name}</h3>
                            </div>
                            <Stars rating={provider.rating} />
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                            {provider.badge}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">{provider.description}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-secondary rounded-lg p-2.5">
                            <p className="text-muted-foreground">Max ersättning</p>
                            <p className="font-semibold text-foreground">{provider.maxCoverage}</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-2.5">
                            <p className="text-muted-foreground">Pris från</p>
                            <p className="font-semibold text-foreground">{provider.priceFrom}</p>
                          </div>
                          {provider.deductiblePeriod && (
                            <div className="bg-secondary rounded-lg p-2.5">
                              <p className="text-muted-foreground">Karenstid</p>
                              <p className="font-semibold text-foreground">{provider.deductiblePeriod}</p>
                            </div>
                          )}
                          <div className="bg-secondary rounded-lg p-2.5">
                            <p className="text-muted-foreground">Ålderskrav</p>
                            <p className="font-semibold text-foreground">{provider.ageRequirement}</p>
                          </div>
                        </div>

                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                          <p className="text-xs text-foreground leading-relaxed">💡 {provider.unique}</p>
                        </div>

                        <Button asChild className="w-full gradient-primary text-primary-foreground gap-2">
                          <a href={provider.affiliateLink} target="_blank" rel="noopener noreferrer">
                            Läs mer & ansök <ExternalLink size={14} />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setStep(2)}>
                    <ArrowLeft size={16} /> Ändra prioritet
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={reset}>
                    <RotateCcw size={16} /> Börja om
                  </Button>
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed pt-4 pb-8">
                  Vi kan få ersättning om du tecknar försäkring via våra länkar. Det påverkar inte vår bedömning. 
                  Priser är ungefärliga och individuella – besök respektive bolag för exakt pris.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
