import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Loader2, Trash2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { deleteSignedInAccount } from "@/lib/accountDeletion";

const IS_NATIVE_APP = import.meta.env.VITE_NATIVE_APP === "true";
const SUPPORT_DELETE = "mailto:info@auroramedia.se?subject=Radera%20konto%20eller%20banprofil%20i%20AgilityManager";

export default function MobileDeleteAccountPage() {
  const { user, loading } = useAuth();
  const { profile } = usePlannerProfile();
  const [confirmation, setConfirmation] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [localSessionCleared, setLocalSessionCleared] = useState(true);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !user || confirmation !== "RADERA") return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteSignedInAccount(confirmation, user.id);
      setLocalSessionCleared(result.localSessionCleared);
      setDeleted(true);
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Raderingen kunde inte genomföras. Försök igen senare.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="min-h-screen bg-paper text-ink">
    <Seo title="Radera konto — AgilityManager" description="Radera ditt konto eller få hjälp med din banprofil och sparade uppgifter i AgilityManager." canonicalPath="/radera-konto" />
    <SiteNav />
    <PageHero kicker="Dina uppgifter" title="Radera konto.">
      {IS_NATIVE_APP ? "Här kan du radera ditt konto för inloggning, eller be om hjälp med din separata banprofil." : "Här kan du radera ditt konto för inloggning och synk, eller be om hjälp med din banprofil."}
    </PageHero>
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <section className="rounded-3xl border-2 border-ink bg-white p-6 sm:p-8" aria-labelledby="delete-auth-title">
        <h2 id="delete-auth-title" className="font-display text-3xl">{IS_NATIVE_APP ? "Konto för inloggning" : "Konto & synk"}</h2>
        <p className="mt-3 leading-relaxed text-ink/75">{IS_NATIVE_APP ? "Raderingen är permanent. Den tar bort kontot för e-post och lösenord och uppgifter som är kopplade till det. Din separata banprofil hanteras i avsnittet nedan." : "Raderingen är permanent. Den tar bort kontot för e-post och lösenord och de molnuppgifter som hör till det, inklusive sparade banor, kommentarer och synkade hundprofiler."}</p>
        <p className="mt-3 leading-relaxed text-ink/75">Din separata banprofil och sådant som du sparat lokalt på enheten hanteras separat. En raderad delad bana kan inte längre öppnas med sin gamla länk.</p>
        {deleted ? <div role="status" className="mt-5 rounded-2xl border border-forest bg-forest/10 p-4">
          <p className="font-bold">Ditt konto har raderats.</p>
          <p className="mt-2 text-sm">Banprofilen och lokala uppgifter finns kvar om du har sparat sådana. Se informationen nedan om hur du hanterar dem.</p>
          {!localSessionCleared && <p className="mt-2 text-sm">Inloggningen på den här enheten kunde inte rensas. Stäng appen och öppna den igen, eller rensa appens lagrade uppgifter.</p>}
        </div> : loading ? <p className="mt-5" role="status">Kontrollerar inloggningen…</p> : user ? <form onSubmit={event => void submit(event)} className="mt-5 space-y-4">
          <p className="break-words text-sm font-semibold">Kontot som raderas: {user.email}</p>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Skriv RADERA för att bekräfta</span>
            <input value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="h-12 w-full rounded-xl border-2 border-ink/30 bg-paper px-4 focus:border-ink focus:outline-none disabled:opacity-60" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-ember/40 bg-ember/10 p-3 text-sm">{error}</p>}
          <button type="submit" disabled={busy || confirmation !== "RADERA"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-ember px-5 py-3 font-bold text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
            {busy ? "Raderar…" : "Radera kontot permanent"}
          </button>
        </form> : <div className="mt-5">
          <p className="text-sm">Logga in på kontot du vill radera. Om du inte kan logga in kan du kontakta oss nedan.</p>
          <button type="button" onClick={() => setAuthOpen(true)} className="mt-4 min-h-12 rounded-full border-2 border-ink bg-tang px-5 py-3 font-bold">Logga in</button>
        </div>}
      </section>
      <section className="rounded-3xl border-2 border-ink bg-white p-6 sm:p-8" aria-labelledby="delete-planner-title">
        <h2 id="delete-planner-title" className="font-display text-3xl">{IS_NATIVE_APP ? "Banprofil och lokala banor" : "Banprofil, träning och lokal data"}</h2>
        <p className="mt-3 leading-relaxed text-ink/75">{IS_NATIVE_APP ? "Banprofilen skapas med namn och e-post och använder en separat profilnyckel. Att logga ut eller välja ”Glöm profilen här” raderar bara åtkomsten på den här enheten. Profilen och delade banor tas inte bort från molnet av det." : "Banprofilen skapas med namn och e-post och använder en separat profilnyckel. Att logga ut eller välja ”Glöm profilen här” raderar bara åtkomsten på den här enheten. Profilen, delade banor och instruktörens grupper tas inte bort från molnet av det."}</p>
        {profile && <p className="mt-3 break-words text-sm font-semibold">Banprofil på den här enheten: {profile.name}</p>}
        <p className="mt-3 leading-relaxed text-ink/75">{IS_NATIVE_APP ? "För permanent radering av banprofil, sparade banor, kommentarer eller feedbackuppgifter: skicka en begäran till info@auroramedia.se. Ange vilken profil eller uppgift det gäller. Skicka inte lösenord eller profilnycklar." : "För permanent radering av banprofil, instruktörsuppgifter eller uppgifter som du lämnat i ett feedbackmeddelande: skicka en begäran till info@auroramedia.se. Ange vilken profil eller uppgift det gäller. Skicka inte lösenord, elevlänkar eller profilnycklar."}</p>
        <p className="mt-3 leading-relaxed text-ink/75">{IS_NATIVE_APP ? "Lokala banor och exporter lagras på enheten. Lokala banor kan tas bort genom att rensa appens lagrade uppgifter. Exporterade filer som du sparat eller delat hanteras där du sparat dem. Osynkade uppgifter kan försvinna permanent." : "Lokala banor, träningspass, resultat och favoriter lagras på enheten. De kan tas bort genom att rensa webbplatsens eller appens lagrade uppgifter. Då kan osynkade uppgifter försvinna permanent."}</p>
        <a href={SUPPORT_DELETE} className="mt-5 inline-flex min-h-12 items-center rounded-full border-2 border-ink px-5 py-3 font-bold">Begär hjälp med radering</a>
      </section>
      {IS_NATIVE_APP && <p className="leading-relaxed text-ink/75">Appbutikens konto och köp hanteras separat. Köpet av mobilappen hanteras av Apple App Store eller Google Play.</p>}
      <Link to="/integritet" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Läs hur AgilityManager hanterar uppgifter</Link>
    </main>
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    <SiteFooter />
  </div>;
}
