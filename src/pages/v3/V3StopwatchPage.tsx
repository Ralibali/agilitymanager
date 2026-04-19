import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Play, Square, RotateCcw, Save, Flag, Timer, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Dog } from "@/types";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type StopwatchState = "idle" | "running" | "stopped";
type FaultEntry = { type: string; count: number };
type LapEntry = { time: number; faults: FaultEntry[] };
type HistoryRow = {
  id: string;
  time_ms: number;
  faults: number;
  refusals: number;
  date: string;
};

const AGILITY_FAULT_TYPES = ["Hopp", "Tunnel", "Kontakt", "Slalom", "Refus", "Bordstopp"];
const HOOPERS_FAULT_TYPES = ["Hoop", "Tunnel", "Tunna", "Staket", "DO-zon"];

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.floor(totalSec % 60);
  const centis = Math.floor((ms % 1000) / 10);
  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
  }
  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

export default function V3StopwatchPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogId, setDogId] = useState("");
  const [state, setState] = useState<StopwatchState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [faultEntries, setFaultEntries] = useState<FaultEntry[]>([]);
  const [laps, setLaps] = useState<LapEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const lastLapRef = useRef(0);
  const wakeLockRef = useRef<{ release: () => void } | null>(null);

  const selectedDog = useMemo(() => dogs.find((d) => d.id === dogId), [dogs, dogId]);
  const isHoopers = selectedDog?.sport === "Hoopers";
  const faultTypes = isHoopers ? HOOPERS_FAULT_TYPES : AGILITY_FAULT_TYPES;
  const currentFaults = faultEntries.reduce((s, f) => s + f.count, 0);
  const lapFaults = laps.reduce((s, lap) => s + lap.faults.reduce((ls, f) => ls + f.count, 0), 0);
  const totalFaults = currentFaults + lapFaults;

  useEffect(() => {
    store.getDogs().then((d) => {
      setDogs(d);
      if (d.length > 0) setDogId(d[0].id);
      setLoading(false);
    });
  }, []);

  const loadHistory = useCallback(async () => {
    if (!dogId) return;
    const { data } = await supabase
      .from("stopwatch_results")
      .select("id, time_ms, faults, refusals, date")
      .eq("dog_id", dogId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setHistory(data as HistoryRow[]);
  }, [dogId]);

  useEffect(() => {
    if (dogId) loadHistory();
  }, [dogId, loadHistory]);

  useEffect(() => {
    setFaultEntries(faultTypes.map((t) => ({ type: t, count: 0 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHoopers]);

  const tick = useCallback(() => {
    setElapsed(Date.now() - startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const tryHaptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
  };

  const tryWakeLock = async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        wakeLockRef.current = await (
          navigator as Navigator & { wakeLock: { request: (s: string) => Promise<{ release: () => void }> } }
        ).wakeLock.request("screen");
      }
    } catch { /* no-op */ }
  };

  const releaseWakeLock = () => {
    try { wakeLockRef.current?.release(); } catch { /* no-op */ }
    wakeLockRef.current = null;
  };

  const handleStart = () => {
    startTimeRef.current = Date.now();
    lastLapRef.current = 0;
    setElapsed(0);
    setFaultEntries(faultTypes.map((t) => ({ type: t, count: 0 })));
    setLaps([]);
    setState("running");
    rafRef.current = requestAnimationFrame(tick);
    tryWakeLock();
    tryHaptic();
  };

  const handleStop = () => {
    cancelAnimationFrame(rafRef.current);
    setState("stopped");
    releaseWakeLock();
    tryHaptic();
  };

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setFaultEntries(faultTypes.map((t) => ({ type: t, count: 0 })));
    setLaps([]);
    setNotes("");
    setState("idle");
    releaseWakeLock();
  };

  const handleFaultTap = (faultType: string) => {
    setFaultEntries((prev) =>
      prev.map((f) => (f.type === faultType ? { ...f, count: f.count + 1 } : f)),
    );
    tryHaptic();
  };

  const handleLap = () => {
    const lapTime = elapsed - lastLapRef.current;
    lastLapRef.current = elapsed;
    setLaps((prev) => [...prev, { time: lapTime, faults: [...faultEntries] }]);
    setFaultEntries(faultTypes.map((t) => ({ type: t, count: 0 })));
    tryHaptic();
  };

  const handleSave = async () => {
    if (!dogId || elapsed === 0) return;
    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) { setSaving(false); return; }
    const currentRefusals = faultEntries.find((f) => f.type === "Refus")?.count ?? 0;
    const lapRefusals = laps.reduce(
      (s, lap) => s + (lap.faults.find((f) => f.type === "Refus")?.count ?? 0), 0,
    );
    const refusals = currentRefusals + lapRefusals;
    const { error } = await supabase.from("stopwatch_results").insert({
      user_id: userId,
      dog_id: dogId,
      time_ms: elapsed,
      faults: totalFaults,
      refusals,
      notes: notes.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara");
    } else {
      toast.success("Tid sparad!");
      handleReset();
      loadHistory();
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-6">
        <div className="v3-skeleton h-10 w-1/2 rounded-v3-base" />
        <div className="v3-skeleton h-64 rounded-v3-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <Helmet><title>Tidtagarur – v3 – AgilityManager</title></Helmet>

      {/* Header */}
      <header className="space-y-2">
        <p className="text-v3-xs uppercase tracking-[0.18em] text-v3-text-tertiary font-v3-sans">
          Verktyg
        </p>
        <h1 className="font-v3-display text-v3-4xl lg:text-v3-5xl text-v3-text-primary">
          Tidtagarur
        </h1>
        <p className="text-v3-base text-v3-text-secondary max-w-xl">
          {selectedDog
            ? `${isHoopers ? "Hoopers-läge" : "Agility-läge"} · ${selectedDog.name}`
            : "Snabb tid med fel-tap per hinder."}
        </p>
      </header>

      {dogs.length === 0 ? (
        <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-10 text-center space-y-3">
          <Timer className="h-10 w-10 mx-auto text-v3-text-tertiary" />
          <h3 className="font-v3-display text-v3-2xl text-v3-text-primary">Lägg till en hund först</h3>
          <p className="text-v3-sm text-v3-text-secondary">
            Tidtagaren behöver en hund för att spara tider till rätt logg.
          </p>
        </div>
      ) : (
        <>
          {/* Hund-väljare */}
          <div className="flex items-center justify-between gap-3 rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-4">
            <div>
              <p className="text-v3-2xs uppercase tracking-[0.16em] text-v3-text-tertiary">
                Aktiv hund
              </p>
              <p className="text-v3-sm text-v3-text-secondary mt-0.5">
                Tider sparas till denna hunds historik.
              </p>
            </div>
            <Select value={dogId} onValueChange={setDogId} disabled={state === "running"}>
              <SelectTrigger className="h-10 w-[200px] rounded-v3-base border-v3-canvas-sunken bg-v3-canvas text-v3-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} {d.sport === "Hoopers" ? "🅞" : "🐕"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Klock-display */}
          <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-8">
            <div className="flex flex-col items-center">
              <motion.div
                animate={state === "running" ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
                className={cn(
                  "font-v3-display text-7xl sm:text-8xl tabular-nums tracking-tight",
                  state === "running" && "text-v3-brand-600",
                  state === "stopped" && "text-v3-text-primary",
                  state === "idle" && "text-v3-text-tertiary",
                )}
              >
                {formatTime(elapsed)}
              </motion.div>

              <div className="flex items-center gap-2 mt-4">
                {totalFaults > 0 ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-v3-2xs font-medium bg-v3-error/10 text-v3-error">
                    {totalFaults} fel
                  </span>
                ) : (
                  state !== "idle" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-v3-2xs font-medium bg-v3-success/10 text-v3-success">
                      Rent
                    </span>
                  )
                )}
                {laps.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-v3-2xs font-medium bg-v3-canvas-secondary text-v3-text-secondary">
                    {laps.length} varv
                  </span>
                )}
              </div>

              {/* Kontroller */}
              <div className="flex gap-3 mt-6 w-full max-w-md">
                {state === "idle" && (
                  <button
                    onClick={handleStart}
                    disabled={!dogId}
                    className="flex-1 h-14 rounded-v3-xl bg-v3-brand-500 text-white font-v3-sans font-semibold text-v3-base v3-tappable v3-focus-ring inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" /> Starta
                  </button>
                )}
                {state === "running" && (
                  <>
                    <button
                      onClick={handleLap}
                      className="h-14 px-6 rounded-v3-xl bg-v3-canvas-secondary text-v3-text-primary font-v3-sans font-medium v3-tappable v3-focus-ring inline-flex items-center gap-2"
                    >
                      <Flag className="w-5 h-5" /> Varv
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex-1 h-14 rounded-v3-xl bg-v3-error text-white font-v3-sans font-semibold v3-tappable v3-focus-ring inline-flex items-center justify-center gap-2"
                    >
                      <Square className="w-5 h-5" /> Stoppa
                    </button>
                  </>
                )}
                {state === "stopped" && (
                  <>
                    <button
                      onClick={handleReset}
                      className="flex-1 h-14 rounded-v3-xl bg-v3-canvas-secondary text-v3-text-primary font-v3-sans font-medium v3-tappable v3-focus-ring inline-flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-5 h-5" /> Nollställ
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 h-14 rounded-v3-xl bg-v3-brand-500 text-white font-v3-sans font-semibold v3-tappable v3-focus-ring inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-5 h-5" /> {saving ? "Sparar…" : "Spara"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fel-knappar */}
          <AnimatePresence>
            {state === "running" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-5"
              >
                <p className="text-v3-2xs uppercase tracking-[0.16em] text-v3-text-tertiary mb-3">
                  Tryck för att registrera fel
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {faultEntries.map((fe) => (
                    <button
                      key={fe.type}
                      onClick={() => handleFaultTap(fe.type)}
                      className="relative h-16 rounded-v3-base bg-v3-canvas-secondary hover:bg-v3-canvas-sunken active:scale-95 transition-all border border-v3-canvas-sunken"
                    >
                      <div className="text-v3-sm font-medium text-v3-text-primary">{fe.type}</div>
                      {fe.count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-v3-error text-white text-v3-2xs font-bold flex items-center justify-center shadow-v3-base">
                          {fe.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Varv */}
          <AnimatePresence>
            {laps.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-5"
              >
                <p className="text-v3-2xs uppercase tracking-[0.16em] text-v3-text-tertiary mb-3">
                  Varv
                </p>
                <div className="space-y-2">
                  {laps.map((lap, i) => {
                    const lf = lap.faults.reduce((s, f) => s + f.count, 0);
                    const detail = lap.faults
                      .filter((f) => f.count > 0)
                      .map((f) => `${f.count} ${f.type}`)
                      .join(", ");
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-v3-base bg-v3-canvas-secondary"
                      >
                        <span className="font-v3-display text-v3-base text-v3-text-primary tabular-nums">
                          Varv {i + 1}: {formatTime(lap.time)}
                        </span>
                        <span className={cn("text-v3-sm", lf > 0 ? "text-v3-error" : "text-v3-success")}>
                          {lf > 0 ? detail : "Rent!"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Anteckningar och fel-fördelning */}
          <AnimatePresence>
            {state === "stopped" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-5 space-y-4">
                  {totalFaults > 0 && (
                    <div>
                      <p className="text-v3-2xs uppercase tracking-[0.16em] text-v3-text-tertiary mb-2">
                        Felfördelning
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {faultEntries.filter((f) => f.count > 0).map((f) => (
                          <div key={f.type} className="text-center p-3 rounded-v3-base bg-v3-error/5">
                            <div className="text-v3-2xl font-bold text-v3-error">{f.count}</div>
                            <div className="text-v3-2xs text-v3-text-tertiary mt-1">{f.type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="stopwatch-notes" className="text-v3-sm text-v3-text-secondary block mb-1.5">
                      Notering
                    </label>
                    <textarea
                      id="stopwatch-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Hur gick det?"
                      className="w-full rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas px-3 py-2 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Historik */}
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-v3-display text-v3-2xl text-v3-text-primary flex items-center gap-2">
                <History className="w-5 h-5 text-v3-text-tertiary" /> Senaste tider
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 v3-stagger">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-4 animate-v3-fade-up"
                  >
                    <p className="text-v3-2xs uppercase tracking-[0.14em] text-v3-text-tertiary">
                      {new Date(h.date).toLocaleDateString("sv-SE")}
                    </p>
                    <p className="font-v3-display text-v3-2xl text-v3-text-primary tabular-nums mt-1">
                      {formatTime(h.time_ms)}
                    </p>
                    <p className={cn(
                      "text-v3-xs mt-1",
                      (h.faults > 0 || h.refusals > 0) ? "text-v3-error" : "text-v3-success",
                    )}>
                      {(h.faults > 0 || h.refusals > 0)
                        ? `${h.faults} fel · ${h.refusals} refus.`
                        : "Rent"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
