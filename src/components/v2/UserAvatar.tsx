import { cn } from "@/lib/utils";

interface Props {
  name?: string | null;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-[15px]",
};

/** Fas 6 – Generisk användar-avatar med fallback till initialer. */
export function UserAvatar({ name, url, size = "md", className }: Props) {
  const initials = (name ?? "?").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "Avatar"}
        className={cn(sizes[size], "rounded-full object-cover bg-subtle shrink-0", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        sizes[size],
        "rounded-full bg-brand-100 text-brand-900 font-medium flex items-center justify-center shrink-0",
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
