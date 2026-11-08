import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { useDogProfile } from "@/lib/dogMatch";
import { useDogProfileSync } from "@/lib/dogMatchSync";
import { useAction } from "@/features/coaching/useAction";
import {
  courseDate, courseParticipant, coursePrice, registrationLabel, registrationSchema,
  type CourseRegistration, type TrainingCourse,
} from "./courses";

function PaymentInformation({ registration }: { registration: CourseRegistration }) {
  if (registration.status === "waitlisted") return <p className="mt-3 text-sm text-ink/75">Du betalar först när du har fått en bekräftad plats. Uppdatera dina anmälningar för att se om en plats har blivit ledig.</p>;
  if (registration.status === "cancelled") return registration.payment_status === "paid" ? <p className="mt-3 rounded-xl bg-tang/20 p-3 text-sm font-semibold">Betalningen är markerad som mottagen. Eventuell återbetalning hanteras direkt mellan dig och instruktören.</p> : registration.payment_status === "refunded" ? <p className="mt-3 text-sm text-forest">Instruktören har markerat betalningen som återbetald.</p> : null;
  if (registration.price_sek === 0) return <p className="mt-3 text-sm text-forest">Kursen är gratis.</p>;
  return (
    <div className="mt-4 rounded-2xl bg-paper p-4">
      <p className="font-bold">{registration.payment_status === "paid" ? "Betalning mottagen" : `Att betala: ${coursePrice(registration.price_sek)}`}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{registration.payment_instructions}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink/65">Betala direkt till instruktören enligt betalningsinformationen. Instruktören markerar betalningen som mottagen. Eventuell återbetalning hanteras direkt mellan dig och instruktören.</p>
    </div>
  );
}

export function OwnRegistration({ registration, onChanged, showCourse = false }: {
  registration: CourseRegistration;
  onChanged: () => void;
  showCourse?: boolean;
}) {
  const [confirm, setConfirm] = useState<"cancel" | "erase" | null>(null);
  const action = useAction();
  const course = registration.course;
  return (
    <article className="rounded-2xl border-2 border-ink/20 bg-white p-5" data-private="true">
      {showCourse && course && <>
        <Link to={`/kurser/${course.id}`} className="font-display text-2xl underline-offset-4 hover:underline">{course.title}</Link>
        <p className="mt-1 text-sm text-ink/65">{course.location}{course.sessions[0] ? ` · ${courseDate(course.sessions[0].starts_at)}` : ""}</p>
      </>}
      <p className="mt-2 flex items-center gap-2 font-bold text-forest">
        {registration.status === "waitlisted" ? <Clock3 aria-hidden className="h-5 w-5 shrink-0" /> : registration.status === "confirmed" ? <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0" /> : null}
        {registrationLabel(registration)}
        {registration.status === "waitlisted" && registration.waitlist_position ? ` · plats ${registration.waitlist_position}` : ""}
      </p>
      <p className="mt-2 text-sm">{registration.participant_name} och {registration.dog.name || "raderad hunduppgift"}</p>
      <PaymentInformation registration={registration} />
      {confirm ? <div className="mt-4 rounded-xl border border-ember/30 p-4">
        <p className="text-sm">{confirm === "cancel" ? "Vill du avanmäla ekipaget? Din plats kan gå vidare till nästa ekipage på väntelistan. Eventuell återbetalning hanteras direkt mellan dig och instruktören." : "Vill du radera namn, e-post, telefon och hunduppgifter från den här avanmälan? Ett anonymiserat underlag för kurs och betalning sparas. Du kan inte ångra raderingen."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={action.busy} className="min-h-11 rounded-full border-2 border-ink bg-ink px-4 text-sm font-bold text-paper disabled:opacity-50" onClick={() => void action.run(async () => {
            await courseParticipant(confirm, registration.id, { course_id: registration.course_id, revision: registration.revision });
            setConfirm(null);
            onChanged();
          })}>{action.busy ? "Sparar…" : confirm === "cancel" ? "Ja, avanmäl" : "Ja, radera uppgifterna"}</button>
          <button disabled={action.busy} className="min-h-11 rounded-full border-2 border-ink px-4 text-sm font-bold" onClick={() => setConfirm(null)}>Behåll</button>
        </div>
      </div> : registration.status !== "cancelled" ? <button className="mt-3 min-h-11 rounded-full px-1 text-sm font-semibold underline" onClick={() => setConfirm("cancel")}>Avanmäl ekipaget</button> : registration.payment_status === "paid" ? <p className="mt-3 text-xs text-ink/65">Kontakta instruktören om återbetalning innan anmälningsuppgifterna kan raderas.</p> : <button className="mt-3 min-h-11 rounded-full px-1 text-sm font-semibold underline" onClick={() => setConfirm("erase")}>Radera mina anmälningsuppgifter</button>}
      {action.error && <p role="alert" className="mt-3 text-sm font-semibold text-ember">{action.error}</p>}
    </article>
  );
}

export function MyCourseRegistrations() {
  const [rows, setRows] = useState<CourseRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(z.array(registrationSchema).parse(await courseParticipant("list")));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Kunde inte hämta dina anmälningar."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-4" data-private="true">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-3xl">Mina anmälningar</h2>
      <button disabled={loading} onClick={() => void load()} className="min-h-11 rounded-full border-2 border-ink px-4 text-sm font-bold disabled:opacity-50">{loading ? "Uppdaterar…" : "Uppdatera status"}</button>
    </div>
    <p className="text-sm text-ink/70">Se din plats och betalning här. En ledig plats fördelas automatiskt till nästa ekipage på väntelistan. Inga automatiska mejl skickas.</p>
    {loading && <p role="status" className="py-6">Hämtar dina anmälningar…</p>}
    {error && <p role="alert" className="rounded-xl bg-ember/10 p-4 text-sm text-ember">{error}</p>}
    {!loading && !error && rows.length === 0 && <div className="rounded-3xl border-2 border-dashed border-ink/25 p-7"><p className="font-display text-2xl">Här börjar din nästa kurs</p><p className="mt-2 text-sm text-ink/70">Du har inga kursanmälningar med den här banprofilen ännu.</p><Link to="/kurser" className="mt-4 inline-block font-bold underline">Hitta en kurs</Link></div>}
    {!loading && !error && rows.map((registration) => <OwnRegistration key={`${registration.id}-${registration.revision}`} registration={registration} showCourse onChanged={() => void load()} />)}
  </section>;
}

export function CourseRegistrationPanel({ course, onProfile, onChanged }: {
  course: TrainingCourse;
  onProfile: () => void;
  onChanged: () => void;
}) {
  const { profile } = usePlannerProfile();
  return <section className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-5 sm:p-6" data-private="true">
    <h2 className="font-display text-3xl">{course.registration_open === false ? "Anmälan är stängd" : course.available_places > 0 ? "Anmäl ditt ekipage" : "Ställ dig på väntelistan"}</h2>
    {profile ? <RegistrationForm key={`${profile.id}-${course.id}`} course={course} onChanged={onChanged} /> : course.registration_open === false ? <p className="mt-3 text-sm text-ink/70">Kursen har redan börjat och tar inte emot fler anmälningar. Har du anmält dig tidigare hittar du din plats under <Link className="font-bold underline" to="/kurser?vy=anmalningar">Mina anmälningar</Link>.</p> : <>
      <p className="mt-3 leading-relaxed text-ink/70">Använd din befintliga banprofil eller skapa en profil med namn och e-post. Den ger dig tillgång till din anmälan i den här webbläsaren.</p>
      <button onClick={onProfile} className="pressable shadow-hard-sm mt-5 min-h-12 rounded-full border-2 border-ink bg-tang px-5 font-bold">Öppna banprofil och anmäl dig</button>
    </>}
  </section>;
}

function RegistrationForm({ course, onChanged }: { course: TrainingCourse; onChanged: () => void }) {
  const { profile: plannerProfile } = usePlannerProfile();
  const { profiles, profile: activeDog } = useDogProfile();
  useDogProfileSync();
  const [selectedDog, setSelectedDog] = useState("");
  const [dogName, setDogName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [id, setId] = useState(() => crypto.randomUUID());
  const action = useAction();
  useEffect(() => {
    let live = true;
    void courseParticipant("list").then((data) => {
      if (live) { setRegistrations(z.array(registrationSchema).parse(data).filter((row) => row.course_id === course.id)); setError(""); }
    }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Kunde inte kontrollera din anmälan."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [course.id, refresh]);
  const current = registrations.filter((row) => row.status !== "cancelled");
  const namedDogs = profiles.filter((dog) => dog.name.trim());
  const chosenDog = selectedDog ? profiles.find((dog) => dog.id === selectedDog) : null;
  return <div className="mt-4 space-y-4">
    {loading ? <p role="status">Kontrollerar dina anmälningar…</p> : error ? <div role="alert"><p className="text-sm text-ember">{error}</p><button onClick={() => setRefresh((n) => n + 1)} className="mt-2 min-h-11 font-bold underline">Försök igen</button></div> : <>
      {current.map((registration) => <OwnRegistration key={`${registration.id}-${registration.revision}`} registration={registration} onChanged={() => { setRefresh((n) => n + 1); onChanged(); }} />)}
      {course.registration_open === false ? <p className="text-sm text-ink/70">Kursen tar inte emot fler anmälningar. Du kan hantera dina befintliga anmälningar här eller under <Link className="font-bold underline" to="/kurser?vy=anmalningar">Mina anmälningar</Link>.</p> : <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        void action.run(async () => {
          const dog = chosenDog ?? { ...activeDog, id: `course-${id}`, name: dogName.trim(), sport: course.sport };
          if (!dog.name.trim()) throw Error("Ange hundens namn eller välj en sparad hundprofil.");
          if (!consent) throw Error("Godkänn att instruktören får dina anmälningsuppgifter.");
          registrationSchema.parse(await courseParticipant("register", id, { course_id: course.id, dog, phone: phone.trim(), consent: true }));
          setId(crypto.randomUUID());
          setConsent(false);
          setDogName("");
          setRefresh((n) => n + 1);
          onChanged();
        });
      }}>
        {current.length > 0 && <h3 className="pt-2 text-lg font-bold">Anmäl ytterligare ett ekipage</h3>}
        <p className="text-sm">Förare: <strong>{plannerProfile?.name}</strong><br /><span className="break-all text-ink/65">{plannerProfile?.email}</span></p>
        {namedDogs.length > 0 && <label className="block text-sm font-bold">Hundprofil
          <select aria-label="Hundprofil" aria-describedby="course-dog-profile-help" className="mt-1 min-h-12 w-full rounded-xl border-2 border-ink/25 bg-white px-3 text-base" value={selectedDog} onChange={(e) => setSelectedDog(e.target.value)}>
            <option value="">Annan hund / ange namn</option>
            {namedDogs.map((dog) => <option key={dog.id} value={dog.id}>{dog.name} · {dog.size}</option>)}
          </select>
          <span id="course-dog-profile-help" className="mt-1 block text-xs font-normal text-ink/65">Samma hundprofiler som i tävlingskalendern. Uppgifterna sparas som en kopia i anmälan.</span>
        </label>}
        {!chosenDog && <label className="block text-sm font-bold">Hundens namn
          <input required maxLength={80} className="mt-1 min-h-12 w-full rounded-xl border-2 border-ink/25 bg-white px-3 text-base" value={dogName} onChange={(e) => setDogName(e.target.value)} autoComplete="off" />
        </label>}
        <label className="block text-sm font-bold">Telefon (valfritt)
          <input type="tel" maxLength={40} className="mt-1 min-h-12 w-full rounded-xl border-2 border-ink/25 bg-white px-3 text-base" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </label>
        {course.price_sek > 0 && <div className="rounded-xl border border-ink/15 bg-white p-4 text-sm"><p className="font-bold">{coursePrice(course.price_sek)} för hela kursen</p><p className="mt-2 whitespace-pre-wrap break-words">{course.payment_instructions}</p><p className="mt-3 text-ink/65">Du betalar direkt till instruktören när du har en bekräftad plats. Ingen betalning görs på den här sidan.</p></div>}
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-forest" />
          <span>Jag vill anmäla mitt ekipage och godkänner kursens villkor. Mitt namn, min e-post, hunduppgifter och eventuell telefon delas med instruktören för kursadministration. <Link to="/integritet" className="font-semibold underline">Läs om personuppgifter</Link>.</span>
        </label>
        <button disabled={action.busy || course.status !== "published"} className="pressable shadow-hard-sm min-h-12 w-full rounded-full border-2 border-ink bg-tang px-5 font-bold disabled:opacity-50">{action.busy ? "Skickar anmälan…" : course.available_places > 0 ? "Anmäl ekipaget" : "Ställ ekipaget på väntelistan"}</button>
        {action.error && <p role="alert" className="rounded-xl bg-ember/10 p-3 text-sm font-semibold text-ember">{action.error}</p>}
        <p className="flex gap-2 text-xs leading-relaxed text-ink/65"><ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />Dina kontaktuppgifter visas bara för dig och kursens instruktör. Statusen visas här och under Mina anmälningar.</p>
      </form>}
    </>}
  </div>;
}
