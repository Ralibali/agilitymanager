import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Antal innehållskort att rendera (default 3) */
  cards?: number;
  className?: string;
}

/**
 * Skelett som matchar PageHeader + content-rytm.
 * Subtil pulse-animation, inga shimmer-gradients.
 */
export function PageSkeleton({ cards = 3, className }: PageSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="h-6 w-48 rounded-ds-sm bg-subtle" />
        <div className="h-4 w-72 rounded-ds-sm bg-subtle" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-ds-md bg-subtle" />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="h-24 rounded-ds-lg bg-subtle" />
        ))}
      </div>
    </div>
  );
}
