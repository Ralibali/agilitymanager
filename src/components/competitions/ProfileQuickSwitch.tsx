import { Dog, Zap } from "lucide-react";
import {
  JUMP_HEIGHT_CM,
  hoopersSizeFor,
  profileLabel,
  type SavedDogProfile,
} from "@/lib/dogMatch";

interface Props {
  profiles: SavedDogProfile[];
  activeId: string;
  /** Matchningsfiltret är påslaget. */
  active: boolean;
  /** Antal matchande tävlingar per profil-id. */
  counts: Record<string, number>;
  /** Väljer profil och slår på matchande filter. */
  onActivate: (id: string) => void;
  /** Stänger av matchningen och visar alla tävlingar. */
  onClear: () => void;
  loading: boolean;
}

function summary(p: SavedDogProfile): string {
  const level = p.sport === "agility" ? p.agilityLevel : p.hoopersLevel;
  const size = p.sport === "agility" ? `${JUMP_HEIGHT_CM[p.size]} cm` : hoopersSizeFor(p.size);
  return `${level} · ${size}`;
}

/** Snabbväxel: ett tryck sätter sport- och klassfilter efter vald hund. */
export function ProfileQuickSwitch({
  profiles,
  activeId,
  active,
  counts,
  onActivate,
  onClear,
  loading,
}: Props) {
  return (
    <div className="rounded-3xl border-2 border-ink/15 bg-[#FCFAF4] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-extrabold uppercase tracking-wider text-ink/45">
          <Zap className="h-3.5 w-3.5 text-forest" /> Snabbväxla hund
        </span>

        <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          <button
            type="button"
            onClick={onClear}
            aria-pressed={!active}
            className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-all ${
              !active
                ? "border-ink bg-ink text-paper shadow-hard-sm"
                : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
            }`}
          >
            Alla tävlingar
          </button>

          {profiles.map((p, i) => {
            const isActive = active && p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onActivate(p.id)}
                aria-pressed={isActive}
                className={`flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-left transition-all ${
                  isActive
                    ? "border-ink bg-forest text-paper shadow-hard-sm"
                    : "border-ink/15 bg-paper text-ink/70 hover:border-ink"
                }`}
              >
                <Dog className="h-4 w-4 shrink-0" />
                <span className="leading-tight">
                  <span className="block text-sm font-bold">{profileLabel(p, i)}</span>
                  <span className={`block text-[0.68rem] font-semibold ${isActive ? "text-paper/70" : "text-ink/45"}`}>
                    {summary(p)}
                    {!loading ? ` · ${counts[p.id] ?? 0} matchar` : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
