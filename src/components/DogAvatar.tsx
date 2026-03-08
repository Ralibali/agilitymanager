import { Dog as DogIcon } from 'lucide-react';
import type { Dog } from '@/types';

export function DogAvatar({ dog, size = 'md' }: { dog: Dog; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };
  const iconSize = { sm: 16, md: 24, lg: 32 };

  return (
    <div
      className={`${sizeMap[size]} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: dog.theme_color + '22', color: dog.theme_color }}
    >
      {dog.photo_url ? (
        <img src={dog.photo_url} alt={dog.name} className={`${sizeMap[size]} rounded-full object-cover`} />
      ) : (
        <DogIcon size={iconSize[size]} />
      )}
    </div>
  );
}
