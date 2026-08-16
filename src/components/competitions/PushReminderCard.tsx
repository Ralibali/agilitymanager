import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import {
  disablePushReminders,
  enablePushReminders,
  getExistingSubscription,
  needsHomeScreenInstall,
  pushSupported,
  syncPushCompetitions,
} from "@/lib/pushNotifications";

interface Props {
  competitionKeys: string[];
}

/** Låter besökaren slå på push-påminnelser när anmälan öppnar eller stänger. */
export function PushReminderCard({ competitionKeys }: Props) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    setNeedsInstall(needsHomeScreenInstall());
    getExistingSubscription().then((sub) => setEnabled(Boolean(sub)));
  }, []);

  // Håll bevakningslistan i synk med favoriterna.
  useEffect(() => {
    if (!enabled) return;
    syncPushCompetitions(competitionKeys).catch(() => undefined);
  }, [enabled, competitionKeys]);

  async function handleToggle() {
    setBusy(true);
    setError(null);
    try {
      if (enabled) {
        await disablePushReminders();
        setEnabled(false);
      } else {
        await enablePushReminders(competitionKeys);
        setEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-3xl border-2 border-ink/15 bg-cream/60 p-6">
        <p className="text-sm font-semibold text-ink/60">
          Din webbläsare stödjer tyvärr inte push-notiser. Öppna sidan i Chrome, Edge, Firefox eller
          Safari så kan du få påminnelser när anmälan öppnar och stänger.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-ink bg-paper p-6 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-ember" />
            <h2 className="font-display text-2xl tracking-wide">Påminn mig om anmälan</h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-ink/60">
            Få en notis när anmälan öppnar och när den snart stänger (7, 3 och 1 dag före samt sista
            dagen) för dina sparade tävlingar. Inget konto behövs.
          </p>
          {needsInstall && (
            <p className="mt-3 flex items-start gap-2 text-xs font-bold text-ink/55">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              På iPhone: lägg först till sidan på hemskärmen via Dela → Lägg till på hemskärmen.
            </p>
          )}
          {error && <p className="mt-3 text-sm font-bold text-ember">{error}</p>}
          {enabled && !error && (
            <p className="mt-3 text-sm font-bold text-forest">
              Notiser är på för {competitionKeys.length} sparade tävlingar.
            </p>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={busy || (!enabled && competitionKeys.length === 0)}
          className={`inline-flex items-center gap-2 rounded-full border-2 border-ink px-6 py-3 text-sm font-bold shadow-hard-sm transition-transform disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? "bg-paper text-ink" : "bg-tang text-ink"
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : enabled ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {enabled ? "Stäng av notiser" : "Slå på notiser"}
        </button>
      </div>
      {!enabled && competitionKeys.length === 0 && (
        <p className="mt-3 text-xs font-bold text-ink/45">
          Spara minst en tävling med hjärtat för att kunna slå på påminnelser.
        </p>
      )}
    </div>
  );
}
