import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Loader2, Calendar, Weight, Check, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { V3Dog } from "@/hooks/v3/useV3Dogs";
import { HEALTH_TYPES, type V3HealthLog } from "@/hooks/v3/useV3Health";

interface Props {
  open: boolean;
  onClose: () => void;
  dog: V3Dog | null;
  editing?: V3HealthLog | null;
  onSaved?: () => void;
}

const schema = z.object({
  type: z.string(),
  title: z.string().trim().min(1, "Ange en titel").max(140),
  description: z.string().trim().max(500).optional(),
  date: z.string().min(1, "Välj datum"),
  weight_kg: z.number().positive().nullable(),
  next_date: z.string().nullable(),
});

const todayISO = () => new Date().toISOString().slice(0, 10);

export function V3AddHealthSheet({ open, onClose, dog, editing, onSaved }: Props) {
  const { user } = useAuth();
  const [type, setType] = useState<string>("vet_visit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? "vet_visit");
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setDate(editing?.date ?? todayISO());
    setWeight(editing?.weight_kg?.toString() ?? "");
    setNextDate(editing?.next_date ?? "");
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = !!editing;
  const isWeight = type === "weight";
  const selectedType = HEALTH_TYPES.find((t) => t.value === type);

  const handleSave = async () => {
    if (!user?.id || !dog) return;
    const parsed = schema.safeParse({
      type,
      title: title || selectedType?.label || "Logg",
      description,
      date,
      weight_kg: isWeight && weight ? Number(weight) : weight ? Number(weight) : null,
      next_date: nextDate || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Kontrollera fälten");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        dog_id: dog.id,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        date: parsed.data.date,
        weight_kg: parsed.data.weight_kg,
        next_date: parsed.data.next_date,
      };

      if (isEdit && editing) {
        const { error } = await supabase.from("health_logs").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Hälsologg uppdaterad");
      } else {
        const { error } = await supabase.from("health_logs").insert(payload);
        if (error) throw error;
        toast.success("Hälsologg sparad");
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] font-v3-sans" role="dialog" aria-modal="true" aria-label={isEdit ? "Redigera hälsologg" : "Ny hälsologg"}>
      <button type="button" aria-label="Stäng" onClick={onClose} className="absolute inset-0 bg-v3-text-primary/42 backdrop-blur-[2px] animate-in fade-in duration-200" />

      <div className={cn(
        "absolute inset-x-0 bottom-0 bg-v3-canvas-elevated shadow-v3-xl flex flex-col overflow-hidden",
        "max-h-[92vh] rounded-t-v3-2xl pb-[env(safe-area-inset-bottom,0px)] animate-v3-sheet-in",
        "lg:inset-x-auto lg:right-6 lg:top-6 lg:bottom-6 lg:w-[680px] lg:max-w-[calc(100vw-3rem)] lg:max-h-none lg:rounded-v3-2xl lg:animate-v3-scale-in",
      )}>
        <div className="flex justify-center pt-2.5 pb-1 shrink-0 lg:hidden">
          <span className="h-1 w-9 rounded-full bg-v3-canvas-sunken" />
        </div>

        <div className="shrink-0 px-5 lg:px-7 pt-4 lg:pt-6 pb-4 border-b border-v3-canvas-sunken/40">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">
                <Stethoscope size={13} strokeWidth={1.8} /> Hälsa
              </div>
              <h2 className="font-v3-display text-[26px] lg:text-[32px] leading-tight tracking-[-0.025em] text-v3-text-primary mt-1 truncate">
                {isEdit ? "Redigera hälsologg" : "Ny hälsologg"}
              </h2>
              <p className="text-v3-sm text-v3-text-secondary mt-1">
                {dog ? `För ${dog.name}` : "Välj hund för att spara loggen"}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Stäng" className="h-9 w-9 grid place-items-center rounded-full text-v3-text-tertiary hover:bg-v3-canvas-sunken/70 hover:text-v3-text-primary transition-colors shrink-0">
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 lg:px-7 py-5 lg:py-6 space-y-5">
          <section>
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary">Typ av logg</label>
                <p className="text-v3-xs text-v3-text-secondary mt-1">Välj det som bäst beskriver händelsen.</p>
              </div>
              {selectedType && <span className="hidden sm:inline-flex items-center rounded-full bg-v3-brand-500/10 px-3 py-1 text-v3-xs font-medium text-v3-brand-700">{selectedType.label}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {HEALTH_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => setType(t.value)} className={cn(
                    "min-h-[82px] rounded-v3-xl border p-3 text-center transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-v3-brand-500/30",
                    active
                      ? "border-v3-brand-500/35 bg-v3-brand-500/10 text-v3-text-primary shadow-v3-xs"
                      : "border-v3-canvas-sunken/60 bg-v3-canvas hover:bg-v3-canvas-sunken/45 text-v3-text-secondary",
                  )}>
                    <span className="block text-[24px] leading-none">{t.emoji}</span>
                    <span className="block mt-2 text-v3-xs font-semibold leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <Field label="Titel">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Årsvaccin" className={inputClass} maxLength={140} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Datum" icon={<Calendar size={13} strokeWidth={1.8} />}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Påminn nästa" icon={<Calendar size={13} strokeWidth={1.8} />}>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label={isWeight ? "Vikt (kg) *" : "Vikt (kg)"} icon={<Weight size={13} strokeWidth={1.8} />}>
            <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={isWeight ? "12.5" : "valfritt"} className={inputClass} />
          </Field>

          <Field label="Anteckningar">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detaljer, dosering, veterinärens namn…" rows={4} className={cn(inputClass, "h-auto min-h-[116px] resize-none py-3 leading-relaxed")} maxLength={500} />
          </Field>
        </div>

        <div className="shrink-0 border-t border-v3-canvas-sunken/40 bg-v3-canvas-elevated px-5 lg:px-7 py-3 flex items-center gap-3">
          <button type="button" onClick={onClose} className="h-11 px-4 rounded-v3-base text-v3-sm font-medium text-v3-text-secondary hover:bg-v3-canvas-sunken/70 transition-colors">
            Avbryt
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !dog} className={cn(
            "flex-1 h-11 rounded-v3-base inline-flex items-center justify-center gap-2",
            "bg-v3-brand-500 text-white text-v3-sm font-medium shadow-v3-sm",
            "hover:bg-v3-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          )}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Sparar…</> : <><Check size={16} strokeWidth={2} />{isEdit ? "Spara ändringar" : "Spara logg"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full h-11 px-3.5 rounded-v3-base bg-v3-canvas border border-v3-canvas-sunken/60 text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary focus:outline-none focus:border-v3-brand-500/60 focus:ring-2 focus:ring-v3-brand-500/15 transition-colors";

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-medium text-v3-text-tertiary mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
