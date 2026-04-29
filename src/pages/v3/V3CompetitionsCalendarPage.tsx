import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Plus, MapPin, ExternalLink, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useV3Dogs } from "@/hooks/v3/useV3Dogs";
import { V3AddPlannedSheet } from "@/components/v3/V3AddPlannedSheet";
import { CompetitionRemindersDialog } from "@/components/v3/CompetitionRemindersDialog";
import { V3Page, V3PageHero, V3PrimaryButton, V3SecondaryButton } from "@/components/v3/V3Page";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlannedRow {
  id: string;
  user_id: string;
  dog_id: string;
  event_name: string;
  date: string;
  location: string | null;
  signup_url: string | null;
  status: string;
}

const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7; // måndag = 0
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function V3CompetitionsCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dogs, active } = useV3Dogs();
  const [planned, setPlanned] = useState<PlannedRow[]>([]);
  const [reminderCounts, setReminderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [planSheet, setPlanSheet] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<PlannedRow | null>(null);

  const load = async () => {
    if (!user?.id) { setPlanned([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("planned_competitions")
      .select("id, user_id, dog_id, event_name, date, location, signup_url, status")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    if (error) {
      toast.error("Kunde inte ladda kalender");
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as PlannedRow[];
    setPlanned(rows);

    if (rows.length > 0) {
      const { data: rems } = await supabase
        .from("competition_reminders")
        .select("planned_competition_id")
        .in("planned_competition_id", rows.map((r) => r.id));
      const counts: Record<string, number> = {};
      (rems ?? []).forEach((r: any) => {
        counts[r.planned_competition_id] = (counts[r.planned_competition_id] ?? 0) + 1;
      });
      setReminderCounts(counts);
    } else {
      setReminderCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const dogMap = useMemo(() => new Map(dogs.map((d) => [d.id, d])), [dogs]);
  const grid = useMemo(() => buildGrid(month), [month]);
  const byDate = useMemo(() => {
    const m = new Map<string, PlannedRow[]>();
    planned.forEach((p) => {
      const key = p.date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return m;
  }, [planned]);

  const today = new Date();
  const selectedItems = selectedDate ? (byDate.get(isoDate(selectedDate)) ?? []) : [];

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("planned_competitions").delete().eq("id", id);
    if (error) { toast.error("Kunde inte ta bort"); return; }
    toast.success("Borttagen");
    await load();
  };

  return (
    <V3Page>
      <V3PageHero
        eyebrow="Tävlingar"
        title="Kalender & påminnelser"
        description="Översikt över alla planerade tävlingar. Klicka på en dag för detaljer eller sätt flera påminnelser per tävling."
        icon={CalendarIcon}
      >
        <V3SecondaryButton onClick={() => navigate("/v3/competition")} icon={CalendarIcon}>Listvy</V3SecondaryButton>
        <V3PrimaryButton onClick={() => setPlanSheet(true)} icon={Plus}>Planera tävling</V3PrimaryButton>
      </V3PageHero>

      <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 lg:p-6 shadow-v3-xs">
        <header className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-v3-display text-v3-2xl text-v3-text-primary leading-tight capitalize">
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </h2>
            <p className="text-v3-xs text-v3-text-tertiary mt-0.5">{planned.length} planerade totalt</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Föregående månad" className="h-10 w-10 rounded-v3-base border border-v3-canvas-sunken/60 grid place-items-center hover:bg-v3-canvas-sunken transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => { const t = new Date(); setMonth(startOfMonth(t)); setSelectedDate(t); }} className="h-10 px-3 rounded-v3-base border border-v3-canvas-sunken/60 text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors">
              Idag
            </button>
            <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Nästa månad" className="h-10 w-10 rounded-v3-base border border-v3-canvas-sunken/60 grid place-items-center hover:bg-v3-canvas-sunken transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-7 gap-1 text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary mb-1.5">
          {WEEKDAYS.map((w) => <div key={w} className="text-center py-1">{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = isSameDay(d, today);
            const isSelected = selectedDate && isSameDay(d, selectedDate);
            const items = byDate.get(isoDate(d)) ?? [];
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "relative aspect-square sm:aspect-auto sm:min-h-[68px] rounded-v3-base p-1.5 text-left transition-colors flex flex-col",
                  inMonth ? "bg-v3-canvas" : "bg-transparent text-v3-text-tertiary",
                  isSelected ? "ring-2 ring-v3-brand-500" : "border border-v3-canvas-sunken/30",
                  !isSelected && "hover:bg-v3-canvas-sunken/40"
                )}
              >
                <span className={cn(
                  "text-v3-xs tabular-nums inline-flex items-center justify-center",
                  isToday && "h-5 w-5 rounded-full bg-v3-brand-500 text-white font-semibold",
                  !isToday && (inMonth ? "text-v3-text-primary" : "text-v3-text-tertiary")
                )}>{d.getDate()}</span>
                {items.length > 0 && (
                  <div className="mt-auto space-y-0.5">
                    {items.slice(0, 2).map((it) => (
                      <div key={it.id} className="text-[10px] leading-tight px-1 py-0.5 rounded bg-v3-brand-500/12 text-v3-brand-700 truncate">
                        {it.event_name}
                      </div>
                    ))}
                    {items.length > 2 && <div className="text-[10px] text-v3-text-tertiary">+{items.length - 2} till</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-4 lg:p-6 shadow-v3-xs">
        <h3 className="font-v3-display text-v3-2xl text-v3-text-primary mb-3">
          {selectedDate ? selectedDate.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" }) : "Välj en dag"}
        </h3>
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 rounded-v3-lg v3-skeleton" />)}</div>
        ) : selectedItems.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-v3-base text-v3-text-secondary">Inga planerade tävlingar denna dag.</p>
            <button type="button" onClick={() => setPlanSheet(true)} className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600 transition-colors">
              <Plus size={14} /> Planera ny tävling
            </button>
          </div>
        ) : (
          <ol className="space-y-2">
            {selectedItems.map((p) => {
              const dog = dogMap.get(p.dog_id);
              const reminderCount = reminderCounts[p.id] ?? 0;
              return (
                <li key={p.id} className="rounded-v3-xl bg-v3-canvas border border-v3-canvas-sunken/40 p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-v3-base font-medium text-v3-text-primary truncate">{p.event_name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-v3-xs text-v3-text-tertiary">
                        {dog && <span>🐕 {dog.name}</span>}
                        {p.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{p.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.signup_url && (
                        <a href={p.signup_url} target="_blank" rel="noopener noreferrer" aria-label="Öppna anmälan" className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-v3-text-primary hover:bg-v3-canvas-sunken transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button type="button" onClick={() => handleDelete(p.id)} aria-label="Ta bort" className="h-9 w-9 rounded-full grid place-items-center text-v3-text-tertiary hover:text-coral hover:bg-coral/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReminderTarget(p)}
                    className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-v3-base bg-v3-canvas-sunken/60 text-v3-text-primary text-v3-sm font-medium hover:bg-v3-canvas-sunken transition-colors"
                  >
                    <Bell size={13} className="text-v3-brand-600" />
                    {reminderCount === 0 ? "Sätt påminnelser" : `${reminderCount} påminnelse${reminderCount === 1 ? "" : "r"}`}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <V3AddPlannedSheet open={planSheet} onClose={() => setPlanSheet(false)} dog={active} onSaved={load} />
      <CompetitionRemindersDialog
        open={!!reminderTarget}
        onClose={() => setReminderTarget(null)}
        planned={reminderTarget}
        onChanged={load}
      />
    </V3Page>
  );
}
