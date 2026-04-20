import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, CheckCircle2, ExternalLink, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Dog } from "@/types";

export interface FetchMyResultTarget {
  /** Originalkällans URL (t.ex. agilitydata.se eller shok.se). */
  source_url: string;
  source_label: string;
  competition_name: string;
  date: string | null;
  sport: "Agility" | "Hoopers";
  /** ID som används i competition_log/competition_interests om matchen importeras. */
  competition_id: string;
}

interface MatchedRow {
  placement: number | null;
  handler_name: string;
  dog_name: string;
  time_sec: number | null;
  faults: number | null;
  size_class: string;
  class_label: string;
  passed: boolean;
  disqualified: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  target: FetchMyResultTarget | null;
  dogs: Dog[];
}

const SAGIK_LEVEL_FROM_LABEL = (label: string): string => {
  const l = label.toLowerCase();
  if (l.includes("3")) return "K3";
  if (l.includes("2")) return "K2";
  if (l.includes("1")) return "K1";
  if (l.includes("noll") || l.includes("0")) return "Nollklass";
  return "K1";
};

const DISCIPLINE_FROM_LABEL = (label: string): "Agility" | "Jumping" | "Nollklass" => {
  const l = label.toLowerCase();
  if (l.includes("hopp") || l.includes("jump")) return "Jumping";
  if (l.includes("noll")) return "Nollklass";
  return "Agility";
};

/**
 * GDPR-säker import av egna tävlingsresultat.
 * Edge-funktionen filtrerar redan på server-sidan så att bara rader som matchar
 * användarens hund + förare returneras. Den här dialogen visar matchningarna
 * och låter användaren välja vilka som ska importeras till competition_results.
 */
export function FetchMyResultDialog({ open, onOpenChange, target, dogs }: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"setup" | "loading" | "preview" | "done">("setup");
  const [error, setError] = useState<string | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string>(dogs[0]?.id ?? "");
  const [handlerName, setHandlerName] = useState("");
  const [matches, setMatches] = useState<MatchedRow[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      // återställ vid stängning
      setPhase("setup");
      setError(null);
      setMatches([]);
      setPicked(new Set());
      setImporting(false);
    }
  }, [open]);

  // Förifyll förarnamn från profil
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("handler_first_name, handler_last_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const first = data?.handler_first_name?.trim() ?? "";
      const last = data?.handler_last_name?.trim() ?? "";
      const full = [first, last].filter(Boolean).join(" ");
      setHandlerName(full || data?.display_name || "");
    })();
  }, [open, user]);

  useEffect(() => {
    if (dogs.length && !selectedDogId) setSelectedDogId(dogs[0].id);
  }, [dogs, selectedDogId]);

  const selectedDog = dogs.find((d) => d.id === selectedDogId);

  const handleFetch = async () => {
    if (!target || !selectedDog || !handlerName.trim()) {
      setError("Välj hund och fyll i förarnamn");
      return;
    }
    setError(null);
    setPhase("loading");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-my-competition-result", {
        body: {
          url: target.source_url,
          dog_name: selectedDog.name,
          handler_name: handlerName.trim(),
        },
      });
      if (fnError) throw fnError;
      if (!data?.success) {
        setError(data?.error || "Kunde inte hämta resultat");
        setPhase("setup");
        return;
      }
      setMatches(data.matches ?? []);
      setPicked(new Set((data.matches ?? []).map((_: MatchedRow, i: number) => i)));
      setPhase("preview");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Något gick fel");
      setPhase("setup");
    }
  };

  const togglePick = (idx: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleImport = async () => {
    if (!user || !target || !selectedDog || picked.size === 0) return;
    setImporting(true);
    try {
      const rows = Array.from(picked).map((i) => matches[i]);
      // Bygg ett meningsfullt event_name. Om källans namn saknas eller är ett
      // generiskt platshållare ("Tävling"), använd datum + sport som fallback
      // istället för att lagra en tom/dum etikett i loggen.
      const rawName = (target.competition_name || "").trim();
      const isPlaceholder =
        !rawName ||
        rawName.toLowerCase() === "tävling" ||
        rawName.toLowerCase() === "tavling";
      const dateLabel = target.date
        ? new Date(target.date).toLocaleDateString("sv-SE", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";
      const baseName = isPlaceholder
        ? `${target.sport}-tävling${dateLabel ? ` ${dateLabel}` : ""}`
        : rawName;

      const inserts = rows.map((r) => ({
        user_id: user.id,
        dog_id: selectedDog.id,
        date: target.date ?? new Date().toISOString().split("T")[0],
        event_name: baseName,
        organizer: isPlaceholder ? "" : rawName,
        discipline: DISCIPLINE_FROM_LABEL(r.class_label) as any,
        size_class: (selectedDog.size_class || "L") as any,
        competition_level: SAGIK_LEVEL_FROM_LABEL(r.class_label) as any,
        sport: target.sport as any,
        faults: r.faults ?? 0,
        time_sec: r.time_sec ?? 0,
        passed: r.passed,
        disqualified: r.disqualified,
        placement: r.placement,
        notes: `Importerat från ${target.source_label} (${new Date().toLocaleDateString("sv-SE")}). Klass: ${r.class_label}.`,
      }));
      const { error } = await supabase.from("competition_results").insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} resultat importerat`);
      setPhase("done");
    } catch (e: any) {
      console.error(e);
      toast.error("Kunde inte spara resultaten");
    } finally {
      setImporting(false);
    }
  };

  if (!open || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-v3-2xl bg-v3-canvas-elevated shadow-v3-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-v3-canvas-sunken/40 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-v3-lg font-medium text-v3-text-primary truncate flex items-center gap-2">
              <Trophy size={16} strokeWidth={1.8} className="text-v3-brand-500 shrink-0" />
              Hämta mina resultat
            </h2>
            <p className="text-v3-xs text-v3-text-tertiary mt-0.5 truncate">{target.competition_name}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 grid place-items-center rounded-full text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors shrink-0"
            aria-label="Stäng"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* GDPR-banner */}
          <div className="rounded-v3-base bg-v3-brand-500/5 border border-v3-brand-500/20 p-3 text-v3-xs text-v3-text-secondary leading-relaxed">
            <strong className="text-v3-text-primary">GDPR:</strong> Vi hämtar den publika resultatlistan
            från {target.source_label} och filtrerar fram <strong>bara dina egna</strong> rader baserat på
            hund- och förarnamn. Andras data lagras eller delas aldrig av appen.
          </div>

          {/* SETUP */}
          {phase === "setup" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary block mb-1.5">
                  Hund
                </label>
                <select
                  value={selectedDogId}
                  onChange={(e) => setSelectedDogId(e.target.value)}
                  className="w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
                >
                  {dogs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary block mb-1.5">
                  Ditt namn (förare)
                </label>
                <input
                  value={handlerName}
                  onChange={(e) => setHandlerName(e.target.value)}
                  placeholder="T.ex. Malin Öster"
                  className="w-full h-10 px-3 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
                />
                <p className="mt-1 text-v3-xs text-v3-text-tertiary">
                  Måste matcha exakt som det står i resultatlistan. Spara namnet i Inställningar för att
                  slippa skriva det varje gång.
                </p>
              </div>
              {error && (
                <div className="rounded-v3-base bg-amber-500/10 border border-amber-500/30 p-3 text-v3-sm text-amber-700 inline-flex items-start gap-2">
                  <AlertCircle size={14} strokeWidth={1.8} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <a
                href={target.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-v3-xs text-v3-text-tertiary hover:text-v3-text-primary"
              >
                Öppna källan på {target.source_label} <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* LOADING */}
          {phase === "loading" && (
            <div className="py-12 grid place-items-center text-v3-text-secondary">
              <Loader2 size={28} strokeWidth={1.6} className="animate-spin text-v3-brand-500" />
              <p className="mt-3 text-v3-sm">Söker efter dina resultat...</p>
              <p className="mt-1 text-v3-xs text-v3-text-tertiary">Kan ta 5–15 sekunder</p>
            </div>
          )}

          {/* PREVIEW */}
          {phase === "preview" && (
            <div className="space-y-3">
              {matches.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle size={28} strokeWidth={1.6} className="mx-auto text-v3-text-tertiary mb-3" />
                  <p className="text-v3-sm text-v3-text-secondary">
                    Inga rader matchade <strong>{selectedDog?.name}</strong> + <strong>{handlerName}</strong>.
                  </p>
                  <p className="mt-1 text-v3-xs text-v3-text-tertiary">
                    Resultatet kanske inte är publicerat ännu, eller så stavas namnen annorlunda i listan.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhase("setup")}
                    className="mt-4 h-9 px-4 rounded-v3-base bg-v3-canvas-sunken text-v3-text-primary text-v3-sm font-medium hover:bg-v3-canvas-sunken/80 transition-colors"
                  >
                    Justera och försök igen
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-v3-sm text-v3-text-secondary">
                    Hittade <strong>{matches.length}</strong> rad{matches.length === 1 ? "" : "er"}. Välj
                    vilka du vill spara i din resultatlogg.
                  </p>
                  <ul className="space-y-1.5">
                    {matches.map((m, idx) => {
                      const isPicked = picked.has(idx);
                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => togglePick(idx)}
                            className={cn(
                              "w-full text-left rounded-v3-base border p-3 transition-colors",
                              isPicked
                                ? "bg-v3-brand-500/10 border-v3-brand-500/40"
                                : "bg-v3-canvas border-v3-canvas-sunken/50 hover:border-v3-canvas-sunken",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  "h-5 w-5 rounded border-2 grid place-items-center mt-0.5 shrink-0 transition-colors",
                                  isPicked
                                    ? "bg-v3-brand-500 border-v3-brand-500"
                                    : "border-v3-canvas-sunken",
                                )}
                              >
                                {isPicked && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="text-v3-base font-medium text-v3-text-primary">
                                    {m.class_label}
                                  </span>
                                  {m.placement && (
                                    <span className="text-v3-xs font-semibold text-v3-brand-700 tabular-nums">
                                      Placering {m.placement}
                                    </span>
                                  )}
                                  {m.disqualified && (
                                    <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-v3-canvas-sunken text-v3-text-tertiary">
                                      Disk
                                    </span>
                                  )}
                                  {m.passed && !m.disqualified && (
                                    <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-green-500/15 text-green-700">
                                      Godkänd
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-v3-xs text-v3-text-tertiary tabular-nums">
                                  {m.time_sec !== null && <span>Tid: {m.time_sec.toFixed(2)}s</span>}
                                  {m.faults !== null && <span>Fel: {m.faults}</span>}
                                  {m.size_class && m.size_class !== "-" && (
                                    <span>Storlek: {m.size_class}</span>
                                  )}
                                </div>
                                <div className="mt-1 text-[11px] text-v3-text-tertiary truncate">
                                  {m.dog_name} · {m.handler_name}
                                </div>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {/* DONE */}
          {phase === "done" && (
            <div className="py-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-green-500/15 grid place-items-center mb-4">
                <CheckCircle2 size={22} strokeWidth={1.6} className="text-green-700" />
              </div>
              <p className="text-v3-base text-v3-text-primary">Resultat sparade!</p>
              <p className="mt-1 text-v3-sm text-v3-text-tertiary">
                Du hittar dem under Resultat och i Statistik.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-v3-canvas-sunken/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-3 rounded-v3-base text-v3-sm font-medium text-v3-text-secondary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors"
          >
            {phase === "done" ? "Klar" : "Avbryt"}
          </button>
          {phase === "setup" && (
            <button
              type="button"
              onClick={handleFetch}
              disabled={!selectedDogId || !handlerName.trim()}
              className="h-9 px-4 rounded-v3-base bg-v3-text-primary text-v3-text-inverse text-v3-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Hämta resultat
            </button>
          )}
          {phase === "preview" && matches.length > 0 && (
            <button
              type="button"
              onClick={handleImport}
              disabled={picked.size === 0 || importing}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing && <Loader2 size={13} className="animate-spin" />}
              Importera {picked.size} valda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
