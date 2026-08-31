/**
 * Banplaneraren — dialog för att öppna en tidigare sparad bana.
 *
 * Visar lokalt sparade banor (fungerar utan profil) och banor sparade på
 * planner-social-profilen via "Spara & dela". Det finns inget konto-
 * system kopplat hit längre — profilen räcker.
 */
import { useEffect, useState } from "react";
import { CloudCheck, HardDrive, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { plannerApi, usePlannerProfile } from "@/lib/plannerProfile";
import type { LibraryCourse } from "@/features/course-planner-v2/library";
import { listLocalCourses, deleteLocalCourse, type LocalCourse } from "@/features/course-planner-v2/localCourses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPickLocal: (course: LocalCourse) => void;
  onPickShared: (course: LibraryCourse) => void;
}

/** Rad från planner-socials my-courses-action. */
type MyCourseRow = {
  id: string;
  name: string;
  sport: string;
  is_public: boolean;
  updated_at: string;
  course_data: unknown;
};

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function OpenCourseDialog({ open, onOpenChange, onPickLocal, onPickShared }: Props) {
  const { profile } = usePlannerProfile();
  const [local, setLocal] = useState<LocalCourse[]>([]);
  const [shared, setShared] = useState<MyCourseRow[]>([]);
  /** profil-id vars banor hämtats klart — låter oss härleda loading. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [sharedError, setSharedError] = useState(false);
  /** Ökas för att köra om hämtningen ("Försök igen"). */
  const [sharedFetchNonce, setSharedFetchNonce] = useState(0);
  /** Tvåstegsbekräftelse för radering. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteSharedId, setConfirmDeleteSharedId] = useState<string | null>(null);

  // Läs in lokala banor när dialogen öppnas — justering under render i
  // stället för synkron setState i en effekt.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLocal(listLocalCourses());
      setConfirmDeleteId(null);
      setConfirmDeleteSharedId(null);
      setSharedError(false);
    }
  }

  const loading = open && !!profile && loadedFor !== profile.id && !sharedError;

  useEffect(() => {
    if (!open || !profile) return;
    let cancelled = false;
    plannerApi<{ courses: MyCourseRow[] }>("my-courses")
      .then((res) => {
        if (cancelled) return;
        setShared(res.courses ?? []);
        setSharedError(false);
        setLoadedFor(profile.id);
      })
      .catch(() => {
        if (cancelled) return;
        setShared([]);
        setSharedError(true);
        setLoadedFor(profile.id);
      });
    return () => { cancelled = true; };
  }, [open, profile, sharedFetchNonce]);

  const retryShared = () => {
    setLoadedFor(null);
    setSharedError(false);
    setSharedFetchNonce((n) => n + 1);
  };

  const removeLocal = (id: string) => {
    deleteLocalCourse(id);
    setLocal(listLocalCourses());
    setConfirmDeleteId(null);
  };

  const removeShared = async (id: string) => {
    try {
      await plannerApi("delete-course", { courseId: id });
      setShared((rows) => rows.filter((r) => r.id !== id));
      toast.success("Borttagen");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Kunde inte ta bort");
    } finally {
      setConfirmDeleteSharedId(null);
    }
  };

  // Mappa planner-social-raden till LibraryCourse-formen som planeraren
  // redan kan öppna (draftFromLibraryCourse läser bara name/course_data/id).
  const pickShared = (row: MyCourseRow) => {
    onPickShared({
      id: row.id,
      user_id: "",
      name: row.name,
      description: "",
      course_data: row.course_data as LibraryCourse["course_data"],
      created_at: row.updated_at,
      updated_at: row.updated_at,
      is_public: row.is_public,
    } as LibraryCourse);
  };

  const empty = !loading && !sharedError && local.length === 0 && shared.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-2 border-ink bg-paper sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Öppna bana</DialogTitle>
          <DialogDescription>
            Dina sparade banor — senast ändrad först.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="flex items-center gap-2 text-sm font-semibold text-ink/60" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Hämtar banor…
          </p>
        )}

        {sharedError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-ember/40 bg-ember/10 p-3" role="alert">
            <p className="text-sm font-semibold text-ink/70">
              Kunde inte hämta banorna på din profil.
            </p>
            <button
              type="button"
              onClick={retryShared}
              className="shrink-0 rounded-lg border-2 border-ink/20 bg-paper px-3 py-1.5 text-xs font-bold transition-colors hover:border-ink"
            >
              Försök igen
            </button>
          </div>
        )}

        {empty && (
          <p className="rounded-xl border-2 border-dashed border-ink/20 p-4 text-sm font-semibold text-ink/60">
            Du har inga sparade banor än. Bygg klart en bana och välj <strong>Spara</strong> i bana-menyn.
          </p>
        )}

        {local.length > 0 && (
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50">
              <HardDrive className="h-3.5 w-3.5" aria-hidden="true" /> På den här enheten
            </p>
            <ul className="space-y-2">
              {local.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onPickLocal(c)}
                    className="min-h-11 flex-1 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-left transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                  >
                    <span className="block text-sm font-bold">{c.name}</span>
                    <span className="block text-xs font-semibold text-ink/60">
                      {c.obstacleCount} hinder · {c.sport} · {when(c.updatedAt)}
                    </span>
                  </button>
                  {confirmDeleteId === c.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => removeLocal(c.id)}
                        className="min-h-11 rounded-xl border-2 border-ember bg-ember px-3 text-xs font-bold text-paper"
                      >
                        Ta bort?
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        aria-label={`Behåll ${c.name}`}
                        className="min-h-11 rounded-xl border-2 border-ink/15 px-3 text-xs font-bold text-ink/60 hover:border-ink"
                      >
                        Behåll
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      aria-label={`Ta bort ${c.name}`}
                      title={`Ta bort ${c.name}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink/15 text-ink/60 transition-colors hover:border-ember hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {shared.length > 0 && (
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50">
              <CloudCheck className="h-3.5 w-3.5" aria-hidden="true" /> På din profil
            </p>
            <ul className="space-y-2">
              {shared.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <button
                    onClick={() => pickShared(c)}
                    className="min-h-11 flex-1 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-left transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span className="truncate">{c.name}</span>
                      {!c.is_public && (
                        <span className="shrink-0 rounded-full border border-ink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">
                          Privat
                        </span>
                      )}
                    </span>
                    <span className="block text-xs font-semibold text-ink/60">
                      {c.sport} · {when(c.updated_at)}
                    </span>
                  </button>
                  {confirmDeleteSharedId === c.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => removeShared(c.id)}
                        className="min-h-11 rounded-xl border-2 border-ember bg-ember px-3 text-xs font-bold text-paper"
                      >
                        Ta bort?
                      </button>
                      <button
                        onClick={() => setConfirmDeleteSharedId(null)}
                        aria-label={`Behåll ${c.name}`}
                        className="min-h-11 rounded-xl border-2 border-ink/15 px-3 text-xs font-bold text-ink/60 hover:border-ink"
                      >
                        Behåll
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteSharedId(c.id)}
                      aria-label={`Ta bort ${c.name}`}
                      title={`Ta bort ${c.name}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink/15 text-ink/60 transition-colors hover:border-ember hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!profile && !loading && (
          <p className="rounded-xl border-2 border-ink/10 bg-cream/40 p-3 text-xs font-semibold leading-5 text-ink/60">
            Med en profil kan du även spara banor här och dela dem publikt — välj <strong>Spara &amp; dela</strong> i verktygsraden.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
