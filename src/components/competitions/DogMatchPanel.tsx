import { useState } from "react";
import { CheckCircle2, Copy, Dog, Plus, Ruler, Sparkles, Trash2, X } from "lucide-react";
import {
  AGILITY_LEVELS,
  HOOPERS_LEVELS,
  JUMP_HEIGHT_CM,
  SIZE_WITHERS,
  hoopersSizeFor,
  profileLabel,
  type DogProfile,
  type SavedDogProfile,
  type SizeClass,
} from "@/lib/dogMatch";
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

const SIZES: SizeClass[] = ["XS", "S", "M", "L"];

interface Props {
  profile: DogProfile;
  profiles: SavedDogProfile[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  canAdd: boolean;
  onChange: (patch: Partial<DogProfile>) => void;
  active: boolean;
  onToggle: (next: boolean) => void;
  matchCount: number;
  loading: boolean;
}

const selectClass =
  "w-full rounded-2xl border-2 border-ink/15 bg-paper px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none";

/** Matchningsvy: filtrerar kalendern efter hundens sport, klass och storlek. */
export function DogMatchPanel({
  profile,
  profiles,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  canAdd,
  onChange,
  active,
  onToggle,
  matchCount,
  loading,
}: Props) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingProfile = profiles.find((p) => p.id === pendingDeleteId);
  const level = profile.sport === "agility" ? profile.agilityLevel : profile.hoopersLevel;
  const levels = profile.sport === "agility" ? AGILITY_LEVELS : HOOPERS_LEVELS;

  return (
    <>
      <div className="rounded-3xl border-2 border-ink bg-card p-5 shadow-hard sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-forest text-paper">
              <Dog className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-2xl tracking-wide">Matcha mot din hund</h2>
              <p className="mt-1 text-sm font-semibold text-ink/55">
                Ställ in klass och storlek så visas bara tävlingar din hund får starta i.
              </p>
            </div>
          </div>

          <button
            onClick={() => onToggle(!active)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-all ${
              active
                ? "border-ink bg-forest text-paper shadow-hard-sm"
                : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {active ? "Matchning på" : "Visa bara matchande"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Profiler</span>
          {profiles.map((p, i) => {
            const isActive = p.id === activeId;
            return (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1 rounded-full border-2 pl-1 pr-1 transition-all ${
                  isActive ? "border-ink bg-forest text-paper shadow-hard ring-2 ring-forest/25 ring-offset-2 ring-offset-paper" : "border-ink/15 bg-paper text-ink/70"
                }`}
              >
                <button
                  onClick={() => onSelect(p.id)}
                  aria-pressed={isActive}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold"
                >
                  {isActive ? <CheckCircle2 className="h-4 w-4" /> : <Dog className="h-4 w-4 text-ink/50" />}
                  {profileLabel(p, i)}
                </button>
                {profiles.length > 1 && (
                  <button
                    onClick={() => setPendingDeleteId(p.id)}
                    aria-label={`Ta bort ${profileLabel(p, i)}`}
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-ink/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            );
          })}
          {canAdd && (
            <>
              <button
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-ink/25 px-3 py-1.5 text-sm font-bold text-ink/60 hover:border-ink hover:text-ink"
              >
                <Plus className="h-4 w-4" /> Ny profil
              </button>
              <button
                onClick={() => onDuplicate(activeId)}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm font-bold text-ink/60 hover:border-ink hover:text-ink"
              >
                <Copy className="h-4 w-4" /> Duplicera
              </button>
            </>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">
              Hundens namn
            </span>
            <input
              value={profile.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="T.ex. Rio"
              className={selectClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">
              Sport
            </span>
            <select
              value={profile.sport}
              onChange={(e) => onChange({ sport: e.target.value as DogProfile["sport"] })}
              className={selectClass}
            >
              <option value="agility">Agility</option>
              <option value="hoopers">Hoopers</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">
              Klass
            </span>
            <select
              value={level}
              onChange={(e) =>
                onChange(
                  profile.sport === "agility"
                    ? { agilityLevel: e.target.value as DogProfile["agilityLevel"] }
                    : { hoopersLevel: e.target.value as DogProfile["hoopersLevel"] },
                )
              }
              className={selectClass}
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45">
              Storleksklass
            </span>
            <select
              value={profile.size}
              onChange={(e) => onChange({ size: e.target.value as SizeClass })}
              className={selectClass}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} · {SIZE_WITHERS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t-2 border-ink/10 pt-4 text-xs font-bold text-ink/60">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5">
            <Ruler className="h-3.5 w-3.5" />
            {profile.sport === "agility"
              ? `Hopphöjd ${JUMP_HEIGHT_CM[profile.size]} cm (${profile.size})`
              : `Hoopers storlek ${hoopersSizeFor(profile.size)} (${profile.size})`}
          </span>
          <span className="rounded-full border-2 border-ink/15 px-3 py-1.5">
            {loading
              ? "Hämtar tävlingar…"
              : `${matchCount} tävlingar matchar ${profile.name.trim() || "din hund"}`}
          </span>
          <span className="text-ink/40">
            Klassmatchningen bygger på arrangörernas klasslistor. Storlek påverkar hopphöjd och
            hoopersklass — svenska tävlingar tar emot alla storlekar.
          </span>
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
              <Trash2 className="mr-2 h-4 w-4" /> Ja, ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
