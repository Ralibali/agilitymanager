/**
 * Sprint 5 — Banbibliotek-dialog
 * Visar fördefinierade banor + egna sparade + klubb-delade.
 */
import { useEffect, useState } from "react";
import { X, BookOpen, Cloud, Users, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyCourses, fetchClubCourses, fetchMyClubs, deleteCourse,
  type LibraryCourse,
} from "@/features/course-planner-v2/library";
import { PREBUILT_COURSES, type PrebuiltCourse } from "@/features/course-planner-v2/templates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse) => void;
}

type Tab = "prebuilt" | "mine" | "clubs";

export default function CourseLibraryDialog({ open, onOpenChange, onPick }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("prebuilt");
  const [mine, setMine] = useState<LibraryCourse[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [activeClub, setActiveClub] = useState<string | null>(null);
  const [clubCourses, setClubCourses] = useState<LibraryCourse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([fetchMyCourses(user.id), fetchMyClubs(user.id)])
      .then(([m, c]) => { setMine(m); setClubs(c); if (c[0] && !activeClub) setActiveClub(c[0].id); })
      .catch((e) => { console.error(e); toast.error("Kunde inte ladda biblioteket"); })
      .finally(() => setLoading(false));
  }, [open, user, activeClub]);

  useEffect(() => {
    if (!open || !activeClub) return;
    fetchClubCourses(activeClub).then(setClubCourses).catch((e) => {
      console.error(e); toast.error("Kunde inte ladda klubbens banor");
    });
  }, [activeClub, open]);

  async function handleDelete(c: LibraryCourse) {
    if (!confirm(`Ta bort "${c.name}" från ditt bibliotek?`)) return;
    try { await deleteCourse(c.id); setMine((m) => m.filter((x) => x.id !== c.id)); toast.success("Borttagen"); }
    catch (e) { console.error(e); toast.error("Kunde inte ta bort"); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <div className="flex items-center gap-2"><BookOpen size={18} className="text-[#1a6b3c]" /><h2 className="text-base font-semibold">Banbibliotek</h2></div>
          <button onClick={() => onOpenChange(false)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-neutral-100"><X size={16} /></button>
        </header>
        <div className="flex border-b border-black/5">
          {([
            { key: "prebuilt", label: "Färdiga banor", icon: BookOpen },
            { key: "mine",     label: "Mina banor",   icon: Cloud },
            { key: "clubs",    label: "Klubbens banor", icon: Users },
          ] as { key: Tab; label: string; icon: any }[]).map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 px-4 py-2.5 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 border-b-2 transition ${
                  tab === t.key ? "border-[#1a6b3c] text-[#1a6b3c]" : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "prebuilt" && (
            <div className="grid gap-2">
              {PREBUILT_COURSES.map((p) => (
                <button key={p.key} onClick={() => { onPick("prebuilt", p); onOpenChange(false); }}
                  className="text-left p-3 rounded-xl border border-black/8 hover:border-[#1a6b3c]/40 hover:bg-[#1a6b3c]/5 transition">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[14px]">{p.label}</div>
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-[#c85d1e]">{p.sport}</span>
                  </div>
                  <div className="text-[12px] text-neutral-600 mt-1">{p.description}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">{p.arenaWidthM}×{p.arenaHeightM} m · {p.obstacles.length} hinder</div>
                </button>
              ))}
            </div>
          )}

          {tab === "mine" && (
            user ? (
              loading ? <div className="grid place-items-center p-8 text-neutral-500"><Loader2 className="animate-spin" /></div>
              : mine.length === 0 ? <div className="text-center p-8 text-sm text-neutral-500">Du har inga sparade banor än.</div>
              : <div className="grid gap-2">
                  {mine.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-3 rounded-xl border border-black/8 hover:border-[#1a6b3c]/40 transition">
                      <button onClick={() => { onPick("saved", c); onOpenChange(false); }} className="flex-1 text-left">
                        <div className="font-semibold text-[14px]">{c.name}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">Senast ändrad {new Date(c.updated_at).toLocaleDateString("sv-SE")}</div>
                      </button>
                      <button onClick={() => handleDelete(c)} className="h-8 w-8 grid place-items-center rounded-full text-neutral-400 hover:text-red-600 hover:bg-red-50" title="Ta bort"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
            ) : <div className="text-center p-8 text-sm text-neutral-500">Logga in för att se dina sparade banor.</div>
          )}

          {tab === "clubs" && (
            user ? (
              clubs.length === 0 ? <div className="text-center p-8 text-sm text-neutral-500">Du är inte medlem i någon klubb.</div>
              : <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {clubs.map((c) => (
                    <button key={c.id} onClick={() => setActiveClub(c.id)}
                      className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${
                        activeClub === c.id ? "bg-[#1a6b3c] text-white border-[#1a6b3c]" : "bg-white border-black/10 hover:border-neutral-400"
                      }`}>{c.name}</button>
                  ))}
                </div>
                {clubCourses.length === 0 ? <div className="text-center p-8 text-sm text-neutral-500">Inga banor delade i denna klubb än.</div>
                : <div className="grid gap-2">
                  {clubCourses.map((c) => (
                    <button key={c.id} onClick={() => { onPick("saved", c); onOpenChange(false); }}
                      className="text-left p-3 rounded-xl border border-black/8 hover:border-[#1a6b3c]/40 hover:bg-[#1a6b3c]/5 transition">
                      <div className="font-semibold text-[14px]">{c.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">Delad {new Date(c.created_at).toLocaleDateString("sv-SE")}</div>
                    </button>
                  ))}
                </div>}
              </>
            ) : <div className="text-center p-8 text-sm text-neutral-500">Logga in för att se klubbens banor.</div>
          )}
        </div>
      </div>
    </div>
  );
}
