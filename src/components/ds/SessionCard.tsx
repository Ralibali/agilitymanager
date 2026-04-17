import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Activity, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingSession, Dog } from "@/types";

interface Props {
  session: TrainingSession;
  dog?: Dog;
  onClick?: () => void;
  className?: string;
}

/**
 * Listrad för ett träningspass i Fas 4.
 * Tät, läsbar; type/sport-chip + KPI-rad + ev. plats.
 */
export function SessionCard({ session, dog, onClick, className }: Props) {
  const date = new Date(session.date);
  const isHoopers = session.sport === "Hoopers";
  return (
    <article
      onClick={onClick}
      className={cn(
        "group flex gap-4 p-4 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface",
        "hover:border-border-default transition-colors cursor-pointer",
        className,
      )}
    >
      {/* Datum-block */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-micro text-text-tertiary uppercase tracking-wide">
          {format(date, "MMM", { locale: sv })}
        </div>
        <div className="text-h2 font-display text-text-primary leading-none mt-0.5">
          {format(date, "d", { locale: sv })}
        </div>
      </div>

      {/* Innehåll */}
      <div className="min-w-0 flex-1">
        <header className="flex items-start gap-2 mb-1">
          <h3 className="text-body font-medium text-text-primary truncate">
            {session.type}
          </h3>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded-ds-sm text-micro font-medium",
              isHoopers
                ? "bg-amber-50 text-amber-900"
                : "bg-brand-50 text-brand-900",
            )}
          >
            {isHoopers ? "Hoopers" : "Agility"}
          </span>
        </header>
        <p className="text-small text-text-secondary truncate">
          {dog?.name ?? "Okänd hund"}
          {session.location ? (
            <span className="inline-flex items-center gap-0.5 ml-2 text-text-tertiary">
              <MapPin className="w-3 h-3" /> {session.location}
            </span>
          ) : null}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-small text-text-tertiary tabular-nums">
          <span>{session.duration_min} min</span>
          <span>{session.reps} rep</span>
          {session.fault_count !== null && session.fault_count !== undefined && (
            <span>{session.fault_count} fel</span>
          )}
          {session.best_time_sec ? (
            <span>{session.best_time_sec.toFixed(2)}s</span>
          ) : null}
        </div>

        {(session.notes_good || session.notes_improve) && (
          <p className="text-small text-text-secondary mt-2 line-clamp-1">
            {session.notes_good || session.notes_improve}
          </p>
        )}
      </div>

      {/* Mood-badge */}
      {session.overall_mood ? (
        <div className="shrink-0 self-start flex items-center gap-1 text-small text-text-tertiary tabular-nums">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          {session.overall_mood}
        </div>
      ) : (
        <Activity className="shrink-0 self-start w-4 h-4 text-text-tertiary" />
      )}
    </article>
  );
}
