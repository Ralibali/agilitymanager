import { DogAvatar } from '@/components/DogAvatar';
import { Dog } from 'lucide-react';
import type { Dog as DogType } from '@/types';

interface DogPickerProps {
  dogs: DogType[];
  selectedDogId: string | null;
  onSelect: (dogId: string | null) => void;
}

export function DogPicker({ dogs, selectedDogId, onSelect }: DogPickerProps) {
  const activeDogs = dogs.filter(d => d.is_active_competition_dog);

  if (activeDogs.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
          selectedDogId === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card border-border text-muted-foreground hover:bg-secondary'
        }`}
      >
        <Dog size={14} />
        Alla
      </button>
      {activeDogs.map(dog => (
        <button
          key={dog.id}
          onClick={() => onSelect(dog.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
            selectedDogId === dog.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          <DogAvatar dog={dog} size="xs" />
          {dog.name}
        </button>
      ))}
    </div>
  );
}
