import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Stethoscope,
  Syringe,
  Weight,
  Calendar as CalendarIcon,
  Trash2,
  HeartPulse,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { sv } from "date-fns/locale";
import {
  PageHeader,
  PageSkeleton,
  DSCard,
  DSButton,
  DSEmptyState,
  MetricCard,
  SegmentedControl,
} from "@/components/ds";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/WeightChart";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import type { Dog } from "@/types";
import { toast } from "sonner";

type HealthLog = {
  id: string;
  dog_id: string;
  date: string;
  type: string;
  title: string;
  description: string;
  weight_kg: number | null;
  next_date: string | null;
  created_at: string;
};

const LOG_TYPES = [
  { value: "vet_visit", label: "Veterinär", icon: Stethoscope },
  { value: "vaccination", label: "Vaccin", icon: Syringe },
  { value: "weight", label: "Vikt", icon: Weight },
  { value: "other", label: "Övrigt", icon: CalendarIcon },
] as const;

type FilterTab = "all" | "vet_visit" | "vaccination" | "weight";

export default function V2HealthPage() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>("all");

  // form
  const [dogId, setDogId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [type, setType] = useState("vet_visit");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [d, { data }] = await Promise.all([
      store.getDogs(),
      supabase.from("health_logs").select("*").order("date", { ascending: false }),
    ]);
    setDogs(d);
    setLogs((data as HealthLog[]) || []);
    if (d.length > 0 && !dogId) setDogId(d[0].id);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const upcoming = useMemo(
    () =>
      logs
        .filter((l) => l.next_date && isAfter(new Date(l.next_date), new Date()))
        .sort((a, b) => (a.next_date! < b.next_date! ? -1 : 1)),
    [logs],
  );

  const filtered = useMemo(
    () => (tab === "all" ? logs : logs.filter((l) => l.type === tab)),
    [logs, tab],
  );

  const handleSubmit = async () => {
    if (!dogId || !title.trim()) return;
    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("health_logs").insert({
      user_id: userId,
      dog_id: dogId,
      date,
      type,
      title: title.trim(),
      description: description.trim(),
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      next_date: nextDate || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Kunde inte spara");
    } else {
      toast.success("Hälsologg sparad");
      setOpen(false);
      setTitle("");
      setDescription("");
      setWeightKg("");
      setNextDate("");
      refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("health_logs").delete().eq("id", id);
    toast.success("Raderad");
    refresh();
  };

  const getDog = (id: string) => dogs.find((d) => d.id === id);
  const getTypeInfo = (t: string) => LOG_TYPES.find((lt) => lt.value === t) || LOG_TYPES[3];

  if (loading) return <PageSkeleton />;

  const addAction = dogs.length > 0 && (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DSButton variant="primary">
          <Plus className="w-4 h-4" /> Ny logg
        </DSButton>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny hälsologg</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Hund</Label>
            <Select value={dogId} onValueChange={setDogId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {dogs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOG_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Titel *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Årlig kontroll" />
          </div>
          <div>
            <Label>Beskrivning</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          {type === "weight" && (
            <div>
              <Label>Vikt (kg)</Label>
              <Input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
          )}
          {(type === "vaccination" || type === "vet_visit") && (
            <div>
              <Label>Nästa datum</Label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim() || saving}>
            {saving ? "Sparar…" : "Spara"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Hundar"
        title="Hälsa"
        subtitle="Logga veterinärbesök, vacciner och vikt – håll koll på nästa kontroll."
        actions={addAction}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Loggar totalt" value={logs.length} hint="alla typer" />
        <MetricCard label="Kommande" value={upcoming.length} hint="påminnelser" />
        <MetricCard
          label="Vägningar"
          value={logs.filter((l) => l.type === "weight").length}
          hint="loggade"
        />
        <MetricCard
          label="Vaccinationer"
          value={logs.filter((l) => l.type === "vaccination").length}
          hint="dokumenterade"
        />
      </div>

      {upcoming.length > 0 && (
        <DSCard className="space-y-3">
          <h2 className="text-h2 text-text-primary">Kommande</h2>
          <ul className="divide-y divide-border-subtle">
            {upcoming.slice(0, 5).map((l) => {
              const dog = getDog(l.dog_id);
              const info = getTypeInfo(l.type);
              const Icon = info.icon;
              return (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-ds-sm bg-subtle text-text-secondary">
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-body text-text-primary truncate">{l.title}</div>
                    <div className="text-small text-text-tertiary">
                      {dog?.name} · {info.label}
                    </div>
                  </div>
                  <div className="text-small text-brand-700 tabular-nums">
                    {format(new Date(l.next_date!), "d MMM yyyy", { locale: sv })}
                  </div>
                </li>
              );
            })}
          </ul>
        </DSCard>
      )}

      {logs.some((l) => l.weight_kg) && (
        <DSCard>
          <WeightChart logs={logs} dogs={dogs} />
        </DSCard>
      )}

      <SegmentedControl<FilterTab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: `Alla (${logs.length})` },
          { value: "vet_visit", label: "Veterinär" },
          { value: "vaccination", label: "Vaccin" },
          { value: "weight", label: "Vikt" },
        ]}
      />

      {filtered.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={HeartPulse}
            title="Inga loggar att visa"
            description={
              dogs.length === 0
                ? "Lägg till en hund först för att kunna logga hälsa."
                : "När du loggar hälsa hamnar det här."
            }
            action={addAction}
          />
        </DSCard>
      ) : (
        <DSCard className="p-0">
          <ul className="divide-y divide-border-subtle">
            {filtered.map((log) => {
              const dog = getDog(log.dog_id);
              const info = getTypeInfo(log.type);
              const Icon = info.icon;
              return (
                <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-ds-sm bg-subtle text-text-secondary">
                    <Icon size={16} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-body text-text-primary truncate">{log.title}</h3>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-text-tertiary hover:text-semantic-danger transition-colors"
                        aria-label="Radera"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-small text-text-tertiary">
                      {format(new Date(log.date), "d MMM yyyy", { locale: sv })} · {info.label}
                      {dog && ` · ${dog.name}`}
                    </div>
                    {log.description && (
                      <p className="mt-1 text-small text-text-secondary">{log.description}</p>
                    )}
                    {log.weight_kg && (
                      <div className="mt-1 text-small font-medium text-text-primary">
                        {log.weight_kg} kg
                      </div>
                    )}
                    {log.next_date && (
                      <div className="mt-1 text-small text-brand-700">
                        Nästa: {format(new Date(log.next_date), "d MMM yyyy", { locale: sv })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </DSCard>
      )}
    </div>
  );
}
