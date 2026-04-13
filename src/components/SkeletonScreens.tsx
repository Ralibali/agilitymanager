import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Animated shimmer skeleton placeholder.
 * Matches the warm sand palette: #f0ede9 → #e8e4df
 */
export function SkeletonShimmer({ className, style, ...props }: SkeletonShimmerProps) {
  return (
    <div
      className={cn('rounded-lg animate-shimmer', className)}
      style={{
        background: 'linear-gradient(90deg, #f0ede9 25%, #e8e4df 50%, #f0ede9 75%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
      {...props}
    />
  );
}

/** Home screen skeleton layout */
export function HomeSkeleton() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <SkeletonShimmer className="h-7 w-48 mb-2" />
          <SkeletonShimmer className="h-4 w-32" />
        </div>
        <SkeletonShimmer className="h-10 w-10 rounded-full" />
      </div>

      {/* Dog chips */}
      <div className="flex gap-2 mb-5">
        <SkeletonShimmer className="h-9 w-24 rounded-full" />
        <SkeletonShimmer className="h-9 w-20 rounded-full" />
        <SkeletonShimmer className="h-9 w-20 rounded-full" />
      </div>

      {/* CTA buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SkeletonShimmer className="h-24" style={{ borderRadius: 16 }} />
        <SkeletonShimmer className="h-24" style={{ borderRadius: 16 }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <SkeletonShimmer key={i} className="h-20" style={{ borderRadius: 10 }} />
        ))}
      </div>

      {/* Kennel cards */}
      <SkeletonShimmer className="h-5 w-32 mb-3" />
      {[...Array(2)].map((_, i) => (
        <SkeletonShimmer key={i} className="h-20 mb-2" style={{ borderRadius: 16 }} />
      ))}
    </div>
  );
}

/** Competition page skeleton layout */
export function CompetitionSkeleton() {
  return (
    <div className="min-h-screen pb-24 px-4 pt-6 max-w-lg mx-auto">
      <SkeletonShimmer className="h-7 w-56 mb-2" />
      <SkeletonShimmer className="h-4 w-40 mb-4" />
      <div className="flex gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonShimmer key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex border-b mb-4" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        {[...Array(4)].map((_, i) => (
          <SkeletonShimmer key={i} className="flex-1 h-8 mx-1 mb-2" />
        ))}
      </div>
      <SkeletonShimmer className="h-20 mb-3" style={{ borderRadius: 16 }} />
      {[...Array(3)].map((_, i) => (
        <SkeletonShimmer key={i} className="h-32 mb-3" style={{ borderRadius: 16 }} />
      ))}
    </div>
  );
}

/** Generic list skeleton */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <SkeletonShimmer key={i} className="h-20" style={{ borderRadius: 16 }} />
      ))}
    </div>
  );
}
