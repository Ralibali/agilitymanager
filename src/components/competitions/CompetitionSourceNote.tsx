import { ExternalLink, Info } from "lucide-react";
import {
  AGILITY_SOURCE,
  HOOPERS_SOURCE,
  SOURCE_DISCLAIMER,
  type CompetitionSource,
} from "@/lib/competitionSource";

function SourceLink({ source }: { source: CompetitionSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-bold text-forest underline decoration-2 underline-offset-2 hover:text-tang"
    >
      {source.name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

/**
 * Tydlig källhänvisning för tävlingsdata. Utan `source` visas båda källorna,
 * för listor som blandar agility och hoopers.
 */
export function CompetitionSourceNote({
  source,
  className = "",
}: {
  source?: CompetitionSource;
  className?: string;
}) {
  return (
    <aside
      aria-label="Datakälla"
      className={`flex gap-3 rounded-2xl border-2 border-ink/15 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-ink/70 ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
      <p>
        <strong className="text-ink">Källa:</strong>{" "}
        {source ? (
          <>
            <SourceLink source={source} /> ({source.organization}).
          </>
        ) : (
          <>
            <SourceLink source={AGILITY_SOURCE} /> ({AGILITY_SOURCE.organization}) och{" "}
            <SourceLink source={HOOPERS_SOURCE} /> ({HOOPERS_SOURCE.organization}).
          </>
        )}{" "}
        {SOURCE_DISCLAIMER}
      </p>
    </aside>
  );
}
