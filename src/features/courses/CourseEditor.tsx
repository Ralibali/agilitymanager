import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAction } from "@/features/coaching/useAction";
import {
  courseInstructor, parseCourseSessions, toDateTimeInput, trainingCourseSchema,
  type TrainingCourse,
} from "./courses";

const input = "mt-1 min-h-12 w-full rounded-xl border-2 border-ink/25 bg-white px-3 py-2 text-base focus:border-ink focus:outline-none disabled:bg-ink/5 disabled:text-ink/60";
const label = "block text-sm font-bold";

export function CourseEditor({ course, onSave, onCancel }: {
  course?: TrainingCourse;
  onSave: (course: TrainingCourse) => void;
  onCancel: () => void;
}) {
  const [id] = useState(() => course?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [location, setLocation] = useState(course?.location ?? "");
  const [sport, setSport] = useState(course?.sport ?? "agility");
  const [level, setLevel] = useState(course?.level ?? "");
  const [capacity, setCapacity] = useState(String(course?.max_teams ?? 6));
  const [price, setPrice] = useState(String(course?.price_sek ?? 0));
  const [payment, setPayment] = useState(course?.payment_instructions ?? "");
  const [sessions, setSessions] = useState(() => course?.sessions.map((session) => ({
    key: crypto.randomUUID(),
    starts_at: toDateTimeInput(session.starts_at),
    ends_at: toDateTimeInput(session.ends_at),
  })) ?? [{ key: crypto.randomUUID(), starts_at: "", ends_at: "" }]);
  const action = useAction();
  const termsLocked = Boolean(course && course.confirmed_count + course.waitlist_count > 0);

  return (
    <form className="space-y-6 rounded-3xl border-2 border-ink bg-white p-5 sm:p-7" onSubmit={(event) => {
      event.preventDefault();
      void action.run(async () => {
        const maxTeams = Number(capacity);
        const priceSek = Number(price);
        if (!Number.isInteger(maxTeams) || maxTeams < 1 || maxTeams > 100) throw Error("Ange 1–100 platser.");
        if (!Number.isInteger(priceSek) || priceSek < 0 || priceSek > 100000) throw Error("Ange priset i hela kronor, 0–100 000 kr.");
        const data = {
          title: title.trim(), description: description.trim(), location: location.trim(),
          sport, level: level.trim(), max_teams: maxTeams, price_sek: priceSek,
          payment_instructions: payment.trim(),
          sessions: termsLocked && course ? course.sessions.map(({ starts_at, ends_at }) => ({ starts_at, ends_at })) : parseCourseSessions(sessions),
          ...(course ? { revision: course.revision } : {}),
        };
        const saved = trainingCourseSchema.parse(await courseInstructor("save", id, data));
        onSave(saved);
      });
    }}>
      <div>
        <h2 className="font-display text-3xl">{course ? "Redigera kurs" : "Skapa din nästa kurs"}</h2>
        <p className="mt-2 text-sm text-ink/70">Spara ett utkast och granska kursen innan du publicerar den.</p>
      </div>
      <label className={label}>Kursnamn
        <input className={input} required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Till exempel agility för nybörjare" />
      </label>
      <label className={label}>Om kursen
        <textarea className={`${input} min-h-36`} required minLength={10} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vad tränar ni på? Vem passar kursen för? Vad ska deltagarna ta med?" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Sport
          <select className={input} disabled={termsLocked} value={sport} onChange={(e) => setSport(e.target.value as "agility" | "hoopers")}>
            <option value="agility">Agility</option><option value="hoopers">Hoopers</option>
          </select>
        </label>
        <label className={label}>Nivå / förkunskaper
          <input className={input} disabled={termsLocked} required maxLength={120} value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Till exempel nybörjare eller klass 1" />
        </label>
      </div>
      <label className={label}>Träningsplats och adress
        <input className={input} disabled={termsLocked} required maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hall, klubb eller träningsplan samt ort" />
      </label>
      <label className={label}>Max antal ekipage
        <input type="number" className={`${input} sm:max-w-48`} required min={Math.max(1, course?.confirmed_count ?? 1)} max={100} step={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        <span className="mt-1 block text-xs font-normal text-ink/65">Ett ekipage är en förare och en hund. När platserna är slut används väntelistan.</span>
      </label>
      {termsLocked && <p className="rounded-xl bg-paper p-4 text-sm" role="note">Kursen har anmälningar. Sport, nivå, plats, datum och betalningsvillkor är låsta så att deltagarnas villkor ligger fast. Du kan ändra namn och beskrivning samt antalet platser.</p>}
      <fieldset disabled={termsLocked} className="space-y-4">
        <legend className="font-display text-2xl">Kurstillfällen</legend>
        <p className="text-sm text-ink/65">Alla datum och tider anges och visas i svensk tid (Stockholm).</p>
        {sessions.map((session, index) => (
          <div key={session.key} className="rounded-2xl border border-ink/20 bg-paper/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold">Tillfälle {index + 1}</p>
              {sessions.length > 1 && <button type="button" disabled={termsLocked} aria-label={`Ta bort tillfälle ${index + 1}`} className="flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ember disabled:opacity-50" onClick={() => setSessions((old) => old.filter((row) => row.key !== session.key))}><Trash2 className="h-4 w-4" aria-hidden /> Ta bort</button>}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className={`${label} min-w-0`}>Start
                <input type="datetime-local" className={`${input} min-w-0`} required value={session.starts_at} onChange={(e) => setSessions((old) => old.map((row) => row.key === session.key ? { ...row, starts_at: e.target.value } : row))} />
              </label>
              <label className={`${label} min-w-0`}>Slut
                <input type="datetime-local" className={`${input} min-w-0`} required value={session.ends_at} onChange={(e) => setSessions((old) => old.map((row) => row.key === session.key ? { ...row, ends_at: e.target.value } : row))} />
              </label>
            </div>
          </div>
        ))}
        <button type="button" disabled={sessions.length >= 30 || termsLocked} className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink px-4 text-sm font-bold disabled:opacity-40" onClick={() => setSessions((old) => [...old, { key: crypto.randomUUID(), starts_at: "", ends_at: "" }])}><Plus className="h-4 w-4" aria-hidden /> Lägg till datum</button>
      </fieldset>
      <fieldset disabled={termsLocked} className="space-y-4">
        <legend className="font-display text-2xl">Pris och betalning</legend>
        <label className={label}>Totalpris per ekipage, i SEK
          <input type="number" className={`${input} sm:max-w-48`} required min={0} max={100000} step={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          <span className="mt-1 block text-xs font-normal text-ink/65">Ange slutpriset för hela kursen, inklusive eventuell moms. Ange 0 för en gratis kurs.</span>
        </label>
        {Number(price) > 0 && <label className={label}>Betalningsinformation och avbokningsvillkor
          <textarea className={`${input} min-h-28`} required maxLength={1000} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="Till exempel Swishnummer, betalningsfrist, referens samt vad som gäller vid avbokning." />
          <span className="mt-1 block text-xs font-normal text-ink/65">Deltagaren betalar direkt till dig. Du markerar mottagen betalning i deltagarlistan.</span>
        </label>}
      </fieldset>
      {action.error && <p role="alert" className="rounded-xl bg-ember/10 p-4 text-sm font-semibold text-ember">{action.error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-ink/15 pt-5">
        <button disabled={action.busy} className="pressable shadow-hard-sm min-h-12 rounded-full border-2 border-ink bg-tang px-6 font-bold disabled:opacity-50">{action.busy ? "Sparar…" : course ? "Spara ändringar" : "Spara utkast"}</button>
        <button type="button" disabled={action.busy} onClick={onCancel} className="min-h-12 rounded-full border-2 border-ink px-5 font-bold disabled:opacity-50">Avbryt</button>
      </div>
    </form>
  );
}
