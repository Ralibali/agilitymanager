import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Smartphone, Tablet, Monitor, ExternalLink, Trash2, Check } from "lucide-react";

/**
 * V3ScreenCheckPage – in-app "Skärmkontroll"
 *
 * Iterera över nyckelsidor i en iframe vid valbar storlek (mobil/tablet/desktop)
 * och bocka av kontroller (knappar, modaler, listor, tomtillstånd m.m.) per sida.
 * Allt sparas i localStorage så du kan jobba av listan över tid.
 */

const STORAGE_KEY = "v3_screen_check_v1";

type Device = { id: "mobile" | "tablet" | "desktop"; label: string; w: number; h: number; icon: typeof Smartphone };
const DEVICES: Device[] = [
  { id: "mobile", label: "iPhone", w: 390, h: 780, icon: Smartphone },
  { id: "tablet", label: "iPad", w: 768, h: 1024, icon: Tablet },
  { id: "desktop", label: "Desktop", w: 1280, h: 800, icon: Monitor },
];

type Page = { path: string; label: string; group: string };
const PAGES: Page[] = [
  { group: "Kärna", path: "/v3", label: "Hem" },
  { group: "Kärna", path: "/v3/training", label: "Träning" },
  { group: "Kärna", path: "/v3/dogs", label: "Hundar" },
  { group: "Kärna", path: "/v3/stats", label: "Statistik" },
  { group: "Kärna", path: "/v3/goals", label: "Mål" },
  { group: "Kärna", path: "/v3/health", label: "Hälsa" },
  { group: "Tävling", path: "/v3/competition", label: "Tävlingar" },
  { group: "Tävling", path: "/v3/competition/kalender", label: "Tävlingskalender" },
  { group: "Coach", path: "/v3/coach", label: "Coach" },
  { group: "Coach", path: "/v3/coach/status", label: "Coach status" },
  { group: "Verktyg", path: "/v3/courses", label: "Banor" },
  { group: "Verktyg", path: "/v3/course-planner", label: "Banplanerare" },
  { group: "Verktyg", path: "/v3/stopwatch", label: "Stoppur" },
  { group: "Socialt", path: "/v3/friends", label: "Vänner" },
  { group: "Socialt", path: "/v3/chat", label: "Chatt" },
  { group: "Socialt", path: "/v3/clubs", label: "Klubbar" },
  { group: "Konto", path: "/v3/settings", label: "Inställningar" },
];

type CheckId =
  | "layout_no_overflow"
  | "tap_targets_44"
  | "buttons_visible"
  | "modals_fit"
  | "lists_scroll"
  | "empty_state"
  | "loading_state"
  | "bottom_nav_clear"
  | "safe_area"
  | "text_readable";

const CHECKS: { id: CheckId; label: string; hint: string }[] = [
  { id: "layout_no_overflow", label: "Ingen horisontell scroll", hint: "Inget innehåll spiller ut i sidled." },
  { id: "tap_targets_44", label: "Klickytor ≥ 44px", hint: "Knappar/ikoner går lätt att träffa med tummen." },
  { id: "buttons_visible", label: "Primärknapp synlig", hint: "Viktigaste CTA syns utan att scrolla." },
  { id: "modals_fit", label: "Modaler/sheets får plats", hint: "Stäng-knapp nås, ingen avklippning." },
  { id: "lists_scroll", label: "Listor scrollar mjukt", hint: "Inga låsta höjder, momentum-scroll OK." },
  { id: "empty_state", label: "Tomtillstånd ser bra ut", hint: "Tydlig text + nästa-steg när tomt." },
  { id: "loading_state", label: "Laddningstillstånd OK", hint: "Skeleton/spinner finns, inget hopp." },
  { id: "bottom_nav_clear", label: "Bottennav inte i vägen", hint: "Innehåll täcks inte av nav/FAB." },
  { id: "safe_area", label: "Safe area respekteras", hint: "Notch/hemknapp överlappar inte text." },
  { id: "text_readable", label: "Text läsbar", hint: "Minst 14px, tillräcklig kontrast." },
];

type PageState = {
  checks: Partial<Record<CheckId, "ok" | "issue">>;
  notes: string;
};
type State = Record<string, PageState>; // key = page.path

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as State) : {};
  } catch {
    return {};
  }
}

export default function V3ScreenCheckPage() {
  const [device, setDevice] = useState<Device["id"]>("mobile");
  const [activePath, setActivePath] = useState<string>(PAGES[0].path);
  const [state, setState] = useState<State>(() => loadState());
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const dev = DEVICES.find((d) => d.id === device)!;
  const current: PageState = state[activePath] ?? { checks: {}, notes: "" };

  const totals = useMemo(() => {
    let ok = 0,
      issues = 0,
      done = 0;
    for (const p of PAGES) {
      const s = state[p.path];
      if (!s) continue;
      const vals = Object.values(s.checks);
      if (vals.length === CHECKS.length) done++;
      ok += vals.filter((v) => v === "ok").length;
      issues += vals.filter((v) => v === "issue").length;
    }
    return { ok, issues, done, total: PAGES.length };
  }, [state]);

  function setCheck(id: CheckId, val: "ok" | "issue") {
    setState((prev) => {
      const cur = prev[activePath] ?? { checks: {}, notes: "" };
      const nextVal = cur.checks[id] === val ? undefined : val;
      const nextChecks = { ...cur.checks };
      if (nextVal) nextChecks[id] = nextVal;
      else delete nextChecks[id];
      return { ...prev, [activePath]: { ...cur, checks: nextChecks } };
    });
  }
  function setNotes(v: string) {
    setState((prev) => {
      const cur = prev[activePath] ?? { checks: {}, notes: "" };
      return { ...prev, [activePath]: { ...cur, notes: v } };
    });
  }
  function resetCurrent() {
    setState((prev) => {
      const next = { ...prev };
      delete next[activePath];
      return next;
    });
  }
  function resetAll() {
    if (confirm("Nollställ all skärmkontroll?")) setState({});
  }

  const grouped = useMemo(() => {
    const m = new Map<string, Page[]>();
    for (const p of PAGES) {
      if (!m.has(p.group)) m.set(p.group, []);
      m.get(p.group)!.push(p);
    }
    return Array.from(m.entries());
  }, []);

  return (
    <div className="min-h-screen bg-v3-canvas text-v3-text-primary pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-v3-canvas/90 backdrop-blur-md border-b border-v3-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/v3/settings" className="p-2 -ml-2 rounded-lg hover:bg-v3-surface" aria-label="Tillbaka">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-v3-display text-lg leading-tight truncate">Skärmkontroll</h1>
            <p className="text-xs text-v3-text-tertiary truncate">
              {totals.done}/{totals.total} sidor klara · {totals.ok} OK · {totals.issues} problem
            </p>
          </div>
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-2 rounded-lg hover:bg-v3-surface"
            aria-label="Ladda om"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        {/* Device + page selectors */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-v3-surface p-1 border border-v3-border">
            {DEVICES.map((d) => {
              const Icon = d.icon;
              const active = d.id === device;
              return (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition ${
                    active ? "bg-v3-canvas shadow-sm text-v3-text-primary" : "text-v3-text-tertiary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {d.label}
                </button>
              );
            })}
          </div>
          <select
            value={activePath}
            onChange={(e) => setActivePath(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-v3-surface border border-v3-border text-sm"
          >
            {grouped.map(([group, pages]) => (
              <optgroup key={group} label={group}>
                {pages.map((p) => {
                  const s = state[p.path];
                  const issues = s ? Object.values(s.checks).filter((v) => v === "issue").length : 0;
                  const done = s && Object.values(s.checks).length === CHECKS.length;
                  const mark = done ? "✓ " : issues ? `⚠${issues} ` : "";
                  return (
                    <option key={p.path} value={p.path}>
                      {mark}
                      {p.label}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
          <a
            href={activePath}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg hover:bg-v3-surface text-v3-text-tertiary"
            aria-label="Öppna i ny flik"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 grid lg:grid-cols-[auto_1fr] gap-6">
        {/* Preview */}
        <section className="flex flex-col items-center">
          <div
            className="rounded-[2rem] border border-v3-border bg-v3-surface shadow-lg overflow-hidden"
            style={{
              width: Math.min(dev.w, typeof window !== "undefined" ? window.innerWidth - 32 : dev.w),
              maxWidth: "100%",
            }}
          >
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-v3-text-tertiary border-b border-v3-border bg-v3-canvas/50 flex justify-between">
              <span>{dev.label}</span>
              <span>
                {dev.w}×{dev.h}
              </span>
            </div>
            <iframe
              key={`${activePath}-${device}-${iframeKey}`}
              ref={iframeRef}
              src={activePath}
              title="Skärmkontroll preview"
              className="block bg-white"
              style={{
                width: dev.w,
                height: dev.h,
                maxWidth: "100%",
                border: 0,
              }}
            />
          </div>
        </section>

        {/* Checklist */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-v3-display text-base">
              {PAGES.find((p) => p.path === activePath)?.label} <span className="text-v3-text-tertiary text-sm">({activePath})</span>
            </h2>
            <button
              onClick={resetCurrent}
              className="text-xs text-v3-text-tertiary hover:text-v3-text-primary flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Nollställ
            </button>
          </div>

          <ul className="space-y-2">
            {CHECKS.map((c) => {
              const val = current.checks[c.id];
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-v3-border bg-v3-surface p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs text-v3-text-tertiary">{c.hint}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setCheck(c.id, "ok")}
                        className={`min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs font-medium border transition ${
                          val === "ok"
                            ? "bg-green-600 text-white border-green-600"
                            : "border-v3-border text-v3-text-tertiary hover:bg-v3-canvas"
                        }`}
                        aria-label="Markera OK"
                      >
                        <Check className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => setCheck(c.id, "issue")}
                        className={`min-h-[44px] min-w-[44px] px-3 rounded-lg text-xs font-medium border transition ${
                          val === "issue"
                            ? "bg-red-600 text-white border-red-600"
                            : "border-v3-border text-v3-text-tertiary hover:bg-v3-canvas"
                        }`}
                        aria-label="Markera problem"
                      >
                        ⚠
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl border border-v3-border bg-v3-surface p-3">
            <label className="text-xs text-v3-text-tertiary block mb-1">Anteckningar för {PAGES.find((p) => p.path === activePath)?.label}</label>
            <textarea
              value={current.notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Beskriv ev. problem du hittade…"
              className="w-full min-h-[88px] rounded-lg bg-v3-canvas border border-v3-border p-2 text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={resetAll}
              className="text-xs text-v3-text-tertiary hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Nollställ allt
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
