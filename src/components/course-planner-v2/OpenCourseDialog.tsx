/**
 * Banplaneraren — dialog för att öppna en tidigare sparad bana.
 *
 * Visar lokalt sparade banor (fungerar utan konto) och, om användaren är
 * inloggad, banor sparade på kontot.
 */
import { useEffect, useState } from "react";
import { Cloud, HardDrive, Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { fetchMyCourses, type LibraryCourse } from "@/features/course-planner-v2/library";
import { listLocalCourses, deleteLocalCourse, type LocalCourse } from "@/features/course-planner-v2/localCourses";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string | null;
  onPickLocal: (course: LocalCourse) => void;
  onPickCloud: (course: LibraryCourse) => void;
}

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function OpenCourseDialog({ open, onOpenChange, userId, onPickLocal, onPickCloud }: Props) {
  const [local, setLocal] = useState<LocalCourse[]>([]);
  const [cloud, setCloud] = useState<LibraryCourse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLocal(listLocalCourses());
    if (!userId) { setCloud([]); return; }
    let cancelled = false;
    setLoading(true);
    void fetchMyCourses(userId)
      .then((rows) => { if (!cancelled) setCloud(rows); })
      .catch(() => { if (!cancelled) setCloud([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, userId]);

  const empty = !loading && local.length === 0 && cloud.length === 0;

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
          <p className="flex items-center gap-2 text-sm font-semibold text-ink/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Hämtar banor…
          </p>
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
                    className="min-h-11 flex-1 rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-left transition-colors hover:border-ink"
                  >
                    <span className="block text-sm font-bold">{c.name}</span>
                    <span className="block text-xs font-semibold text-ink/60">
                      {c.obstacleCount} hinder · {c.sport} · {when(c.updatedAt)}
                    </span>
                  </button>
                  <button
                    onClick={() => { deleteLocalCourse(c.id); setLocal(listLocalCourses()); }}
                    aria-label={`Ta bort ${c.name}`}
                    title={`Ta bort ${c.name}`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink/15 text-ink/60 transition-colors hover:border-ember hover:text-ember"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {cloud.length > 0 && (
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/50">
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" /> På ditt konto
            </p>
            <ul className="space-y-2">
              {cloud.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onPickCloud(c)}
                    className="min-h-11 w-full rounded-xl border-2 border-ink/15 bg-white px-3 py-2 text-left transition-colors hover:border-ink"
                  >
                    <span className="block text-sm font-bold">{c.name}</span>
                    <span className="block text-xs font-semibold text-ink/60">{when(c.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
