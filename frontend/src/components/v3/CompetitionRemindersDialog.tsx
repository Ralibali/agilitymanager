import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Bell, BellOff, Loader2, Calendar as CalendarIcon, MapPin, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reminder {
  id: string;
  days_before: number;
  channel: "email" | "inapp";
  sent_at: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  planned: {
    id: string;
    user_id: string;
    event_name: string;
    date: string;
    location: string | null;
    signup_url: string | null;
  } | null;
  onChanged?: () => void;
}

const SUGGESTIONS = [30, 14, 7, 3, 1, 0];

export function CompetitionRemindersDialog({ open, onClose, planned, onChanged }: Props) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [customDays, setCustomDays] = useState<string>("");

  useEffect(() => {
    if (!open || !planned?.id) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planned?.id]);

  const load = async () => {
    if (!planned?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("competition_reminders")
      .select("id, days_before, channel, sent_at")
      .eq("planned_competition_id", planned.id)
      .order("days_before", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Kunde inte ladda påminnelser");
      return;
    }
    setReminders((data ?? []) as Reminder[]);
  };

  const addReminder = async (days: number) => {
    if (!planned?.id || !user?.id) return;
    if (reminders.some((r) => r.days_before === days && r.channel === "email")) {
      toast.info("Den påminnelsen finns redan");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("competition_reminders").insert({
      user_id: user.id,
      planned_competition_id: planned.id,
      days_before: days,
      channel: "email",
    });
    setAdding(false);
    if (error) {
      toast.error("Kunde inte lägga till");
      return;
    }
    toast.success(`Påminnelse satt: ${days === 0 ? "samma dag" : `${days} d innan`}`);
    setCustomDays("");
    await load();
    onChanged?.();
  };

  const removeReminder = async (id: string) => {
    const { error } = await supabase.from("competition_reminders").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort");
      return;
    }
    toast.success("Påminnelse borttagen");
    await load();
    onChanged?.();
  };

  if (!open || !planned) return null;

  const handleCustom = () => {
    const n = parseInt(customDays, 10);
    if (Number.isNaN(n) || n < 0 || n > 120) {
      toast.error("Ange 0–120 dagar");
      return;
    }
    void addReminder(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-v3-canvas rounded-t-v3-2xl sm:rounded-v3-2xl max-h-[92vh] flex flex-col shadow-v3-xl animate-v3-sheet-in-4">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-v3-canvas-sunken/40 shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">Påminnelser</div>
            <h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-tight mt-1 truncate">{planned.event_name}</h2>
            <p className="text-v3-xs text-v3-text-tertiary mt-1 inline-flex items-center gap-1.5">
              <CalendarIcon size={11} /> {new Date(planned.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
              {planned.location && <><span aria-hidden>·</span><MapPin size={11} /> {planned.location}</>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Stäng" className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:bg-v3-canvas-sunken transition-colors">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section>
            <h3 className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">Aktiva påminnelser</h3>
            {loading ? (
              <div className="h-12 rounded-v3-base v3-skeleton" />
            ) : reminders.length === 0 ? (
              <div className="rounded-v3-base bg-v3-canvas-elevated border border-dashed border-v3-canvas-sunken/60 p-4 text-center text-v3-sm text-v3-text-secondary inline-flex items-center justify-center gap-2 w-full">
                <BellOff size={14} /> Inga påminnelser ännu
              </div>
            ) : (
              <ul className="space-y-1.5">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 px-3 py-2.5">
                    <div className="inline-flex items-center gap-2 min-w-0">
                      <Bell size={14} className="text-v3-brand-600 shrink-0" />
                      <span className="text-v3-sm text-v3-text-primary">
                        {r.days_before === 0 ? "Samma dag" : r.days_before === 1 ? "1 dag innan" : `${r.days_before} dagar innan`}
                      </span>
                      {r.sent_at && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-moss/35 text-moss-deep">Skickad</span>
                      )}
                    </div>
                    <button type="button" onClick={() => removeReminder(r.id)} aria-label="Ta bort" className="h-8 w-8 rounded-full grid place-items-center text-v3-text-tertiary hover:text-coral hover:bg-coral/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">Lägg till</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUGGESTIONS.map((d) => {
                const exists = reminders.some((r) => r.days_before === d && r.channel === "email");
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={exists || adding}
                    onClick={() => addReminder(d)}
                    className={cn(
                      "h-9 px-3.5 rounded-v3-base text-v3-sm font-medium border transition-colors inline-flex items-center gap-1.5",
                      exists
                        ? "bg-v3-canvas-sunken/60 text-v3-text-tertiary border-transparent cursor-not-allowed"
                        : "bg-v3-canvas-elevated text-v3-text-primary border-v3-canvas-sunken/60 hover:border-v3-brand-500/40 hover:bg-v3-brand-500/5"
                    )}
                  >
                    <Plus size={12} /> {d === 0 ? "Samma dag" : `${d} d`}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={120}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Eget antal dagar"
                className="flex-1 h-10 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
              <button
                type="button"
                onClick={handleCustom}
                disabled={adding || !customDays}
                className="h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {adding && <Loader2 size={13} className="animate-spin" />} Lägg till
              </button>
            </div>
            <p className="text-v3-xs text-v3-text-tertiary mt-3">
              Mejl skickas automatiskt på morgonen den dagen påminnelsen inträffar.
            </p>
          </section>

          {planned.signup_url && (
            <a href={planned.signup_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-v3-sm text-v3-brand-700 hover:underline">
              Öppna anmälan <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompetitionRemindersDialog;
