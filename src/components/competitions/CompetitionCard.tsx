import { Link } from "react-router";
import { CalendarDays, MapPin } from "lucide-react";
import { deadlineInfo, shortDate, type UnifiedCompetition } from "@/lib/competitionData";
import { FavoriteButton } from "./FavoriteButton";

const TONE_STYLE: Record<string, string> = {
  open: "bg-forest text-paper",
  urgent: "bg-tang text-ink",
  closed: "bg-ink/10 text-ink/45",
  unknown: "bg-ink/10 text-ink/55",
};

export function CompetitionCard({ comp }: { comp: UnifiedCompetition }) {
  const deadline = deadlineInfo(comp.registrationCloses);
  const d = shortDate(comp.dateStart);

  return (
    <div className="relative h-full">
    <Link
      to={comp.path}
      className="group flex h-full flex-col rounded-3xl border-2 border-ink bg-[#FCFAF4] p-6 shadow-hard transition-transform duration-300 hover:-translate-y-1.5"
    >

      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider ${TONE_STYLE[deadline.tone]}`}
          >
            {deadline.label}
          </span>
          <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">{comp.name}</h3>
        </div>
        <span className="grid h-16 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-cream text-center font-display leading-none">
          <span>
            <span className="block text-2xl">{d.day}</span>
            <span className="block text-sm uppercase">{d.month}</span>
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-ink/55">
        {comp.location && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-forest" /> {comp.location}
            {comp.county ? ` · ${comp.county}` : ""}
          </span>
        )}
        {comp.club && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-forest" /> {comp.club}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-dashed border-ink/10 pt-4 pr-12">
        <span className="text-sm font-bold text-ink/60">
          {comp.classes.length ? comp.classes.join(" · ") : "Klasser ej angivna"}
        </span>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
            comp.sport === "agility" ? "bg-forest/10 text-forest" : "bg-tang/15 text-ember"
          }`}
        >
          {comp.sport}
        </span>
      </div>
    </Link>
      <FavoriteButton compKey={comp.key} className="absolute bottom-4 right-4 z-20 shadow-hard-sm" />
    </div>
  );
}

