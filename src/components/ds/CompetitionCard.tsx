import { format, parseISO, differenceInDays } from "date-fns";
import { sv } from "date-fns/locale";
import { MapPin, Calendar, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface Props {
  title: string;
  club?: string | null;
  location?: string | null;
  dateStart: string | null;
  dateEnd?: string | null;
  registrationDeadline?: string | null;
  classes?: string[];
  sport?: "Agility" | "Hoopers";
  sourceUrl?: string | null;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Fas 5 – Tävlingskort. Tät rad i listvy med datum-block, plats, klasser
 * och deadline-status. Kompatibel med både Agility- och Hoopers-tävlingar.
 */
export function CompetitionCard({
  title,
  club,
  location,
  dateStart,
  dateEnd,
  registrationDeadline,
  classes = [],
  sport = "Agility",
  sourceUrl,
  rightSlot,
  onClick,
  className,
}: Props) {
  const date = dateStart ? parseISO(dateStart) : null;
  const end = dateEnd ? parseISO(dateEnd) : null;
  const sameDay = !end || (date && format(date, "yyyy-MM-dd") === format(end, "yyyy-MM-dd"));

  let deadlineBadge: React.ReactNode = null;
  if (registrationDeadline) {
    const days = differenceInDays(parseISO(registrationDeadline), new Date());
    if (days < 0) {
      deadlineBadge = <StatusBadge variant="neutral" label="Stängd" />;
    } else if (days <= 7) {
      deadlineBadge = <StatusBadge variant="warning" label={`${days} d kvar`} />;
    } else {
      deadlineBadge = <StatusBadge variant="info" label={`Öppen t.o.m. ${format(parseISO(registrationDeadline), "d MMM", { locale: sv })}`} />;
    }
  }

  return (
    <article
      onClick={onClick}
      className={cn(
        "group flex gap-4 p-4 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface",
        onClick && "hover:border-border-default cursor-pointer",
        "transition-colors",
        className,
      )}
    >
      {/* Datum-block */}
      <div className="shrink-0 w-12 text-center">
        <div className="text-micro text-text-tertiary uppercase tracking-wide">
          {date ? format(date, "MMM", { locale: sv }) : "—"}
        </div>
        <div className="text-h2 font-display text-text-primary leading-none mt-0.5">
          {date ? format(date, "d", { locale: sv }) : "?"}
        </div>
        {!sameDay && end && (
          <div className="text-micro text-text-tertiary mt-1">
            –{format(end, "d MMM", { locale: sv })}
          </div>
        )}
      </div>

      {/* Innehåll */}
      <div className="min-w-0 flex-1">
        <header className="flex items-start gap-2 mb-1 flex-wrap">
          <h3 className="text-body font-medium text-text-primary truncate">{title}</h3>
          <span
            className={cn(
              "shrink-0 inline-flex items-center px-1.5 h-5 rounded-ds-sm text-micro font-medium",
              sport === "Hoopers" ? "bg-amber-50 text-amber-900" : "bg-brand-50 text-brand-900",
            )}
          >
            {sport}
          </span>
          {deadlineBadge}
        </header>
        {(club || location) && (
          <p className="text-small text-text-secondary truncate">
            {club}
            {club && location && " · "}
            {location && (
              <span className="inline-flex items-center gap-0.5 text-text-tertiary">
                <MapPin className="w-3 h-3" /> {location}
              </span>
            )}
          </p>
        )}

        {classes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {classes.slice(0, 6).map((c) => (
              <span
                key={c}
                className="inline-flex items-center px-1.5 h-5 rounded-ds-sm text-micro bg-subtle text-text-secondary"
              >
                {c}
              </span>
            ))}
            {classes.length > 6 && (
              <span className="text-micro text-text-tertiary self-center">
                +{classes.length - 6} till
              </span>
            )}
          </div>
        )}
      </div>

      {rightSlot && (
        <div className="shrink-0 self-start flex items-center gap-2">{rightSlot}</div>
      )}
    </article>
  );
}
