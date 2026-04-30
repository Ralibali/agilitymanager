import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // I light: animate-pulse + bg-muted (oförändrat).
  // I dark: .skeleton-klassen ger slate→slate shimmer (definierad i index.css).
  return <div className={cn("animate-pulse rounded-md bg-muted dark:animate-none dark:bg-transparent skeleton", className)} {...props} />;
}

export { Skeleton };
