import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowRight, Check, Medal, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { profileLabel, useDogProfile, type SavedDogProfile } from "@/lib/dogMatch";
import {
  DISCIPLINES,
  isClean,
  levelsFor,
  meritProgress,
  newResultId,
  nextLevel,
  ordinal,
  statsFor,
  useDogResults,
  type Discipline,
  type RunResult,
} from "@/lib/dogResults";
import { fmtDate } from "@/lib/format";

const inputClass =
  "w-full rounded-2xl border-2 border-ink/15 bg-paper px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/45";

const RULES_URL = "https://agilityklubben.se/regler/";

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function disciplineLabel(d: Discipline): string {
  return DISCIPLINES.find((x) => x.value === d)?.label ?? d;
}

function defaultLevel(dog: SavedDogProfile | undefined, discipline: Discipline): string {
  if (!dog) return levelsFor(discipline)[1];
  return discipline === "hoopers" ? dog.hoopersLevel : dog.agilityLevel;
}

/** Formulärets fält som text, så att tomma fält kan skiljas från 0. */
interface Draft {
  id: string | null;
  date: string;
  competitionName: string;
  competitionKey: string;
  discipline: Discipline;
  level: string;
  faults: string;
  timeSec: string;
  placement: string;
  starters: string;
  disqualified: boolean;
  merit: boolean;
  judge: string;
  notes: string;
}

function emptyDraft(dog: SavedDogProfile | undefined, patch: Partial<Draft> = {}): Draft {
  const discipline: Discipline = patch.discipline ?? (dog?.sport === "hoopers" ? "hoopers" : "agility");
  return {
    id: null,
    date: today(),
    competitionName: "",
    competitionKey: "",
    discipline,
    level: defaultLevel(dog, discipline),
    faults: "",
    timeSec: "",
    placement: "",
    starters: "",
    disqualified: false,
    merit: false,
    judge: "",
    notes: "",
    ...patch,
  };
}

function draftFromRun(run: RunResult): Draft {
  const str = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));
  return {
    id: run.id,
    date: run.date,
    competitionName: run.competitionName,
    competitionKey: run.competitionKey ?? "",
    discipline: run.discipline,
    level: run.level,
    faults: str(run.faults),
    timeSec: str(run.timeSec),
    placement: str(run.placement),
    starters: str(run.starters),
    disqualified: run.disqualified,
    merit: run.merit,
    judge: run.judge ?? "",
    notes: run.notes ?? "",
  };
}

function parseNum(value: string): number | null {
  const n = Number(value.replace(",", ".").trim());
  return value.trim() === "" || !Number.isFinite(n) ? null : n;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">{label}</p>
      <p className="mt-1 font-display text-5xl leading-none tracking-wide">{value}</p>
      {sub && <p className="mt-1 text-sm font-semibold text-ink/55">{sub}</p>}
    </div>
  );
}

export default function ResultsPage() {
  const { profile, profiles, activeId, select, update } = useDogProfile();
  const { store, save, remove, setMeritTarget } = useDogResults();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Förifyllt formulär när man kommer från en tävlingssida.
  useEffect(() => {
    const name = params.get("tavling");
    if (!name) return;
    const sport = params.get("sport");
    const date = params.get("datum");
    setDraft(
      emptyDraft(profile, {
        competitionName: name.slice(0, 200),
        competitionKey: (params.get("key") ?? "").slice(0, 120),
        ...(sport === "hoopers" ? { discipline: "hoopers" as const, level: profile.hoopersLevel } : {}),
        ...(date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today() ? { date } : {}),
      }),
    );
    setParams({}, { replace: true });
    // Körs bara när parametrarna finns; profilen läses vid det tillfället.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (draft) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [draft?.id, draft === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const runs = useMemo(() => store.results.filter((r) => r.dogId === activeId), [store.results, activeId]);
  const stats = useMemo(() => statsFor(runs), [runs]);
  const progress = useMemo(() => meritProgress(runs, store.meritTarget), [runs, store.meritTarget]);
  const knownCompetitions = useMemo(
    () => [...new Set(store.results.map((r) => r.competitionName))].slice(0, 50),
    [store.results],
  );
  const dogName = profileLabel(profile, profiles.findIndex((p) => p.id === activeId));

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const faults = parseNum(draft.faults);
    save({
      id: draft.id ?? newResultId(),
      dogId: activeId,
      date: draft.date,
      competitionName: draft.competitionName.trim() || "Tävling",
      ...(draft.competitionKey ? { competitionKey: draft.competitionKey } : {}),
      discipline: draft.discipline,
      level: draft.level,
      faults: draft.disqualified ? null : faults,
      disqualified: draft.disqualified,
      timeSec: parseNum(draft.timeSec),
      placement: draft.disqualified ? null : parseNum(draft.placement),
      starters: parseNum(draft.starters),
      merit: !draft.disqualified && draft.merit,
      ...(draft.judge.trim() ? { judge: draft.judge.trim() } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      updatedAt: 0,
    });
    setDraft(null);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Resultatlogg för agility och hoopers — meriter och uppflyttning | AgilityManager"
        description="Logga dina tävlingslopp i agility, hopp och hoopers. Se felfria lopp, placeringar, bästa tider och hur många meriter som återstår till nästa klass. Gratis, utan konto."
        canonicalPath="/resultat"
      />
      <SiteNav />
      <PageHero kicker="Resultat & meriter" title="Varje lopp räknas.">
        Logga loppen efter tävlingen och se direkt hur det går: felfria lopp, placeringar, bästa tider och
        hur nära ni är nästa klass. Allt sparas i den här webbläsaren — inget konto behövs.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        {/* ── Välj hund ── */}
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {profiles.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p.id)}
                aria-pressed={p.id === activeId}
                className={`min-h-11 rounded-full border-2 px-5 py-2 text-sm font-bold transition-colors ${
                  p.id === activeId
                    ? "border-ink bg-ink text-paper shadow-hard-sm"
                    : "border-ink/15 bg-paper text-ink hover:border-ink"
                }`}
              >
                {profileLabel(p, i)}
              </button>
            ))}
            <Link
              to="/tavlingar"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-forest hover:text-tang"
            >
              Hantera hundar <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!profile.name.trim() && (
            <label className="mt-4 block max-w-sm">
              <span className={labelClass}>Vad heter hunden?</span>
              <input
                className={inputClass}
                placeholder="T.ex. Rio"
                defaultValue=""
                onBlur={(e) => e.target.value.trim() && update({ name: e.target.value.trim().slice(0, 60) })}
              />
            </label>
          )}
        </Reveal>

        {/* ── Statistik ── */}
        <Reveal className="mt-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Starter" value={String(stats.starts)} />
            <StatTile
              label="Felfria"
              value={String(stats.clean)}
              sub={stats.cleanRate === null ? undefined : `${Math.round(stats.cleanRate * 100)} % av loppen`}
            />
            <StatTile label="Pallplatser" value={String(stats.podiums)} sub={stats.wins ? `varav ${stats.wins} segrar` : undefined} />
            <StatTile label="Meriter" value={String(stats.merits)} />
          </div>
        </Reveal>

        {/* ── Mot nästa klass ── */}
        <Reveal className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-4xl tracking-wide">Mot nästa klass</h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink/60">
              Meriter för uppflyttning
              <select
                value={store.meritTarget}
                onChange={(e) => setMeritTarget(Number(e.target.value))}
                className="rounded-full border-2 border-ink/15 bg-paper px-3 py-1.5 font-bold text-ink hover:border-ink"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-ink/55">
            Markera ett lopp som merit när det gav en pinne. Kraven kan ändras mellan regelversioner — kontrollera
            alltid i{" "}
            <a href={RULES_URL} target="_blank" rel="noopener noreferrer" className="text-forest underline hover:text-tang">
              SAgiK:s regler
            </a>
            .
          </p>
          {progress.length === 0 ? (
            <p className="mt-4 rounded-3xl border-2 border-dashed border-ink/20 bg-cream/50 p-6 text-sm font-semibold text-ink/55">
              Här visas meriterna per klass när {dogName} har loggade lopp i klass 1 eller 2 (startklass–klass 2 i
              hoopers).
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {progress.map((p) => {
                const pct = Math.min(1, p.merits / p.target);
                const next = nextLevel(p.discipline, p.level);
                return (
                  <div key={`${p.discipline}|${p.level}`} className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">
                        {disciplineLabel(p.discipline)} · {p.level}
                        {next && <span className="text-ink/45"> → {next}</span>}
                      </p>
                      {p.reached && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-forest px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-paper">
                          <Trophy className="h-3.5 w-3.5" aria-hidden /> Klart
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={p.target}
                      aria-valuenow={Math.min(p.merits, p.target)}
                      aria-label={`${disciplineLabel(p.discipline)} ${p.level}: ${p.merits} av ${p.target} meriter`}
                    >
                      <div className="h-full rounded-full bg-forest transition-all" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink/60">
                      {p.reached
                        ? `${p.merits} meriter — dags att flytta upp${next ? ` till ${next}` : ""}!`
                        : `${p.merits} av ${p.target} meriter — ${p.target - p.merits} kvar`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Reveal>

        {/* ── Logga lopp ── */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-4xl tracking-wide">Loppen</h2>
          {!draft && (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft(profile))}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink bg-tang px-6 py-2.5 text-sm font-bold shadow-hard-sm"
            >
              <Plus className="h-4 w-4" /> Logga lopp
            </button>
          )}
        </div>

        {draft && (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="mt-6 scroll-mt-28 rounded-3xl border-2 border-ink bg-card p-5 shadow-hard sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-extrabold">{draft.id ? "Ändra lopp" : `Nytt lopp för ${dogName}`}</h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Stäng formuläret"
                className="grid h-11 w-11 place-items-center rounded-full text-ink/60 hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block sm:col-span-2">
                <span className={labelClass}>Tävling</span>
                <input
                  required
                  maxLength={200}
                  list="am-known-competitions"
                  value={draft.competitionName}
                  onChange={(e) => set({ competitionName: e.target.value, competitionKey: "" })}
                  placeholder="T.ex. Höstagility i Kungälv"
                  className={inputClass}
                />
                <datalist id="am-known-competitions">
                  {knownCompetitions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <label className="block">
                <span className={labelClass}>Datum</span>
                <input
                  required
                  type="date"
                  max={today()}
                  value={draft.date}
                  onChange={(e) => set({ date: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Domare</span>
                <input maxLength={200} value={draft.judge} onChange={(e) => set({ judge: e.target.value })} className={inputClass} />
              </label>

              <label className="block">
                <span className={labelClass}>Gren</span>
                <select
                  value={draft.discipline}
                  onChange={(e) => {
                    const discipline = e.target.value as Discipline;
                    set({ discipline, level: defaultLevel(profile, discipline) });
                  }}
                  className={inputClass}
                >
                  {DISCIPLINES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Klass</span>
                <select value={draft.level} onChange={(e) => set({ level: e.target.value })} className={inputClass}>
                  {levelsFor(draft.discipline).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Fel</span>
                <input
                  inputMode="numeric"
                  disabled={draft.disqualified}
                  value={draft.disqualified ? "" : draft.faults}
                  onChange={(e) => set({ faults: e.target.value })}
                  placeholder="0"
                  className={`${inputClass} disabled:opacity-40`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Tid (sek)</span>
                <input
                  inputMode="decimal"
                  value={draft.timeSec}
                  onChange={(e) => set({ timeSec: e.target.value })}
                  placeholder="T.ex. 38,52"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Placering</span>
                <input
                  inputMode="numeric"
                  disabled={draft.disqualified}
                  value={draft.disqualified ? "" : draft.placement}
                  onChange={(e) => set({ placement: e.target.value })}
                  className={`${inputClass} disabled:opacity-40`}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Antal startande</span>
                <input inputMode="numeric" value={draft.starters} onChange={(e) => set({ starters: e.target.value })} className={inputClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Anteckning</span>
                <input
                  maxLength={1000}
                  value={draft.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Vad gick bra, vad tränar vi på?"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold has-[:checked]:border-ember has-[:checked]:bg-ember/10">
                <input
                  type="checkbox"
                  checked={draft.disqualified}
                  onChange={(e) => set({ disqualified: e.target.checked, ...(e.target.checked ? { merit: false } : {}) })}
                  className="h-4 w-4"
                />
                Diskad
              </label>
              <label
                className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2 text-sm font-bold has-[:checked]:border-forest has-[:checked]:bg-forest/10 ${
                  draft.disqualified ? "pointer-events-none opacity-40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={draft.disqualified}
                  checked={draft.merit}
                  onChange={(e) => set({ merit: e.target.checked })}
                  className="h-4 w-4"
                />
                Gav merit (pinne)
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink bg-ink px-6 py-2.5 text-sm font-bold text-paper shadow-hard-sm"
              >
                <Check className="h-4 w-4" /> {draft.id ? "Spara ändringar" : "Spara loppet"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-ink/15 px-5 py-2.5 text-sm font-bold text-ink/60 hover:border-ink hover:text-ink"
              >
                Avbryt
              </button>
            </div>
          </form>
        )}

        {runs.length === 0 && !draft ? (
          <div className="mt-6 rounded-3xl border-2 border-dashed border-ink/20 bg-cream/50 p-10 text-center">
            <Medal className="mx-auto h-8 w-8 text-forest" />
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-ink/55">
              Inga lopp loggade för {dogName} än. Logga första loppet här, eller tryck på "Logga resultat" på en
              tävling i{" "}
              <Link to="/tavlingar" className="text-forest underline hover:text-tang">tävlingskalendern</Link>.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {runs.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border-2 border-ink/15 bg-[#FCFAF4] p-4 sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold [overflow-wrap:anywhere]">{r.competitionName}</p>
                  <p className="text-sm font-semibold text-ink/55">
                    {fmtDate(r.date)} · {disciplineLabel(r.discipline)} {r.level}
                    {r.judge ? ` · ${r.judge}` : ""}
                  </p>
                  {r.notes && <p className="mt-1 text-sm text-ink/65 [overflow-wrap:anywhere]">{r.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {r.disqualified ? (
                    <span className="rounded-full bg-ember/10 px-3 py-1 text-ember">Disk</span>
                  ) : (
                    r.faults !== null && (
                      <span className={`rounded-full px-3 py-1 ${isClean(r) ? "bg-forest/10 text-forest" : "bg-ink/5 text-ink/70"}`}>
                        {isClean(r) ? "Felfri" : `${r.faults} fel`}
                      </span>
                    )
                  )}
                  {r.timeSec !== null && (
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-ink/70">
                      {r.timeSec.toLocaleString("sv-SE")} s
                    </span>
                  )}
                  {r.placement !== null && (
                    <span className="rounded-full bg-tang/15 px-3 py-1 text-ember">
                      {ordinal(r.placement)}{r.starters ? ` av ${r.starters}` : ""}
                    </span>
                  )}
                  {r.merit && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-forest px-3 py-1 text-paper">
                      <Trophy className="h-3.5 w-3.5" aria-hidden /> Merit
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDraft(draftFromRun(r))}
                    aria-label={`Ändra loppet ${r.competitionName} ${r.date}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-ink/5 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Ta bort loppet ${r.competitionName} (${fmtDate(r.date)})?`)) remove(r.id);
                    }}
                    aria-label={`Ta bort loppet ${r.competitionName} ${r.date}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-ember/10 hover:text-ember"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
