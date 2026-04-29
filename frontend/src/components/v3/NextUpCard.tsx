import { Trophy, Dumbbell, MapPin, ArrowUpRight, CalendarPlus } from "lucide-react";
import { Link } from "react-router-dom";
import type { NextEvent } from "@/hooks/v3/useV3Dashboard";
import { cn } from "@/lib/utils";

interface Props {
  next: NextEvent;
}

const WEEKDAY = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
const MONTH = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function formatDate(iso: string): { weekday: string; day: string; month: string; relative: string } {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  let relative: string;
  if (days === 0) relative = "idag";
  else if (days === 1) relative = "imorgon";
  else if (days < 7) relative = `om ${days} dagar`;
  else if (days < 30) relative = `om ${Math.round(days / 7)} v`;
  else relative = `om ${Math.round(days / 30)} mån`;

  return {
    weekday: WEEKDAY[d.getDay()],
    day: String(d.getDate()),
    month: MONTH[d.getMonth()],
    relative,
  };
}

/**
 * "Nästa upp" – fokus på en kommande tävling eller träning.
 * Tomt tillstånd uppmuntrar planering.
 */
export function NextUpCard({ next }: Props) {
  if (!next) {
    return (
      <section
        aria-label="Nästa upp"
        className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 lg:p-6"
      >
        <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">
          Nästa upp
        </div>
        <p className="font-v3-display text-v3-2xl text-v3-text-primary leading-tight">
          Inget planerat än.
        </p>
        <p className="text-v3-sm text-v3-text-secondary mt-1.5">
          Planera ett pass eller anmäl dig till en tävling så syns det här.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/v3/training?action=new"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors"
          >
            <CalendarPlus size={14} strokeWidth={1.6} />
            Planera pass
          </Link>
          <Link
            to="/v3/competition"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-v3-base bg-v3-canvas-secondary text-v3-text-primary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors"
          >
            <Trophy size={14} strokeWidth={1.6} />
            Hitta tävling
          </Link>
        </div>
      </section>
    );
  }

  const Icon = next.kind === "competition" ? Trophy : Dumbbell;
  const accentBg = next.kind === "competition" ? "bg-v3-accent-tavlings/12 text-v3-accent-tavlings" : "bg-v3-accent-traning/12 text-v3-accent-traning";
  const kindLabel = next.kind === "competition" ? "Tävling" : "Träning";
  const linkTo = next.kind === "competition" ? "/v3/competition" : "/v3/training";
  const f = formatDate(next.date);

  return (
    <section
      aria-label="Nästa upp"
      className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 lg:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
          Nästa upp
        </div>
        <Link
          to={linkTo}
          className="text-v3-xs text-v3-text-tertiary hover:text-v3-text-primary inline-flex items-center gap-1 transition-colors"
        >
          Se alla
          <ArrowUpRight size={12} strokeWidth={1.6} />
        </Link>
      </div>

      <div className="flex items-start gap-4">
        {/* Datum-block */}
        <div className="shrink-0 text-center bg-v3-canvas-secondary rounded-v3-lg px-3 py-2 min-w-[64px]">
          <div className="text-[11px] tracking-wide font-medium text-v3-text-tertiary">
            {f.weekday}
          </div>
          <div className="font-v3-display text-[32px] leading-none text-v3-text-primary tabular-nums my-0.5">
            {f.day}
          </div>
          <div className="text-[11px] tracking-wide font-medium text-v3-text-tertiary">
            {f.month}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", accentBg)}>
            <Icon size={12} strokeWidth={1.8} />
            {kindLabel}
          </div>
          <h3 className="font-v3-display text-[24px] lg:text-[28px] leading-tight mt-1.5 text-v3-text-primary">
            {next.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-v3-sm text-v3-text-secondary">
            <span className="font-medium text-v3-text-primary">{f.relative}</span>
            {next.kind === "training" && next.time_start && (
              <span>· kl {next.time_start.slice(0, 5)}</span>
            )}
            {next.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={1.6} />
                {next.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
