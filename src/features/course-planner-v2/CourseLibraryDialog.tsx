/**
 * Banbibliotek för den riktiga V2-planeraren.
 *
 * Färdiga banor är gratis och kan filtreras/sökas utan konto. Molnbanor och
 * klubbdelning visas i samma dialog men kräver inloggning där data faktiskt
 * är användarspecifik.
 */
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Cloud, Loader2, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyCourses, fetchClubCourses, fetchMyClubs, deleteCourse,
  type LibraryCourse,
} from "@/features/course-planner-v2/library";
import { PREBUILT_COURSES, type PrebuiltCourse } from "@/features/course-planner-v2/templates";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (kind: "prebuilt" | "saved", payload: PrebuiltCourse | LibraryCourse) => void;
}

type Tab = "prebuilt" | "mine" | "clubs";
type SportFilter = "all" | "agility" | "hoopers";
type ClassFilter = "all" | "1" | "2" | "3";

function classNumber(course: PrebuiltCourse): "1" | "2" | "3" | null {
  if (course.classTemplate === "agility_1" || course.classTemplate === "agility_hopp_1") return "1";
  if (course.classTemplate === "agility_2" || course.classTemplate === "agility_hopp_2") return "2";
  if (course.classTemplate === "agility_3" || course.classTemplate === "agility_hopp_3") return "3";
  return null;
}

function disciplineLabel(course: PrebuiltCourse): string {
  if (course.sport === "hoopers") return "Hoopers";
  if (course.classTemplate.startsWith("agility_hopp")) return "Hoppklass";
  return "Agilityklass";
}

function numberedCount(course: PrebuiltCourse): number {
  return course.obstacles.filter((o) => o.number != null).length;
}

export default function CourseLibraryDialog({ open, onOpenChange, onPick }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("prebuilt");
  const [mine, setMine] = useState<LibraryCourse[]>([]);
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [activeClub, setActiveClub] = useState<string | null>(null);
  const [clubCourses, setClubCourses] = useState<LibraryCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<SportFilter>("all");
  const [courseClass, setCourseClass] = useState<ClassFilter>("all");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    Promise.all([fetchMyCourses(user.id), fetchMyClubs(user.id)])
      .then(([m, c]) => {
        setMine(m);
        setClubs(c);
        if (c[0] && !activeClub) setActiveClub(c[0].id);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Kunde inte ladda biblioteket");
      })
      .finally(() => setLoading(false));
  }, [open, user, activeClub]);

  useEffect(() => {
    if (!open || !activeClub) return;
    fetchClubCourses(activeClub).then(setClubCourses).catch((e) => {
      console.error(e);
      toast.error("Kunde inte ladda klubbens banor");
    });
  }, [activeClub, open]);

  const filteredPrebuilt = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("sv-SE");
    return PREBUILT_COURSES.filter((course) => {
      if (sport !== "all" && course.sport !== sport) return false;
      if (courseClass !== "all" && classNumber(course) !== courseClass) return false;
      if (!needle) return true;
      const haystack = [
        course.label,
        course.description,
        disciplineLabel(course),
        ...(course.focus ?? []),
      ].join(" ").toLocaleLowerCase("sv-SE");
      return haystack.includes(needle);
    });
  }, [query, sport, courseClass]);

  async function handleDelete(c: LibraryCourse) {
    if (!confirm(`Ta bort "${c.name}" från ditt bibliotek?`)) return;
    try {
      await deleteCourse(c.id);
      setMine((m) => m.filter((x) => x.id !== c.id));
      toast.success("Borttagen");
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte ta bort");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-3 sm:p-4" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h2 className="text-base font-semibold">Banbibliotek</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Öppna en färdig bana som egen kopia och ändra den direkt i V2-planeraren.</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Stäng banbibliotek"><X size={16} /></button>
        </header>

        <div className="flex border-b border-border">
          {([
            { key: "prebuilt", label: `Färdiga banor (${PREBUILT_COURSES.length})`, icon: BookOpen },
            { key: "mine", label: "Mina banor", icon: Cloud },
            { key: "clubs", label: "Klubbens banor", icon: Users },
          ] as { key: Tab; label: string; icon: typeof BookOpen }[]).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition sm:px-4 sm:text-[13px]",
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={14} /> <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "prebuilt" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground"><ShieldCheck size={15} className="text-primary" /> Svenska klassbanor kvalitetskontrolleras i CI</div>
                <p className="mt-1">Märkningen gäller våra egna klass 1–3-banor för agility och hopp. Regler som kräver fysisk bedömning på plats måste fortfarande verifieras av domare/arrangör.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="relative block">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Sök t.ex. slalom, kontaktfält, flow…"
                    className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </label>
                <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {(["all", "agility", "hoopers"] as SportFilter[]).map((value) => (
                    <button
                      key={value}
                      onClick={() => setSport(value)}
                      className={cn(
                        "h-10 shrink-0 rounded-xl border px-3 text-xs font-semibold transition",
                        sport === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {value === "all" ? "Alla" : value === "agility" ? "Agility" : "Hoopers"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Klass</span>
                {(["all", "1", "2", "3"] as ClassFilter[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setCourseClass(value)}
                    className={cn(
                      "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition",
                      courseClass === value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "all" ? "Alla klasser" : `Klass ${value}`}
                  </button>
                ))}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{filteredPrebuilt.length} banor</span>
              </div>

              {filteredPrebuilt.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Inga banor matchar filtren.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredPrebuilt.map((p) => {
                    const cls = classNumber(p);
                    const verified = p.qualityLabel?.startsWith("Kontrollerad") ?? false;
                    return (
                      <button
                        key={p.key}
                        onClick={() => { onPick("prebuilt", p); onOpenChange(false); }}
                        className="group text-left rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/35 hover:bg-primary/[0.025] hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-5 text-foreground">{p.label}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{disciplineLabel(p)}</span>
                              {cls && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Klass {cls}</span>}
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{numberedCount(p)} passager</span>
                            </div>
                          </div>
                          {verified ? <ShieldCheck size={17} className="shrink-0 text-primary" aria-label="Regelkontrollerad" /> : <CheckCircle2 size={17} className="shrink-0 text-muted-foreground" />}
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">{p.description}</p>
                        {p.focus && p.focus.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {p.focus.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>)}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                          <span>{p.arenaWidthM} × {p.arenaHeightM} m</span>
                          <span className="font-semibold text-primary group-hover:underline">Öppna & redigera</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "mine" && (
            user ? (
              loading ? <div className="grid place-items-center p-8 text-muted-foreground"><Loader2 className="animate-spin" /></div>
                : mine.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Du har inga molnsparade banor än. Banor du ritar utan konto sparas lokalt på enheten.</div>
                  : <div className="grid gap-2">
                    {mine.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-xl border border-border p-3 transition hover:border-primary/30">
                        <button onClick={() => { onPick("saved", c); onOpenChange(false); }} className="flex-1 text-left">
                          <div className="text-sm font-semibold">{c.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">Senast ändrad {new Date(c.updated_at).toLocaleDateString("sv-SE")}</div>
                        </button>
                        <button onClick={() => handleDelete(c)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Ta bort"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
            ) : <div className="p-8 text-center text-sm text-muted-foreground">Logga in när du vill synka egna banor mellan enheter. De färdiga banorna ovan är öppna utan konto.</div>
          )}

          {tab === "clubs" && (
            user ? (
              clubs.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Du är inte medlem i någon klubb.</div>
                : <>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {clubs.map((c) => (
                      <button key={c.id} onClick={() => setActiveClub(c.id)}
                        className={cn(
                          "h-8 rounded-full border px-3 text-xs font-semibold",
                          activeClub === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
                        )}>{c.name}</button>
                    ))}
                  </div>
                  {clubCourses.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Inga banor delade i denna klubb än.</div>
                    : <div className="grid gap-2">
                      {clubCourses.map((c) => (
                        <button key={c.id} onClick={() => { onPick("saved", c); onOpenChange(false); }}
                          className="rounded-xl border border-border p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.025]">
                          <div className="text-sm font-semibold">{c.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">Delad {new Date(c.created_at).toLocaleDateString("sv-SE")}</div>
                        </button>
                      ))}
                    </div>}
                </>
            ) : <div className="p-8 text-center text-sm text-muted-foreground">Logga in för att se banor som har delats i dina klubbar.</div>
          )}
        </div>
      </div>
    </div>
  );
}
