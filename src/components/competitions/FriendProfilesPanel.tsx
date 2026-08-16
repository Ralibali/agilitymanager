import { useState } from "react";
import { Check, Dog, Pencil, RefreshCw, Users, Zap } from "lucide-react";
import {
  AGILITY_LEVELS,
  HOOPERS_LEVELS,
  JUMP_HEIGHT_CM,
  hoopersSizeFor,
  profileLabel,
  type DogProfile,
  type SavedDogProfile,
  type SizeClass,
} from "@/lib/dogMatch";
import type { FriendProfileOwner, FriendsState } from "@/lib/dogMatchFriends";

const SIZES: SizeClass[] = ["XS", "S", "M", "L"];

const fieldClass =
  "min-h-11 w-full rounded-2xl border-2 border-ink/15 bg-paper px-3 py-2 text-sm font-bold text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none";

interface Props {
  state: FriendsState;
  owners: FriendProfileOwner[];
  /** Antal matchande tävlingar för en delad profil inom nuvarande filter. */
  countFor: (profile: DogProfile) => number;
  /** Kopierar vännens profil till mina egna och slår på matchningen. */
  onUse: (profile: SavedDogProfile) => void;
  /** Sparar en ändring i vännens profil. */
  onEdit: (ownerId: string, profileId: string, patch: Partial<DogProfile>) => Promise<boolean>;
  onRefresh: () => void;
}

function summary(p: DogProfile): string {
  const level = p.sport === "agility" ? p.agilityLevel : p.hoopersLevel;
  const size = p.sport === "agility" ? `${JUMP_HEIGHT_CM[p.size]} cm` : hoopersSizeFor(p.size);
  return `${level} · ${size}`;
}

/** Vänners matchningsprofiler — synliga och redigerbara på alla enheter. */
export function FriendProfilesPanel({ state, owners, countFor, onUse, onEdit, onRefresh }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  if (state === "off") return null;

  const save = async (ownerId: string, profileId: string, patch: Partial<DogProfile>) => {
    setSaving(profileId);
    await onEdit(ownerId, profileId, patch);
    setSaving(null);
  };

  return (
    <div className="rounded-3xl border-2 border-ink/15 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/45">
          <Users className="h-4 w-4 text-forest" aria-hidden="true" /> Vänners hundprofiler
        </span>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Hämta vänners profiler på nytt"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink/70 transition-all hover:border-ink hover:text-ink"
        >
          <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
          Uppdatera
        </button>
      </div>

      {state === "error" && (
        <p className="mt-3 text-sm font-semibold text-clay">
          Kunde inte hämta vänners profiler just nu.
        </p>
      )}

      {state !== "error" && owners.length === 0 && (
        <p className="mt-3 text-sm font-semibold text-ink/60">
          {state === "loading"
            ? "Hämtar vänners profiler …"
            : "Inga delade profiler ännu — när du och en vän är kopplade syns varandras hundprofiler här, på alla era enheter."}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {owners.map((owner) => (
          <div key={owner.userId}>
            <p className="mb-2 text-sm font-extrabold text-ink">{owner.name}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {owner.profiles.map((p, i) => {
                const label = profileLabel(p, i);
                const isEditing = editing === p.id;
                const levels = p.sport === "agility" ? AGILITY_LEVELS : HOOPERS_LEVELS;
                const level = p.sport === "agility" ? p.agilityLevel : p.hoopersLevel;
                return (
                  <div key={p.id} className="rounded-2xl border-2 border-ink/15 bg-paper p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-start gap-2">
                        <Dog className="mt-0.5 h-5 w-5 shrink-0 text-ink/70" aria-hidden="true" />
                        <span className="leading-tight">
                          <span className="block text-sm font-bold text-ink">{label}</span>
                          <span className="block text-xs font-semibold text-ink/60">
                            {summary(p)}
                            <span className="ml-2 inline-flex items-center rounded-full bg-ink/10 px-2 py-0.5 text-xs font-extrabold text-ink">
                              {countFor(p)}
                            </span>
                            <span className="ml-1 font-medium">matchar</span>
                          </span>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditing(isEditing ? null : p.id)}
                        aria-label={`${isEditing ? "Stäng redigering av" : "Redigera"} ${owner.name}s profil ${label}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-full text-ink/60 transition-colors hover:bg-ink/10 hover:text-ink"
                      >
                        {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </button>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <select
                          value={p.sport}
                          aria-label={`Sport för ${label}`}
                          onChange={(e) =>
                            save(owner.userId, p.id, { sport: e.target.value as DogProfile["sport"] })
                          }
                          className={fieldClass}
                        >
                          <option value="agility">Agility</option>
                          <option value="hoopers">Hoopers</option>
                        </select>
                        <select
                          value={level}
                          aria-label={`Klass för ${label}`}
                          onChange={(e) =>
                            save(
                              owner.userId,
                              p.id,
                              p.sport === "agility"
                                ? { agilityLevel: e.target.value as DogProfile["agilityLevel"] }
                                : { hoopersLevel: e.target.value as DogProfile["hoopersLevel"] },
                            )
                          }
                          className={fieldClass}
                        >
                          {levels.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.size}
                          aria-label={`Storlek för ${label}`}
                          onChange={(e) => save(owner.userId, p.id, { size: e.target.value as SizeClass })}
                          className={fieldClass}
                        >
                          {SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s} · {JUMP_HEIGHT_CM[s]} cm
                            </option>
                          ))}
                        </select>
                        <p className="sm:col-span-3 text-xs font-semibold text-ink/55" aria-live="polite">
                          {saving === p.id
                            ? "Sparar hos vännen …"
                            : "Ändringar sparas direkt och syns för er båda på alla enheter."}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onUse(p)}
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold text-ink transition-all hover:border-ink"
                    >
                      <Zap className="h-4 w-4 text-forest" aria-hidden="true" /> Använd som filter
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
