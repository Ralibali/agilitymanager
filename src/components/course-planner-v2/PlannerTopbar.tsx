/**
 * PlannerTopbar — mobile-first action bar för Course Planner V2.
 *
 * Mobilprioritet:
 *  - Rad 1: tillbaka, bannamn, sparstatus/spara.
 *  - Rad 2: horisontellt scrollbara actions: sport, validering, bibliotek, träna, dela, export.
 *
 * Desktop:
 *  - Samma kontroller ligger i en mer kompakt topbar utan att tryckytor blir för små.
 */
import { ArrowLeft, Library, Dumbbell, Share2, Cloud, CloudOff, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconBtn } from "./IconBtn";

interface Props {
  courseName: string;
  onCourseNameChange: (name: string) => void;
  savedAt: Date | null;
  sportToggle: ReactNode;
  validationBadge: ReactNode;
  exportMenu: ReactNode;

  onLibrary: () => void;
  onTrain: () => void;
  onShare: () => void;
  shareDisabled: boolean;
  shareTitle: string;

  onSave: () => void | Promise<void>;
  saveDisabled: boolean;
  isAuthenticated: boolean;
}

function ActionChip({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="course-planner-mobile-chip inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 text-sm font-bold text-slate-100 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:rounded-full sm:border-border sm:bg-card sm:px-3 sm:text-[12px] sm:text-foreground sm:hover:border-neutral-400"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function PlannerTopbar({
  courseName, onCourseNameChange, savedAt,
  sportToggle, validationBadge, exportMenu,
  onLibrary, onTrain, onShare, shareDisabled, shareTitle,
  onSave, saveDisabled, isAuthenticated,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "course-planner-topbar sticky top-0 z-40 border-b border-white/10 bg-[#0f161d]/95 px-3 py-3 text-white backdrop-blur-xl transition-shadow sm:border-border sm:bg-card/95 sm:text-foreground lg:px-4",
        scrolled && "shadow-[0_12px_32px_-22px_rgba(0,0,0,0.55)]",
      )}
    >
      <div className="flex w-full items-center gap-2">
        <Link
          to="/v3/courses"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-950 shadow-sm transition hover:bg-slate-200 sm:h-9 sm:w-9 sm:rounded-full sm:bg-neutral-100 sm:text-neutral-700 sm:hover:bg-neutral-200"
          aria-label="Tillbaka till banor"
          title="Tillbaka till banor"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="course-name-input">Banans namn</label>
          <input
            id="course-name-input"
            value={courseName}
            onChange={(e) => onCourseNameChange(e.target.value)}
            aria-label="Banans namn"
            placeholder="Banans namn"
            className="h-11 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-base font-black text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-amber-300/40 sm:h-9 sm:max-w-[360px] sm:rounded-full sm:border-border sm:bg-card sm:text-sm sm:font-semibold sm:text-foreground"
          />
          <span className="mt-1 block text-[11px] font-semibold text-slate-500 sm:hidden" aria-live="polite">
            {savedAt ? `Autosparad ${savedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Sparas lokalt…"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => { void onSave(); }}
          disabled={saveDisabled}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-3.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(16,185,129,0.22)] transition hover:bg-emerald-400 disabled:opacity-60 sm:h-9 sm:rounded-full sm:bg-[#1a6b3c] sm:px-3 sm:text-[12px] sm:font-semibold sm:hover:bg-[#155730]"
          title={isAuthenticated ? "Spara i molnet" : "Sparas lokalt — logga in för molnsynk"}
          aria-label={isAuthenticated ? "Spara bana i molnet" : "Spara bana lokalt"}
        >
          {isAuthenticated ? <Cloud size={16} /> : <CloudOff size={16} />}
          <span className="hidden min-[380px]:inline">Spara</span>
        </button>
      </div>

      <div className="course-planner-action-strip mt-3 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:mt-2 sm:pb-0">
        <div className="course-planner-sport-toggle shrink-0">{sportToggle}</div>
        <div className="course-planner-validation shrink-0">{validationBadge}</div>

        <div className="hidden sm:flex items-center gap-1.5">
          <IconBtn icon={<Library size={14} />} label="Bibliotek" title="Öppna banbibliotek" onClick={onLibrary} />
          <IconBtn icon={<Dumbbell size={14} />} label="Träna" title="Skapa träningspass från denna bana" onClick={onTrain} />
          <IconBtn icon={<Share2 size={14} />} label="Dela" title={shareTitle} onClick={onShare} disabled={shareDisabled} />
        </div>

        <div className="flex sm:hidden items-center gap-2">
          <ActionChip icon={<Library size={15} />} label="Banor" onClick={onLibrary} title="Öppna banbibliotek" />
          <ActionChip icon={<Share2 size={15} />} label="Dela" onClick={onShare} disabled={shareDisabled} title={shareTitle} />
          <ActionChip icon={<Dumbbell size={15} />} label="Träna" onClick={onTrain} title="Skapa träningspass från denna bana" />
        </div>

        <div className="shrink-0">{exportMenu}</div>

        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Fler åtgärder"
                title="Fler åtgärder"
                className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
              >
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Fler åtgärder</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onLibrary}>
                <Library size={14} className="mr-2" /> Öppna bibliotek
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onTrain}>
                <Dumbbell size={14} className="mr-2" /> Skapa träningspass
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onShare} disabled={shareDisabled}>
                <Share2 size={14} className="mr-2" /> Dela bana
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="hidden lg:inline ml-auto shrink-0 text-[11px] text-neutral-500" aria-live="polite">
          {savedAt ? `Autosparad ${savedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}` : "Sparas…"}
        </span>
      </div>
    </header>
  );
}
