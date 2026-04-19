import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Loader2, Calendar, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";
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

const AGILITY_LEVELS = ["Nollklass", "K1", "K2", "K3"] as const;
const HOOPERS_LEVELS = ["Startklass", "Klass 1", "Klass 2", "Klass 3"] as const;
const AGILITY_DISCIPLINES = ["Agility", "Jumping", "Nollklass"] as const;

const schema = z.object({
  event_name: z.string().trim().min(1, "Ange tävlingsnamn").max(140),
  date: z.string().min(1, "Välj datum"),
  organizer: z.string().trim().max(120).optional(),
  placement: z.number().int().min(1).max(9999).nullable(),
  faults: z.number().int().min(0).max(999),
  time_sec: z.number().min(0).max(9999),
  passed: z.boolean(),
  disqualified: z.boolean(),
  notes: z.string().trim().max(500).optional(),
});

export function V3AddResultSheet({ open, onClose, dog, onSaved }: Props) {
  const { user } = useAuth();
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [organizer, setOrganizer] = useState("");
  const [placement, setPlacement] = useState("");
  const [faults, setFaults] = useState("0");
  const [timeSec, setTimeSec] = useState("");
  const [passed, setPassed] = useState(true);
  const [disq, setDisq] = useState(false);
  const [notes, setNotes] = useState("");
  const [discipline, setDiscipline] = useState<string>("Agility");
  const [level, setLevel] = useState<string>("K1");
  const [saving, setSaving] = useState(false);

  const isHoopers = dog?.sport === "Hoopers";
  const sport = isHoopers ? "Hoopers" : "Agility";

  useEffect(() => {
    if (open) {
      setEventName("");
      setDate(new Date().toISOString().split("T")[0]);
      setOrganizer("");
      setPlacement("");
      setFaults("0");
      setTimeSec("");
      setPassed(true);
      setDisq(false);
      setNotes("");
      if (isHoopers) {
        setDiscipline("Agility"); // discipline enum reused, ignored for hoopers
        setLevel(dog?.hoopers_level ?? "Startklass");
      } else {
        setDiscipline("Agility");
        setLevel(dog?.competition_level ?? "K1");
      }
    }
  }, [open, dog, isHoopers]);

  if (!open) return null;

  const handleSave = async () => {
    if (!user?.id || !dog) return;
    const parsed = schema.safeParse({
      event_name: eventName,
      date,
      organizer,
      placement: placement ? Number(placement) : null,
      faults: Number(faults || 0),
      time_sec: Number(timeSec || 0),
      passed,
      disqualified: disq,
      notes,
    });
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first?.message ?? "Kontrollera fälten");
      return;
    }
    setSaving(true);
    const insertData: any = {
      user_id: user.id,
      dog_id: dog.id,
      event_name: parsed.data.event_name,
      date: parsed.data.date,
      organizer: parsed.data.organizer ?? "",
      placement: parsed.data.placement,
      faults: parsed.data.faults,
      time_sec: parsed.data.time_sec,
      passed: parsed.data.passed,
      disqualified: parsed.data.disqualified,
      notes: parsed.data.notes ?? "",
      sport,
      size_class: dog.size_class,
      discipline: isHoopers ? "Agility" : discipline,
      competition_level: isHoopers ? "K1" : level, // hoopers level is tracked separately
    };
    if (isHoopers) {
      // Map hoopers level into a points hint (free input, default 0)
      insertData.competition_level = "K1"; // enum constraint, hoopers uses sport+level via dog
    }
    const { error } = await supabase.from("competition_results").insert(insertData);
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara resultat");
      return;
    }
    toast.success("Resultat sparat");
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[640px] bg-v3-canvas rounded-t-v3-2xl lg:rounded-v3-2xl lg:mb-10 max-h-[92vh] flex flex-col shadow-v3-xl animate-v3-sheet-in-4">
        <header className="flex items-center justify-between px-5 py-4 border-b border-v3-canvas-sunken/40 shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
              Logga resultat
            </div>
            <h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-none mt-1">
              {dog ? dog.name : "Nytt resultat"}
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
              placeholder="t.ex. Vårtävling Norrköping"
              className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum" icon={<Calendar size={14} />}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
            </Field>
            <Field label="Arrangör">
              <input
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="Klubb/organisation"
                className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
            </Field>
          </div>

          {!isHoopers && (
            <Field label="Disciplin">
              <div className="flex flex-wrap gap-1.5">
                {AGILITY_DISCIPLINES.map((d) => (
                  <Pill key={d} active={discipline === d} onClick={() => setDiscipline(d)}>
                    {d}
                  </Pill>
                ))}
              </div>
            </Field>
          )}

          <Field label={isHoopers ? "Hoopers-klass" : "Klass"}>
            <div className="flex flex-wrap gap-1.5">
              {(isHoopers ? HOOPERS_LEVELS : AGILITY_LEVELS).map((l) => (
                <Pill key={l} active={level === l} onClick={() => setLevel(l)}>
                  {l}
                </Pill>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Placering">
              <input
                inputMode="numeric"
                value={placement}
                onChange={(e) => setPlacement(e.target.value.replace(/\D/g, ""))}
                placeholder="—"
                className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
            </Field>
            <Field label="Fel">
              <input
                inputMode="numeric"
                value={faults}
                onChange={(e) => setFaults(e.target.value.replace(/\D/g, ""))}
                className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
            </Field>
            <Field label="Tid (s)">
              <input
                inputMode="decimal"
                value={timeSec}
                onChange={(e) => setTimeSec(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                placeholder="0.00"
                className="w-full h-11 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
              />
            </Field>
          </div>

          <Field label="Status">
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={passed && !disq}
                onClick={() => {
                  setPassed(true);
                  setDisq(false);
                }}
                icon={<CheckCircle2 size={13} />}
              >
                Godkänd
              </Pill>
              <Pill
                active={!passed && !disq}
                onClick={() => {
                  setPassed(false);
                  setDisq(false);
                }}
                icon={<AlertCircle size={13} />}
              >
                Ej godkänd
              </Pill>
              <Pill
                active={disq}
                onClick={() => {
                  setPassed(false);
                  setDisq(true);
                }}
                icon={<AlertCircle size={13} />}
              >
                Diskad
              </Pill>
            </div>
          </Field>

          <Field label="Anteckningar">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vad gick bra? Vad kan förbättras?"
              rows={3}
              className="w-full px-3 py-2 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/60 text-v3-base text-v3-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-v3-brand-500/40"
            />
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
            <Trophy size={14} strokeWidth={1.8} />
            Spara resultat
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary mb-2">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Pill({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-v3-base text-v3-sm font-medium transition-colors inline-flex items-center gap-1.5",
        active
          ? "bg-v3-text-primary text-v3-text-inverse"
          : "bg-v3-canvas-elevated text-v3-text-secondary border border-v3-canvas-sunken/60 hover:bg-v3-canvas-sunken",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
