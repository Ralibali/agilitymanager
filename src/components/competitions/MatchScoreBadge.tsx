import { matchScore, useDogProfile, type MatchTier } from "@/lib/dogMatch";
import type { UnifiedCompetition } from "@/lib/competitionData";

const TIER_STYLE: Record<MatchTier, string> = {
  strong: "border-ink bg-forest text-paper",
  likely: "border-ink bg-tang text-ink",
  weak: "border-ink/20 bg-paper text-ink/60",
  none: "border-ink/15 bg-ink/5 text-ink/45",
};

/** Liten etikett som rangordnar hur väl tävlingen matchar aktiv hundprofil. */
export function MatchScoreBadge({
  comp,
  className = "",
}: {
  comp: UnifiedCompetition;
  className?: string;
}) {
  const { profile } = useDogProfile();
  const result = matchScore(comp, profile);

  return (
    <span
      title={result.hint}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-wider ${TIER_STYLE[result.tier]} ${className}`}
    >
      {result.label}
      <span className="font-bold opacity-70">{result.score}%</span>
    </span>
  );
}
