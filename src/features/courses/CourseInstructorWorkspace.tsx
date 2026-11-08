import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowUpRight, CalendarDays, Plus, Users } from "lucide-react";
import { z } from "zod";
import { useAction } from "@/features/coaching/useAction";
import { CourseEditor } from "./CourseEditor";
import {
  courseDate, courseInstructor, coursePrice, instructorCourseSchema,
  registrationLabel, sessionTime, trainingCourseSchema,
  type CourseRegistration, type InstructorCourse, type TrainingCourse,
} from "./courses";

const button = "min-h-11 rounded-full border-2 border-ink px-5 text-sm font-bold disabled:opacity-50";
const courseStatus = { draft: "Utkast", published: "Publicerad", cancelled: "Inställd" };

export function CourseInstructorWorkspace() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setCourses(z.array(trainingCourseSchema).parse(await courseInstructor("list"))); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Kunde inte hämta dina kurser."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (creating) return <CourseEditor onCancel={() => setCreating(false)} onSave={(course) => { setCreating(false); setSelected(course.id); void load(); }} />;
  if (selected) return <InstructorCourseBoard courseId={selected} onBack={() => { setSelected(null); void load(); }} onChanged={() => void load()} />;
  return <section data-private="true">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-display text-3xl">Mina kurser</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">Planera datumen, publicera kursen och samla ekipagen här. Fortsätt med grupper och träningsuppgifter i ditt <Link to="/instruktor" className="font-semibold underline">instruktörsrum</Link>.</p></div>
      <button onClick={() => setCreating(true)} className="pressable shadow-hard-sm inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink bg-tang px-5 font-bold"><Plus className="h-5 w-5" aria-hidden /> Skapa kurs</button>
    </div>
    {loading && <p role="status" className="mt-6">Hämtar dina kurser…</p>}
    {error && <div role="alert" className="mt-6 rounded-xl bg-ember/10 p-4 text-sm text-ember"><p>{error}</p><button onClick={() => void load()} className="mt-2 min-h-11 font-bold underline">Försök igen</button></div>}
    {!loading && !error && courses.length === 0 && <div className="mt-6 rounded-3xl border-2 border-dashed border-ink/25 p-7"><h3 className="font-display text-2xl">Från idé till full kurs</h3><p className="mt-3 max-w-xl leading-relaxed text-ink/70">Skapa din första kurs med datum, plats och max antal ekipage. Du väljer när utkastet blir synligt för deltagarna.</p></div>}
    {!loading && !error && <div className="mt-6 grid gap-4 md:grid-cols-2">{courses.map((course) => <article key={course.id} className="rounded-3xl border-2 border-ink bg-white p-5 shadow-hard-sm">
      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${course.status === "published" ? "bg-forest/10 text-forest" : course.status === "cancelled" ? "bg-ember/10 text-ember" : "bg-tang/20"}`}>{courseStatus[course.status]}</span>
      <h3 className="mt-3 font-display text-3xl">{course.title}</h3>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink/70"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden />{course.sessions[0] ? courseDate(course.sessions[0].starts_at) : "Datum saknas"}</p>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink/70"><Users className="h-4 w-4 shrink-0" aria-hidden />{course.confirmed_count}/{course.max_teams} ekipage · {course.waitlist_count} på väntelistan</p>
      <button onClick={() => setSelected(course.id)} className={`${button} mt-5 bg-paper`}>Hantera kurs</button>
    </article>)}</div>}
  </section>;
}

function InstructorCourseBoard({ courseId, onBack, onChanged }: { courseId: string; onBack: () => void; onChanged: () => void }) {
  const [board, setBoard] = useState<InstructorCourse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState("");
  const action = useAction();
  const load = useCallback(async () => {
    try { setBoard(instructorCourseSchema.parse(await courseInstructor("view", courseId))); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Kunde inte hämta kursen."); }
    finally { setLoading(false); }
  }, [courseId]);
  useEffect(() => { void load(); }, [load]);
  const changed = () => { void load(); onChanged(); };
  if (loading) return <p role="status">Hämtar kurs och deltagare…</p>;
  if (error || !board) return <div role="alert" className="rounded-xl bg-ember/10 p-5"><p>{error || "Kursen kunde inte hämtas."}</p><button className={`${button} mt-4`} onClick={onBack}>Till mina kurser</button><button className={`${button} ml-2 mt-4`} onClick={() => void load()}>Försök igen</button></div>;
  const { course, registrations } = board;
  if (editing) return <CourseEditor key={course.revision} course={course} onCancel={() => setEditing(false)} onSave={(updated) => { setBoard({ ...board, course: updated }); setEditing(false); setNotice("Ändringarna har sparats."); changed(); }} />;
  return <section className="space-y-6" data-private="true">
    <button onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold underline"><ArrowLeft className="h-4 w-4" aria-hidden /> Alla mina kurser</button>
    <article className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-forest">{courseStatus[course.status]} · {course.sport === "agility" ? "Agility" : "Hoopers"}</p><h2 className="mt-2 font-display text-4xl">{course.title}</h2></div>
        <p className="rounded-xl bg-paper px-4 py-3 font-bold">{coursePrice(course.price_sek)} / ekipage</p>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-ink/75">{course.description}</p>
      <p className="mt-4 text-sm"><strong>Plats:</strong> {course.location}<br /><strong>Nivå:</strong> {course.level}</p>
      <ol className="mt-4 space-y-2 text-sm">{course.sessions.map((session, i) => <li key={session.starts_at}><strong>Tillfälle {i + 1}:</strong> {sessionTime(session)}</li>)}</ol>
      <p className="mt-1 text-xs text-ink/65">Tiderna visas i svensk tid (Stockholm).</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {course.status !== "cancelled" && <button className={button} onClick={() => setEditing(true)}>Redigera kurs</button>}
        {course.status === "draft" && <button disabled={action.busy} className={`${button} bg-tang`} onClick={() => void action.run(async () => { const updated = trainingCourseSchema.parse(await courseInstructor("publish", course.id, { revision: course.revision })); setBoard({ ...board, course: updated }); setNotice("Kursen är publicerad och öppen för anmälan."); changed(); })}>{action.busy ? "Publicerar…" : "Publicera kurs"}</button>}
        {course.status === "published" && <Link className={`${button} inline-flex items-center gap-2 bg-paper`} to={`/kurser/${course.id}`}>Öppna kurslänk <ArrowUpRight className="h-4 w-4" aria-hidden /></Link>}
        {course.status !== "cancelled" && <button disabled={action.busy} className={`${button} text-ember`} onClick={() => setConfirmCancel(true)}>Ställ in kursen</button>}
      </div>
      {confirmCancel && <div className="mt-5 rounded-xl border border-ember/30 bg-ember/5 p-4"><p className="text-sm leading-relaxed">Vill du ställa in hela kursen? Alla anmälningar och väntelisteplatser avbokas. Kursen kan inte öppnas igen. Kontakta deltagarna själv om ändringen. Eventuell återbetalning hanteras direkt mellan dig och deltagarna.</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={action.busy} className={`${button} bg-ink text-paper`} onClick={() => void action.run(async () => { const updated = trainingCourseSchema.parse(await courseInstructor("cancel", course.id, { revision: course.revision })); setBoard({ ...board, course: updated }); setConfirmCancel(false); setNotice("Kursen är inställd. Kontakta deltagarna om eventuell återbetalning."); changed(); })}>{action.busy ? "Sparar…" : "Ja, ställ in kursen"}</button><button className={button} disabled={action.busy} onClick={() => setConfirmCancel(false)}>Behåll kursen</button></div></div>}
      {action.error && <p role="alert" className="mt-4 rounded-xl bg-ember/10 p-3 text-sm font-semibold text-ember">{action.error}</p>}
      {notice && <p role="status" className="mt-4 text-sm font-semibold text-forest">{notice}</p>}
    </article>
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-3xl">Deltagare och väntelista</h2><button className={button} onClick={() => void load()}>Uppdatera deltagarlistan</button></div>
      <p className="mt-2 text-sm text-ink/70">{course.confirmed_count} av {course.max_teams} platser bokade · {course.waitlist_count} på väntelistan. Kontaktuppgifterna är privata för dig och respektive deltagare.</p>
      {registrations.length === 0 ? <p className="mt-5 rounded-2xl border-2 border-dashed border-ink/20 p-6 text-ink/70">Inga anmälningar ännu. När kursen är publicerad kan du dela kurslänken med dina deltagare.</p> : <div className="mt-5 space-y-4">{[...registrations].sort((a, b) => ({ confirmed: 0, waitlisted: 1, cancelled: 2 })[a.status] - ({ confirmed: 0, waitlisted: 1, cancelled: 2 })[b.status]).map((registration) => <RosterRegistration key={`${registration.id}-${registration.revision}`} registration={registration} onChanged={changed} />)}</div>}
    </section>
  </section>;
}

function RosterRegistration({ registration, onChanged }: { registration: CourseRegistration; onChanged: () => void }) {
  const action = useAction();
  const [confirm, setConfirm] = useState<"cancel" | "paid" | "unpaid" | "refunded" | null>(null);
  const erased = !registration.profile_id;
  const paymentLabels = { not_required: "Gratis", unpaid: "Ej betald", paid: "Betald", refunded: "Återbetald" };
  return <article className="rounded-2xl border-2 border-ink/20 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{erased ? "Anonymiserad anmälan" : `${registration.participant_name} och ${registration.dog.name}`}</h3><p className="mt-1 text-sm text-ink/65">{registrationLabel(registration)}{registration.status === "waitlisted" && registration.waitlist_position ? ` · plats ${registration.waitlist_position}` : ""} · {paymentLabels[registration.payment_status]}{registration.price_sek ? ` · ${coursePrice(registration.price_sek)}` : ""}</p></div></div>
    {!erased && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><a href={`mailto:${registration.participant_email}`} className="break-all font-semibold underline">{registration.participant_email}</a>{registration.phone && <a href={`tel:${registration.phone.replace(/[^\d+]/g, "")}`} className="font-semibold underline">{registration.phone}</a>}</div>}
    {registration.status === "cancelled" && registration.payment_status === "paid" && <p className="mt-3 rounded-xl bg-tang/20 p-3 text-sm">Betalningen behöver stämmas av med deltagaren. Genomför eventuell återbetalning direkt och markera den sedan här.</p>}
    {!confirm && <div className="mt-3 flex flex-wrap gap-3">
      {registration.status === "confirmed" && registration.price_sek > 0 && <button disabled={action.busy} className={`${button} ${registration.payment_status === "unpaid" ? "bg-tang" : "bg-paper"}`} onClick={() => setConfirm(registration.payment_status === "paid" ? "unpaid" : "paid")}>{registration.payment_status === "paid" ? "Markera ej betald" : "Markera betald"}</button>}
      {registration.status === "cancelled" && registration.payment_status === "paid" && <button className={`${button} bg-tang`} onClick={() => setConfirm("refunded")}>Markera återbetald</button>}
      {registration.status !== "cancelled" && <button className={`${button} text-ember`} onClick={() => setConfirm("cancel")}>Avanmäl ekipage</button>}
    </div>}
    {confirm && <div className="mt-4 rounded-xl border border-ink/20 bg-paper p-4"><p className="text-sm">{confirm === "cancel" ? "Vill du avanmäla ekipaget? Nästa ekipage på väntelistan kan få plats automatiskt. Kontakta deltagaren om ändringen och hantera eventuell återbetalning direkt." : confirm === "paid" ? "Bekräfta att du har tagit emot betalningen från deltagaren." : confirm === "unpaid" ? "Vill du korrigera betalningsstatusen till ej betald? Ingen betalning eller återbetalning genomförs här." : "Bekräfta att du har återbetalat deltagaren. Detta ändrar bara statusen här och genomför ingen överföring."}</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={action.busy} className={`${button} bg-ink text-paper`} onClick={() => void action.run(async () => {
      await courseInstructor(confirm === "cancel" ? "cancel_registration" : "set_payment", registration.id, { course_id: registration.course_id, revision: registration.revision, ...(confirm !== "cancel" ? { payment_status: confirm } : {}), ...(confirm === "refunded" ? { refund_confirmed: true } : {}) });
      setConfirm(null); onChanged();
    })}>{action.busy ? "Sparar…" : "Bekräfta"}</button><button disabled={action.busy} className={button} onClick={() => setConfirm(null)}>Avbryt</button></div></div>}
    {action.error && <p role="alert" className="mt-3 text-sm font-semibold text-ember">{action.error}</p>}
  </article>;
}
