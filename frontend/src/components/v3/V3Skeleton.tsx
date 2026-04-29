import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** rounded-className för shape, default rounded-v3-lg */
  shape?: string;
}

/**
 * V3 skeleton block – använder `.v3-skeleton`-utility (shimmer + canvas-toner).
 * Föredra denna framför `animate-pulse` i v3-vyer.
 */
export function V3Skeleton({ className, shape = "rounded-v3-lg" }: Props) {
  return <div className={cn("v3-skeleton", shape, className)} />;
}

export function V3StatTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <V3Skeleton key={i} className="h-[92px]" shape="rounded-v3-xl" />
      ))}
    </div>
  );
}

export function V3RowsSkeleton({ count = 4, height = "h-20" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <V3Skeleton key={i} className={height} shape="rounded-v3-lg" />
      ))}
    </div>
  );
}

export function V3HeroSkeleton() {
  return <V3Skeleton className="h-28" shape="rounded-v3-2xl" />;
}
