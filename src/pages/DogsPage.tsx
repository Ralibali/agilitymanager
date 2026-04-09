import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { AddDogDialog } from '@/components/AddDogDialog';
import { DogAvatar } from '@/components/DogAvatar';
import { DogPhotoUpload } from '@/components/DogPhotoUpload';
import { store } from '@/lib/store';
import type { Dog } from '@/types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function DogsPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    setDogs(await store.getDogs());
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
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {dog.size_class}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      AG {dog.competition_level}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      Hopp {(dog as any).jumping_level ?? dog.competition_level}
                    </span>
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
            </motion.div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
