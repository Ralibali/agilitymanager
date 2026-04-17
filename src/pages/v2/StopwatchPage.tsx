import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Play, Square, RotateCcw, Save, Flag, Timer, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PageHeader,
  DSCard,
  DSButton,
  DSEmptyState,
  PageSkeleton,
  MetricCard,
  StatusBadge,
} from "@/components/ds";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Dog } from "@/types";

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
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${centis
      .toString()
      .padStart(2, "0")}`;
  }
  return `${seconds}.${centis.toString().padStart(2, "0")}`;
}

export default function StopwatchPage() {
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
  const lapFaults = laps.reduce(
    (s, lap) => s + lap.faults.reduce((ls, f) => ls + f.count, 0),
    0,
  );
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

  // Reset fault counters whenever sport-mode changes
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
    } catch {
      /* no-op */
    }
  };

  const releaseWakeLock = () => {
    try {
      wakeLockRef.current?.release();
    } catch {
      /* no-op */
    }
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
    if (!userId) {
      setSaving(false);
      return;
    }
    const currentRefusals = faultEntries.find((f) => f.type === "Refus")?.count ?? 0;
    const lapRefusals = laps.reduce(
      (s, lap) => s + (lap.faults.find((f) => f.type === "Refus")?.count ?? 0),
      0,
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

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <Helmet>
        <title>Tidtagarur – AgilityManager</title>
      </Helmet>

      <PageHeader
        eyebrow="Träning"
        title="Tidtagarur"
        subtitle={
          selectedDog
            ? `${isHoopers ? "Hoopers-läge" : "Agility-läge"} · ${selectedDog.name}`
            : "Snabb tid med fel-tap per hinder"
        }
      />

      {dogs.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={Timer}
            title="Lägg till en hund först"
            description="Tidtagaren behöver en hund för att kunna spara tider till rätt logg."
          />
        </DSCard>
      ) : (
        <>
          {/* Hund-väljare */}
          <DSCard className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-micro text-text-tertiary uppercase tracking-wide">
                Aktiv hund
              </Label>
              <p className="text-body text-text-secondary mt-0.5">
                Tider sparas till denna hunds historik.
              </p>
            </div>
            <Select value={dogId} onValueChange={setDogId} disabled={state === "running"}>
              <SelectTrigger className="h-9 w-[200px] rounded-ds-md border-border-default bg-surface text-body">
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
          </DSCard>

          {/* Klock-display */}
          <DSCard>
            <div className="flex flex-col items-center py-6">
              <motion.div
                animate={
                  state === "running"
                    ? { scale: [1, 1.02, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 1, repeat: Infinity }}
                className={`font-display text-7xl sm:text-8xl font-bold tabular-nums tracking-tight ${
                  state === "running"
                    ? "text-brand-600"
                    : state === "stopped"
                    ? "text-text-primary"
                    : "text-text-tertiary"
                }`}
              >
                {formatTime(elapsed)}
              </motion.div>

              <div className="flex items-center gap-3 mt-4">
                {totalFaults > 0 ? (
                  <StatusBadge variant="error" label={`${totalFaults} fel`} />
                ) : (
                  state !== "idle" && <StatusBadge variant="success" label="Rent" />
                )}
                {laps.length > 0 && (
                  <StatusBadge variant="neutral" label={`${laps.length} varv`} />
                )}
              </div>

              {/* Kontrollknappar */}
              <div className="flex gap-3 mt-6 w-full max-w-md">
                {state === "idle" && (
                  <DSButton
                    onClick={handleStart}
                    disabled={!dogId}
                    className="flex-1 h-14 text-body font-semibold"
                  >
                    <Play className="w-5 h-5" /> Starta
                  </DSButton>
                )}
                {state === "running" && (
                  <>
                    <DSButton
                      variant="secondary"
                      onClick={handleLap}
                      className="h-14 px-6"
                    >
                      <Flag className="w-5 h-5" /> Varv
                    </DSButton>
                    <DSButton
                      variant="destructive"
                      onClick={handleStop}
                      className="flex-1 h-14 text-body font-semibold"
                    >
                      <Square className="w-5 h-5" /> Stoppa
                    </DSButton>
                  </>
                )}
                {state === "stopped" && (
                  <>
                    <DSButton
                      variant="secondary"
                      onClick={handleReset}
                      className="flex-1 h-14"
                    >
                      <RotateCcw className="w-5 h-5" /> Nollställ
                    </DSButton>
                    <DSButton
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 h-14 text-body font-semibold"
                    >
                      <Save className="w-5 h-5" /> {saving ? "Sparar…" : "Spara"}
                    </DSButton>
                  </>
                )}
              </div>
            </div>
          </DSCard>

          {/* Fel-knappar */}
          <AnimatePresence>
            {state === "running" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DSCard>
                  <Label className="text-micro text-text-tertiary uppercase tracking-wide mb-3 block">
                    Tryck för att registrera fel
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {faultEntries.map((fe) => (
                      <button
                        key={fe.type}
                        onClick={() => handleFaultTap(fe.type)}
                        className="relative h-16 rounded-ds-md bg-subtle hover:bg-surface-3 active:scale-95 transition-all border border-border-default"
                      >
                        <div className="text-small font-medium text-text-primary">
                          {fe.type}
                        </div>
                        {fe.count > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-semantic-error text-white text-micro font-bold flex items-center justify-center shadow-elevated">
                            {fe.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </DSCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Varv-lista */}
          <AnimatePresence>
            {laps.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DSCard>
                  <Label className="text-micro text-text-tertiary uppercase tracking-wide mb-3 block">
                    Varv
                  </Label>
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
                          className="flex items-center justify-between p-3 rounded-ds-md bg-subtle"
                        >
                          <span className="font-display font-semibold text-body text-text-primary tabular-nums">
                            Varv {i + 1}: {formatTime(lap.time)}
                          </span>
                          <span
                            className={
                              "text-small " +
                              (lf > 0 ? "text-semantic-error" : "text-semantic-success")
                            }
                          >
                            {lf > 0 ? detail : "Rent!"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </DSCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sparvy: anteckningar och fel-fördelning */}
          <AnimatePresence>
            {state === "stopped" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <DSCard className="space-y-4">
                  {totalFaults > 0 && (
                    <div>
                      <Label className="text-micro text-text-tertiary uppercase tracking-wide mb-2 block">
                        Felfördelning
                      </Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {faultEntries
                          .filter((f) => f.count > 0)
                          .map((f) => (
                            <div
                              key={f.type}
                              className="text-center p-3 rounded-ds-md bg-semantic-error/5"
                            >
                              <div className="text-h2 font-bold text-semantic-error">
                                {f.count}
                              </div>
                              <div className="text-micro text-text-tertiary mt-1">
                                {f.type}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="stopwatch-notes">Notering</Label>
                    <Textarea
                      id="stopwatch-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Hur gick det?"
                      className="mt-1.5"
                    />
                  </div>
                </DSCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Historik */}
          {history.length > 0 && (
            <section>
              <h2 className="text-h2 text-text-primary mb-3 flex items-center gap-2">
                <History className="w-5 h-5 text-text-tertiary" /> Senaste tider
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((h) => (
                  <MetricCard
                    key={h.id}
                    label={h.date}
                    value={formatTime(h.time_ms)}
                    hint={
                      h.faults > 0 || h.refusals > 0
                        ? `${h.faults} fel · ${h.refusals} refus.`
                        : "Rent"
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
