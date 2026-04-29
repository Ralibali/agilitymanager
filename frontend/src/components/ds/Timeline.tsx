import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface TimelineEvent {
  id: string;
  icon?: LucideIcon;
  iconColor?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  timestamp: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

/**
 * Vertikal timeline för aktivitetshändelser. Tunn linje vänster, ikon på linjen.
 */
export function Timeline({ events, className }: TimelineProps) {
  if (events.length === 0) return null;

  return (
    <ol className={cn("relative", className)}>
      <span
        aria-hidden
        className="absolute left-[11px] top-2 bottom-2 w-px bg-border-subtle"
      />
      {events.map((event) => {
        const Icon = event.icon;
        return (
          <li key={event.id} className="relative pl-8 pb-4 last:pb-0">
            <span
              className="absolute left-0 top-0.5 w-[22px] h-[22px] rounded-full border-[0.5px] border-border-subtle bg-surface flex items-center justify-center"
              style={event.iconColor ? { color: event.iconColor } : undefined}
            >
              {Icon ? (
                <Icon className="w-3 h-3" strokeWidth={1.75} />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-current"
                  style={{ backgroundColor: event.iconColor ?? "currentColor" }}
                />
              )}
            </span>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-body text-text-primary">{event.title}</div>
                {event.meta && (
                  <div className="text-small text-text-tertiary mt-0.5">
                    {event.meta}
                  </div>
                )}
              </div>
              <time className="text-small text-text-tertiary whitespace-nowrap">
                {event.timestamp}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
