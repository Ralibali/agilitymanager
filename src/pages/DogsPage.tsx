import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddDogDialog } from '@/components/AddDogDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { DogPhotoUpload } from '@/components/DogPhotoUpload';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { store } from '@/lib/store';
import type { Dog, SizeClass, CompetitionLevel, CompetitionResult } from '@/types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { calculatePromotionProgress } from '@/components/competitions/ClassPromotionTracker';

export default function DogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    const [d, r] = await Promise.all([store.getDogs(), store.getCompetitions()]);
    setDogs(d);
    setResults(r);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  if (loading) return <PageContainer title="Mina hundar"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  return (
    <PageContainer
      title="Mina hundar"
      subtitle={`${dogs.length} registrerad${dogs.length !== 1 ? 'e' : ''}`}
      action={<AddDogDialog onAdded={refresh} />}
    >
      {dogs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">Inga hundar tillagda ännu.</p>
          <AddDogDialog onAdded={refresh} />
        </div>
      ) : (
        <div className="space-y-3">
          {dogs.map((dog, i) => (
            <motion.div
              key={dog.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <DogPhotoUpload
                    dogId={dog.id}
                    currentUrl={dog.photo_url}
                    onUploaded={(url) => {
                      setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, photo_url: url } : d));
                    }}
                    size="lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground text-lg">{dog.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    {dog.breed} · {dog.gender} · {dog.color}
                  </div>
                  <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                    <Select
                      value={dog.size_class}
                      onValueChange={async (v) => {
                        const val = v as SizeClass;
                        setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, size_class: val } : d));
                        await store.updateDog(dog.id, { size_class: val });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] px-2 w-auto min-w-0 bg-primary/10 text-primary border-none font-medium rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XS">XS</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={dog.competition_level}
                      onValueChange={async (v) => {
                        const val = v as CompetitionLevel;
                        setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, competition_level: val } : d));
                        await store.updateDog(dog.id, { competition_level: val });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] px-2 w-auto min-w-0 bg-accent/10 text-accent border-none font-medium rounded-full">
                        <span className="mr-0.5">AG</span> <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nollklass">Nollklass</SelectItem>
                        <SelectItem value="K1">Klass 1</SelectItem>
                        <SelectItem value="K2">Klass 2</SelectItem>
                        <SelectItem value="K3">Klass 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={dog.jumping_level}
                      onValueChange={async (v) => {
                        const val = v as CompetitionLevel;
                        setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, jumping_level: val } : d));
                        await store.updateDog(dog.id, { jumping_level: val });
                      }}
                    >
                      <SelectTrigger className="h-6 text-[10px] px-2 w-auto min-w-0 bg-accent/10 text-accent border-none font-medium rounded-full">
                        <span className="mr-0.5">Hopp</span> <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nollklass">Nollklass</SelectItem>
                        <SelectItem value="K1">Klass 1</SelectItem>
                        <SelectItem value="K2">Klass 2</SelectItem>
                        <SelectItem value="K3">Klass 3</SelectItem>
                      </SelectContent>
                    </Select>
                    {dog.birthdate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        Född {format(new Date(dog.birthdate), 'd MMM yyyy', { locale: sv })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {dog.notes && (
                <p className="mt-2 text-sm text-muted-foreground border-t border-border pt-2">{dog.notes}</p>
              )}
              <div className="flex items-center justify-between mt-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">Aktiv tävlingshund</span>
                <Switch
                  checked={dog.is_active_competition_dog}
                  onCheckedChange={async (checked) => {
                    setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, is_active_competition_dog: checked } : d));
                    await store.updateDog(dog.id, { is_active_competition_dog: checked });
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
