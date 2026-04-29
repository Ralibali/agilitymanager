import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Loader2, Calendar, MapPin, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";

interface Props {
  open: boolean;
  onClose: () => void;
  dog: V3Dog | null;
  onSaved?: () => void;
}

const schema = z.object({
  event_name: z.string().trim().min(1, "Ange tävlingsnamn").max(140),
  date: z.string().min(1, "Välj datum"),
  location: z.string().trim().max(140).optional(),
  signup_url: z.string().trim().url("Ogiltig URL").or(z.literal("")).optional(),
  reminder_days_before: z.number().int().min(0).max(60),
});

export function V3AddPlannedSheet({ open, onClose, dog, onSaved }: Props) {
  const { user } = useAuth();
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [reminder, setReminder] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEventName("");
      setDate("");
      setLocation("");
      setSignupUrl("");
      setReminder(7);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!user?.id || !dog) return;
    const parsed = schema.safeParse({
      event_name: eventName,
      date,
      location,
      signup_url: signupUrl,
      reminder_days_before: reminder,
    });
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first?.message ?? "Kontrollera fälten");
      return;
    }
    setSaving(true);
    const { data: inserted, error } = await supabase.from("planned_competitions").insert({
      user_id: user.id,
      dog_id: dog.id,
      event_name: parsed.data.event_name,
      date: parsed.data.date,
      location: parsed.data.location ?? "",
      signup_url: parsed.data.signup_url ?? "",
      reminder_days_before: parsed.data.reminder_days_before,
      status: "sparad",
    }).select("id").single();
    if (error || !inserted) {
      setSaving(false);
      toast.error("Kunde inte spara");
      return;
    }
    // Skapa även en post i competition_reminders så cron-jobbet kan skicka mejl
    if (parsed.data.reminder_days_before > 0) {
      await supabase.from("competition_reminders").insert({
        user_id: user.id,
        planned_competition_id: inserted.id,
        days_before: parsed.data.reminder_days_before,
        channel: "email",
      });
    }
    setSaving(false);
    toast.success("Tävling sparad");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[640px] bg-v3-canvas rounded-t-v3-2xl lg:rounded-v3-2xl lg:mb-10 max-h-[92vh] flex flex-col shadow-v3-xl animate-v3-sheet-in-4">
        <header className="flex items-center justify-between px-5 py-4 border-b border-v3-canvas-sunken/40 shrink-0">
          <div>
            <div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">
              Planera tävling
            </div>
            <h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-none mt-1">
              {dog ? dog.name : "Ny tävling"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:bg-v3-canvas-sunken transition-colors"
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <Field label="Tävlingsnamn">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="t.ex. SM Agility 2026"
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Datum" icon={<Calendar size={14} />}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Plats" icon={<MapPin size={14} />}>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="t.ex. Norrköping"
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Anmälningslänk" icon={<LinkIcon size={14} />}>
            <input
              type="url"
              value={signupUrl}
              onChange={(e) => setSignupUrl(e.target.value)}
              placeholder="https://..."
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <Field label="Påminnelse (dagar innan)">
            <div className="flex flex-wrap gap-1.5">
              {[0, 3, 7, 14, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReminder(n)}
                  className={cn(
                    "h-9 px-4 rounded-v3-base text-v3-sm font-medium transition-colors",
                    reminder === n
                      ? "bg-v3-text-primary text-v3-text-inverse"
                      : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
                  )}
                >
                  {n === 0 ? "Ingen" : `${n} d`}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <footer className="px-5 py-4 border-t border-v3-canvas-sunken/40 shrink-0 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-text-secondary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dog}
            className="flex-1 h-11 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Spara tävling
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-2">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
