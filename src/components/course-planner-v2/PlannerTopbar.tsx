/**
 * PlannerTopbar — strukturerad topbar för Course Planner V2.
 *
 * Funktionell gruppering (vänster → höger):
 *   1. Tillbaka + bana-namn + autosparad-tid
 *   2. Sport-toggle (alltid synlig)
 *   3. Validering (alltid synlig om det finns problem)
 *   4. Sekundära åtgärder: Bibliotek · Träna · Dela
 *      → kollapsas till en ⋯ Mer-meny under sm-brytpunkten
 *   5. Export (PDF + JSON + 3D, behåller existerande ExportMenu)
 *   6. Spara (primär)
 *
 * Sticky med skugga som trigger:as när sidan scrollas.
 * Mellanrum mellan grupper markeras med 1px vertikala separatorer.
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
  /** Slot för sport-segmented control */
  sportToggle: ReactNode;
  /** Slot för validation-badge */
  validationBadge: ReactNode;
  /** Slot för Export-menyn (befintlig ExportMenu) */
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

function Separator() {
  return <span className="h-6 w-px bg-border mx-0.5 hidden sm:block" aria-hidden />;
}

export function PlannerTopbar({
  courseName, onCourseNameChange, savedAt,
  sportToggle, validationBadge, exportMenu,
  onLibrary, onTrain, onShare, shareDisabled, shareTitle,
  onSave, saveDisabled, isAuthenticated,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

  // Sticky shadow: visa skugga först när sidan scrollats förbi top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-black/5 px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-3 transition-shadow",
        scrolled && "shadow-[0_4px_12px_-6px_rgba(0,0,0,0.08)]",
      )}
    >
      {/* GRUPP 1 — navigering + namn */}
      <Link
        to="/v3/courses"
        className="h-9 w-9 grid place-items-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition shrink-0"
        aria-label="Tillbaka till banor"
        title="Tillbaka till banor"
      >
        <ArrowLeft size={16} />
      </Link>
      <input
        value={courseName}
        onChange={(e) => onCourseNameChange(e.target.value)}
        aria-label="Banans namn"
        placeholder="Banans namn"
        className="h-9 min-w-0 flex-1 max-w-[140px] sm:max-w-[280px] lg:max-w-[320px] px-3 rounded-full border border-black/10 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-[#1a6b3c]/25"
      />
      <span className="hidden lg:inline text-[11px] text-neutral-500 shrink-0" aria-live="polite">
        {savedAt
          ? `Autosparad ${savedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`
          : "Sparas…"}
      </span>

      {/* GRUPPER 2–6 — höger sida */}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {/* Grupp 2: sport */}
        {sportToggle}

        <Separator />

        {/* Grupp 3: validering */}
        {validationBadge}

        <Separator />

        {/* Grupp 4: sekundära åtgärder — synliga från sm och uppåt */}
        <div className="hidden sm:flex items-center gap-1.5">
          <IconBtn
            icon={<Library size={14} />}
            label="Bibliotek"
            title="Öppna banbibliotek"
            onClick={onLibrary}
          />
          <IconBtn
            icon={<Dumbbell size={14} />}
            label="Träna"
            title="Skapa träningspass från denna bana"
            onClick={onTrain}
          />
          <IconBtn
            icon={<Share2 size={14} />}
            label="Dela"
            title={shareTitle}
            onClick={onShare}
            disabled={shareDisabled}
          />
        </div>

        {/* Grupp 4 (mobil): Mer-meny som rymmer sekundära åtgärder */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Fler åtgärder"
                title="Fler åtgärder"
                className="h-9 w-9 grid place-items-center rounded-full bg-white border border-black/10 text-neutral-700 hover:border-neutral-400"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Fler åtgärder</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onLibrary}>
                <Library size={14} className="mr-2" /> Bibliotek
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

        <Separator />

        {/* Grupp 5: export */}
        {exportMenu}

        {/* Grupp 6: spara (primär). Ikon-bara på mobil, ikon+text från sm. */}
        <button
          type="button"
          onClick={() => { void onSave(); }}
          disabled={saveDisabled}
          className="h-9 w-9 sm:w-auto sm:px-3 inline-flex items-center justify-center rounded-full bg-[#1a6b3c] text-white text-[12px] font-semibold gap-1.5 hover:bg-[#155730] disabled:opacity-60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6b3c]/40 shrink-0"
          title={isAuthenticated ? "Spara i molnet" : "Sparas lokalt — logga in för molnsynk"}
          aria-label="Spara bana"
        >
          {isAuthenticated ? <Cloud size={14} /> : <CloudOff size={14} />}
          <span className="hidden sm:inline">Spara</span>
        </button>
      </div>
    </header>
  );
}
