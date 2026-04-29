import React from 'react';
import { Dog as DogIcon } from 'lucide-react';
import type { Dog } from '@/types';

export const DogAvatar = React.memo(React.forwardRef<HTMLDivElement, { dog: Dog; size?: 'xs' | 'sm' | 'md' | 'lg' }>(
  function DogAvatar({ dog, size = 'md' }, ref) {
    const sizeMap = { xs: 'w-5 h-5', sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };
    const iconSize = { xs: 12, sm: 16, md: 24, lg: 32 };

    return (
      <div
        ref={ref}
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
));
