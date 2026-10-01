import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  Plus,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import { listLocalCourses } from "@/features/course-planner-v2/localCourses";
import {
  loadTraining,
  parseSession,
  parseTrainingFile,
  saveTraining,
  serializeTraining,
  sessionText,
  TRAINING_KEY,
  type TrainingSession,
} from "@/features/training/trainingPlans";

const inputClass =
  "mt-2 w-full rounded-xl border border-ink/25 bg-white px-3 py-2.5 text-base focus:outline-2 focus:outline-forest";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink px-5 py-2.5 font-bold disabled:opacity-40";
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function blankSession(
  course: TrainingSession["course"] = null
): TrainingSession {
  return {
    id: crypto.randomUUID(),
    title: "",
    dog: "",
    date: localToday(),
    goal: "",
    course,
    completed: false,
    reflection: "",
    nextStep: "",
    videoUrl: "",
  };
}
function download(text: string, name: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function TrainingPage() {
  const [params] = useSearchParams();
  const [initial] = useState(() => {
    try {
      return { sessions: loadTraining(), error: "" };
    } catch {
      return {
        sessions: [],
        error:
          "Dina sparade pass kunde inte läsas. Exportera den sparade filen innan du återställer. Inget har skrivits över.",
      };
    }
  });
  const [sessions, setSessions] = useState(initial.sessions);
  const [storageError, setStorageError] = useState(initial.error);
  const courses = useMemo(
    () => [
      ...COURSE_BANK.filter((c) => c.bankKind === "original").map((c) => ({
        name: c.label,
        href: `/banplanerare?template=${encodeURIComponent(c.key)}`,
      })),
      ...listLocalCourses().map((c) => ({
        name: c.name,
        href: `/banplanerare?bana=${btoa(
          unescape(encodeURIComponent(JSON.stringify(c.data)))
        )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "")}`,
      })),
    ],
    []
  );
  const initialCourse =
    courses.find(
      (c) =>
        c.href ===
        `/banplanerare?template=${encodeURIComponent(
          params.get("template") ?? ""
        )}`
    ) ?? null;
  const [draft, setDraft] = useState<TrainingSession | null>(() =>
    initialCourse ? blankSession(initialCourse) : null
  );
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<"all" | "planned" | "done">("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLFormElement>(null);
  const snapshot = useRef(serializeTraining(initial.sessions));
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);
  const persist = (next: TrainingSession[]) => {
    if (storageError) return false;
    try {
      // Never silently replace changes saved from another open tab.
      if (serializeTraining(loadTraining()) !== snapshot.current)
        throw new Error(
          "Passen har ändrats i en annan flik. Exportera dina pass och ladda sedan om sidan."
        );
      saveTraining(next);
      snapshot.current = serializeTraining(next);
      setSessions(next);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunde inte spara.");
      return false;
    }
  };
  const openDraft = (value: TrainingSession) => {
    if (dirty && !window.confirm("Lämna de osparade ändringarna?")) return;
    setDraft({ ...value });
    setDirty(false);
    window.setTimeout(
      () =>
        editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0
    );
  };
  const change = <K extends keyof TrainingSession>(
    key: K,
    value: TrainingSession[K]
  ) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  };
  const displayed = sessions
    .filter(
      (s) =>
        filter === "all" || (filter === "done" ? s.completed : !s.completed)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const pending = sessions.filter((s) => !s.completed).length;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Träningsplan | AgilityManager"
        description="Planera agilitypass med en bana och ett tydligt mål. Följ upp träningen och spara nästa steg."
        canonicalPath="/traning"
        noIndex
      />
      <div className="print:hidden">
        <SiteNav />
      </div>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-36 sm:px-6">
        <p className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-forest">
          <CalendarDays size={18} /> Från bana till träning
        </p>
        <h1 className="mt-4 font-display text-5xl sm:text-7xl">
          Ett mål för varje pass.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink/70">
          Välj bana, planera vad ni ska öva och skriv ner vad som fungerade.
          Nästa pass börjar där det förra slutade.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink/60">
          Sparas i den här webbläsaren utan konto. Exportera en säkerhetskopia
          för att flytta passen till en annan enhet. Film delas bara som länk.
        </p>
        <div className="my-7 flex flex-wrap gap-3 print:hidden">
          <button
            className={`${buttonClass} bg-tang`}
            disabled={Boolean(storageError)}
            onClick={() => openDraft(blankSession())}
          >
            <Plus size={18} /> Nytt träningspass
          </button>
          <button
            className={buttonClass}
            disabled={!sessions.length}
            onClick={() =>
              download(serializeTraining(sessions), "agility-traningspass.json")
            }
          >
            <Download size={18} /> Exportera pass
          </button>
          <button
            className={buttonClass}
            disabled={Boolean(storageError)}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={18} /> Importera pass
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="Importera träningsfil"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                if (file.size > 3_000_000)
                  throw new Error("Filen är för stor. Högst 3 MB.");
                const added = parseTrainingFile(await file.text()).map((s) => ({
                  ...s,
                  id: crypto.randomUUID(),
                }));
                if (persist([...sessions, ...added]))
                  toast.success(`${added.length} pass importerade som kopior.`);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Kunde inte läsa filen."
                );
              }
            }}
          />
        </div>
        {storageError && (
          <div
            role="alert"
            className="my-6 rounded-2xl border-2 border-ink bg-tang/20 p-5"
          >
            <p>{storageError}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className={buttonClass}
                onClick={() => {
                  try {
                    download(
                      localStorage.getItem(TRAINING_KEY) ?? "",
                      "agility-traning-aterstallning.json"
                    );
                  } catch {
                    toast.error("Lagringen kunde inte läsas.");
                  }
                }}
              >
                Exportera sparad fil
              </button>
              <button
                className={buttonClass}
                onClick={() => {
                  if (
                    window.confirm(
                      "Återställ träningsplaneringen? Den sparade filen tas bort. Exportera den först."
                    )
                  ) {
                    try {
                      localStorage.removeItem(TRAINING_KEY);
                      setStorageError("");
                      snapshot.current = serializeTraining([]);
                    } catch {
                      toast.error("Kunde inte återställa.");
                    }
                  }
                }}
              >
                Återställ
              </button>
            </div>
          </div>
        )}
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section aria-label="Sparade träningspass">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">
                {pending} planerade · {sessions.length - pending} genomförda
              </h2>
              <select
                className="rounded-lg border border-ink/30 bg-paper p-2"
                aria-label="Filtrera träningspass"
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
              >
                <option value="all">Alla pass</option>
                <option value="planned">Planerade</option>
                <option value="done">Genomförda</option>
              </select>
            </div>
            {!displayed.length && (
              <div className="rounded-2xl border-2 border-dashed border-ink/25 p-8">
                <p className="font-bold">
                  {sessions.length
                    ? "Inga pass matchar filtret."
                    : "Börja med det ni vill bli bättre på."}
                </p>
                <p className="mt-2 text-ink/65">
                  Till exempel: en lugn start, en tydlig sväng eller en säker
                  slalomingång. Välj sedan en bana som passar målet.
                </p>
                <Link
                  to="/banor"
                  className="mt-4 inline-block font-bold underline"
                >
                  Hitta en bana i biblioteket
                </Link>
              </div>
            )}
            <div className="space-y-4">
              {displayed.map((s) => (
                <article
                  key={s.id}
                  className="rounded-2xl border-2 border-ink bg-white p-5 shadow-hard-sm"
                >
                  <p className="text-sm text-ink/60">
                    {s.date}
                    {s.dog && ` · ${s.dog}`} ·{" "}
                    {s.completed ? "Genomfört" : "Planerat"}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words">
                    {s.goal}
                  </p>
                  {s.course && (
                    <Link
                      className="mt-3 inline-block font-semibold underline"
                      to={s.course.href}
                    >
                      Öppna {s.course.name}
                    </Link>
                  )}
                  {s.nextStep && (
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                      <strong>Nästa steg:</strong> {s.nextStep}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 print:hidden">
                    <button
                      className={`${buttonClass} bg-paper`}
                      onClick={() => openDraft(s)}
                    >
                      {s.completed
                        ? "Visa och redigera"
                        : "Följ upp / redigera"}
                    </button>
                    <button
                      className="font-bold underline"
                      onClick={() =>
                        openDraft({
                          ...blankSession(s.course),
                          title: s.title,
                          dog: s.dog,
                          goal: s.nextStep || s.goal,
                        })
                      }
                    >
                      Planera nästa pass
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {draft ? (
            <form
              ref={editor}
              className="scroll-mt-32 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7"
              onSubmit={(e) => {
                e.preventDefault();
                const valid = parseSession(draft);
                if (!valid) {
                  toast.error(
                    "Kontrollera titel, mål, datum och eventuell filmlänk (https)."
                  );
                  return;
                }
                const next = sessions.some((s) => s.id === valid.id)
                  ? sessions.map((s) => (s.id === valid.id ? valid : s))
                  : [...sessions, valid];
                if (persist(next)) {
                  setDraft(valid);
                  setDirty(false);
                  toast.success("Träningspasset är sparat i webbläsaren.");
                }
              }}
            >
              <h2 className="text-2xl font-bold">
                {sessions.some((s) => s.id === draft.id)
                  ? "Ditt träningspass"
                  : "Planera ett pass"}
              </h2>
              <p role="status" className="mt-2 text-sm text-ink/60">
                {dirty
                  ? "Osparade ändringar"
                  : sessions.some((s) => s.id === draft.id)
                  ? "Sparat i den här webbläsaren"
                  : "Fyll i och spara passet"}
              </p>
              <label className="mt-5 block font-semibold">
                Passets namn
                <input
                  required
                  maxLength={120}
                  className={inputClass}
                  value={draft.title}
                  onChange={(e) => change("title", e.target.value)}
                  placeholder="Till exempel: trygg slalomingång"
                />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="font-semibold">
                  Datum
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={draft.date}
                    onChange={(e) => change("date", e.target.value)}
                  />
                </label>
                <label className="font-semibold">
                  Hund / ekipage
                  <input
                    maxLength={80}
                    className={inputClass}
                    value={draft.dog}
                    onChange={(e) => change("dog", e.target.value)}
                    placeholder="Valfritt"
                  />
                </label>
              </div>
              <label className="mt-4 block font-semibold">
                Mål för passet
                <textarea
                  required
                  maxLength={2000}
                  rows={3}
                  className={inputClass}
                  value={draft.goal}
                  onChange={(e) => change("goal", e.target.value)}
                  placeholder="Vad ska ni öva och hur märker du att det fungerar?"
                />
              </label>
              <label className="mt-4 block font-semibold">
                Bana
                <select
                  className={inputClass}
                  value={draft.course?.href ?? ""}
                  onChange={(e) =>
                    change(
                      "course",
                      courses.find((c) => c.href === e.target.value) ?? null
                    )
                  }
                >
                  <option value="">Ingen bana vald</option>
                  {draft.course &&
                    !courses.some((c) => c.href === draft.course?.href) && (
                      <option value={draft.course.href}>
                        {draft.course.name}
                      </option>
                    )}
                  {courses.map((c) => (
                    <option key={c.href} value={c.href}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {draft.course && (
                <Link
                  target="_blank"
                  rel="noopener noreferrer"
                  to={draft.course.href}
                  className="mt-2 inline-block text-sm font-semibold underline"
                >
                  Öppna banan
                </Link>
              )}
              <div className="mt-6 border-t border-ink/15 pt-5">
                <h3 className="font-bold text-lg">Efter passet</h3>
                <label className="mt-4 flex items-center gap-3 font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-forest"
                    checked={draft.completed}
                    onChange={(e) => change("completed", e.target.checked)}
                  />{" "}
                  Passet är genomfört
                </label>
                <label className="mt-4 block font-semibold">
                  Vad fungerade? Vad behöver ändras?
                  <textarea
                    rows={3}
                    maxLength={3000}
                    className={inputClass}
                    value={draft.reflection}
                    onChange={(e) => change("reflection", e.target.value)}
                  />
                </label>
                <label className="mt-4 block font-semibold">
                  Nästa steg
                  <textarea
                    rows={2}
                    maxLength={2000}
                    className={inputClass}
                    value={draft.nextStep}
                    onChange={(e) => change("nextStep", e.target.value)}
                  />
                </label>
                <label className="mt-4 block font-semibold">
                  Länk till träningsfilm
                  <input
                    type="url"
                    maxLength={2000}
                    placeholder="https://… (valfritt)"
                    className={inputClass}
                    value={draft.videoUrl}
                    onChange={(e) => change("videoUrl", e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                <button
                  type="submit"
                  disabled={Boolean(storageError)}
                  className={`${buttonClass} bg-forest text-paper`}
                >
                  <Check size={18} /> Spara pass
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={async () => {
                    const valid = parseSession(draft);
                    if (!valid) {
                      toast.error("Fyll i namn, datum och mål först.");
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(sessionText(valid));
                      toast.success(
                        "Passet är kopierat. Klistra in hos din tränare."
                      );
                    } catch {
                      download(
                        sessionText(valid),
                        "traningspass.txt",
                        "text/plain"
                      );
                    }
                  }}
                >
                  <Copy size={18} /> Kopiera till tränaren
                </button>
              </div>
              {sessions.some((s) => s.id === draft.id) && (
                <button
                  type="button"
                  className="mt-5 text-sm underline print:hidden"
                  onClick={() => {
                    if (
                      window.confirm("Ta bort det här träningspasset?") &&
                      persist(sessions.filter((s) => s.id !== draft.id))
                    ) {
                      setDraft(null);
                      setDirty(false);
                      toast.success("Passet är borttaget.");
                    }
                  }}
                >
                  Ta bort passet
                </button>
              )}
            </form>
          ) : (
            <aside className="rounded-3xl bg-forest p-7 text-paper">
              <h2 className="font-display text-3xl">
                Träna. Anteckna. Bygg vidare.
              </h2>
              <ol className="mt-5 list-inside list-decimal space-y-3">
                <li>Välj ett tydligt mål och en bana.</li>
                <li>Anteckna efter passet, medan du minns.</li>
                <li>Låt nästa steg bli målet för nästa pass.</li>
              </ol>
              <p className="mt-5 text-sm text-paper/75">
                Du kan kopiera ett pass till din tränare och lägga in
                återkopplingen här. Inga uppgifter skickas automatiskt.
              </p>
            </aside>
          )}
        </div>
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
