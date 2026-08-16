import { useState } from "react";
import { CheckCircle2, Copy, Dog, MoreVertical, Plus, Trash2, Zap } from "lucide-react";
import {
  JUMP_HEIGHT_CM,
  hoopersSizeFor,
  profileLabel,
  type SavedDogProfile,
} from "@/lib/dogMatch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  /** Duplicerar en profil. */
  onDuplicate: (id: string) => void;
  /** Tar bort en profil. */
  onRemove: (id: string) => void;
  /** Skapar en ny tom profil. */
  onAdd: () => void;
  /** Fler profiler får skapas. */
  canAdd: boolean;
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
  onDuplicate,
  onRemove,
  onAdd,
  canAdd,
  loading,
}: Props) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingProfile = profiles.find((p) => p.id === pendingDeleteId);

  return (
    <>
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
              const isSelected = !active && p.id === activeId;
              const label = profileLabel(p, i);
              return (
                <div
                  key={p.id}
                  className={`flex shrink-0 items-center rounded-full border-2 transition-all ${
                    isActive
                      ? "border-ink bg-forest text-paper shadow-hard ring-2 ring-forest/40 ring-offset-2 ring-offset-paper"
                      : isSelected
                        ? "border-forest bg-forest/10 text-ink hover:border-ink"
                        : "border-ink/15 bg-paper text-ink/70 hover:border-ink"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onActivate(p.id)}
                    aria-pressed={isActive}
                    aria-current={isActive ? "true" : undefined}
                    title={isActive ? `${label} styr filtret` : `Filtrera på ${label}`}
                    className="flex items-center gap-2 rounded-l-full py-2 pl-4 pr-2 text-left"
                  >
                    {isActive ? (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-forest">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    ) : (
                      <Dog className={`h-4 w-4 shrink-0 ${isSelected ? "text-forest" : "text-ink/60"}`} />
                    )}
                    <span className="leading-tight">
                      <span className="flex items-center gap-1.5 text-sm font-bold">
                        {label}
                        {isActive && (
                          <span className="rounded-full bg-paper px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wider text-forest">
                            Aktiv
                          </span>
                        )}
                        {isSelected && (
                          <span className="rounded-full bg-forest/15 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wider text-forest">
                            Vald
                          </span>
                        )}
                      </span>
                      <span className={`block text-[0.68rem] font-semibold ${isActive ? "text-paper/80" : "text-ink/45"}`}>
                        {summary(p)}
                        {!loading && (
                          <span
                            key={counts[p.id] ?? 0}
                            className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.6rem] font-extrabold ${isActive ? "bg-paper text-forest" : "bg-ink/10 text-ink/60"}`}
                          >
                            {counts[p.id] ?? 0}
                          </span>
                        )}
                        {!loading && <span className="ml-1 font-medium">matchar</span>}
                      </span>
                    </span>
                  </button>


                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Hantera ${label}`}
                        className={`rounded-r-full py-2 pl-1 pr-3 transition-colors ${
                          isActive ? "text-paper/80 hover:text-paper" : "text-ink/40 hover:text-ink"
                        }`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 border-2 border-ink/15 bg-paper">
                      <DropdownMenuItem onSelect={() => onActivate(p.id)} className="font-semibold">
                        <Zap className="mr-2 h-4 w-4" /> Använd som filter
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDuplicate(p.id)}
                        disabled={!canAdd}
                        className="font-semibold"
                      >
                        <Copy className="mr-2 h-4 w-4" /> Duplicera
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setPendingDeleteId(p.id)}
                        disabled={profiles.length <= 1}
                        className="font-semibold text-clay focus:text-clay"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}

            {canAdd && (
              <button
                type="button"
                onClick={onAdd}
                className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-dashed border-ink/25 bg-paper px-4 py-2 text-sm font-bold text-ink/60 transition-all hover:border-ink hover:text-ink"
              >
                <Plus className="h-4 w-4" /> Ny profil
              </button>
            )}
          </div>

          <p aria-live="polite" className="w-full text-xs font-semibold text-ink/55">
            {active
              ? `Visar ${counts[activeId] ?? 0} tävlingar som matchar ${
                  profileLabel(
                    profiles.find((p) => p.id === activeId) ?? profiles[0],
                    Math.max(0, profiles.findIndex((p) => p.id === activeId)),
                  )
                }.`
              : "Ingen hundprofil styr filtret just nu — tryck på en hund för att bara se matchande tävlingar."}
          </p>
        </div>

      </div>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent className="border-2 border-ink bg-paper">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Ta bort profil?</AlertDialogTitle>
            <AlertDialogDescription className="text-ink/65">
              Är du säker på att du vill ta bort{" "}
              <strong className="text-ink">
                {pendingProfile ? profileLabel(pendingProfile, profiles.indexOf(pendingProfile)) : "profilen"}
              </strong>
              ? Det går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setPendingDeleteId(null)}
              className="rounded-full border-2 border-ink/15 font-bold text-ink hover:bg-ink/5"
            >
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId) onRemove(pendingDeleteId);
                setPendingDeleteId(null);
              }}
              className="rounded-full border-2 border-ink bg-clay font-bold text-paper hover:bg-clay/90"
            >
              Ja, ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
