import { Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleSet } from "@/features/course-planner-v2/rules";

interface Props {
  ruleSet: RuleSet;
  className?: string;
  compact?: boolean;
}

/**
 * Visar regelverkets sanna verifieringsstatus.
 *
 * - `verified` → "Regelkontrollerad" (grön). Vi har citat mot officiellt dokument.
 * - `partially_verified` / `provisional` → "Förhandskontroll" (neutral).
 *
 * En diskret tooltip förklarar att kontrollen hjälper hitta vanliga problem
 * men INTE ersätter det officiella regelverket. Länken går till primär källa.
 */
export function RuleSetTrustBadge({ ruleSet, className, compact }: Props) {
  const verified = ruleSet.verificationStatus === "verified";
  const label = verified ? "Regelkontrollerad" : "Förhandskontroll";
  const tooltip = verified
    ? `Värdena i denna kontroll är citerade från ${ruleSet.authority}.`
    : "Kontrollen hjälper dig hitta vanliga problem men ersätter inte aktuellt officiellt regelverk. Verifiera alltid mot utgivarens dokument.";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        verified
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : "border-amber-500/30 bg-amber-500/10 text-amber-800",
        className,
      )}
      title={tooltip}
      role="note"
      aria-label={`${label}: ${tooltip}`}
    >
      {verified ? <ShieldCheck size={13} /> : <Info size={13} />}
      <span>{label}</span>
      {!compact && (
        <a
          href={ruleSet.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="ml-1 underline-offset-2 hover:underline"
        >
          källa
        </a>
      )}
    </div>
  );
}

export default RuleSetTrustBadge;
