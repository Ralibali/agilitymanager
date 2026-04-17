import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Trophy, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitionResult, Dog } from "@/types";

interface Props {
  result: CompetitionResult;
  dog?: Dog;
  onClick?: () => void;
  className?: string;
}

/**
 * Fas 5 – Tät resultatrad. Visar datum, klass, tid, fel, placering
 * samt status (godkänd/diskad). Tabular nums för enkel skanning.
 */
export function ResultRow({ result, dog, onClick, className }: Props) {
  const date = parseISO(result.date);
  const placement = result.placement;
  const podium = placement && placement <= 3;

  return (
    <article
      onClick={onClick}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] gap-4 p-3.5 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface items-center",
        onClick && "hover:border-border-default cursor-pointer",
        "transition-colors",
        className,
      )}
    >
      {/* Datum */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-micro text-text-tertiary uppercase tracking-wide">
          {format(date, "MMM", { locale: sv })}
        </div>
        <div className="text-h3 font-display text-text-primary leading-none mt-0.5">
          {format(date, "d", { locale: sv })}
        </div>
      </div>

      {/* Mitten – titel + meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-body font-medium text-text-primary truncate">
            {result.event_name}
          </h4>
          <span
            className={cn(
              "shrink-0 inline-flex items-center px-1.5 h-5 rounded-ds-sm text-micro font-medium",
              result.sport === "Hoopers" ? "bg-amber-50 text-amber-900" : "bg-brand-50 text-brand-900",
            )}
          >
            {result.discipline} · {result.competition_level}
          </span>
        </div>
        <p className="text-small text-text-secondary truncate">
          {dog?.name ?? "Okänd hund"}
          {result.organizer && <span className="text-text-tertiary"> · {result.organizer}</span>}
        </p>
      </div>

      {/* KPI:er höger */}
      <div className="shrink-0 flex items-center gap-4 tabular-nums">
        <div className="text-right">
          <div className="text-micro text-text-tertiary uppercase">Tid</div>
          <div className="text-small font-medium text-text-primary">
            {result.time_sec ? `${result.time_sec.toFixed(2)}s` : "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-micro text-text-tertiary uppercase">Fel</div>
          <div className="text-small font-medium text-text-primary">{result.faults}</div>
        </div>
        <div className="text-right min-w-[44px]">
          <div className="text-micro text-text-tertiary uppercase">Plac.</div>
          <div className={cn(
            "text-small font-medium flex items-center gap-1 justify-end",
            podium ? "text-semantic-warning" : "text-text-primary",
          )}>
            {result.disqualified ? (
              <span className="inline-flex items-center gap-1 text-semantic-danger">
                <AlertCircle className="w-3.5 h-3.5" /> Disk
              </span>
            ) : podium ? (
              <>
                <Trophy className="w-3.5 h-3.5" /> {placement}
              </>
            ) : (
              placement ?? "—"
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
