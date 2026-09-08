import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight, CalendarDays, CloudUpload, LayoutGrid, LogIn, LogOut, NotebookPen,
  ShieldCheck, UserRound, Users,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Seo } from "@/components/Seo";
import { AuthDialog } from "@/components/AuthDialog";
import { PlannerProfileDialog } from "@/features/planner-social/PlannerProfileDialog";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/analytics";

/**
 * "Mitt AgilityManager" — en enda ingång till konto, banprofil och de
 * personliga ytorna. Sidan samlar det som redan finns i appen; den skapar
 * inget nytt inloggningssystem och ingen ny datamodell.
 */

const SHORTCUTS = [
  { to: "/banplanerare", icon: LayoutGrid, title: "Banplaneraren", text: "Rita en ny bana — fungerar utan konto." },
  { to: "/banor", icon: NotebookPen, title: "Banbibliotek", text: "Färdiga agility- och hoopersbanor att utgå från." },
  { to: "/delade-banor", icon: Users, title: "Delade banor", text: "Banor du och andra har delat med länk." },
  { to: "/tavlingar/favoriter", icon: CalendarDays, title: "Favorittävlingar", text: "Tävlingarna du sparat i kalendern." },
  { to: "/traning", icon: NotebookPen, title: "Träning", text: "Träningsplaner, pass och historik." },
  { to: "/instruktor", icon: Users, title: "Instruktör", text: "Grupper, elever, uppgifter och feedback." },
];

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const { profile, signOut: forgetProfile } = usePlannerProfile();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Mitt AgilityManager — konto, banprofil och sparade saker"
        description="Din ingång till AgilityManager: konto, banprofil, sparade banor, favorittävlingar och träning."
        noIndex
      />
      <SiteNav />
      <PageHero kicker="Mitt AgilityManager" title="Allt ditt på ett ställe.">
        Du kan rita banor, läsa guider och bläddra i tävlingskalendern helt utan konto.
        Ett AgilityManager-konto behövs när du vill spara och synka dina saker mellan
        dator och telefon.
      </PageHero>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
        {/* Banprofil */}
        <div className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-7 shadow-hard-sm">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-tang text-ink">
            <UserRound className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-3xl leading-tight">Banprofil</h2>
          <p className="mt-3 leading-relaxed text-ink/70">
            Namn och e-post räcker för att spara banor på en profil, dela dem och få
            kommentarer. Inget lösenord behövs. E-posten visas aldrig för andra och
            används inte till utskick.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink/60">
            {profile ? `Inloggad som ${profile.name}` : "Ingen banprofil i den här webbläsaren."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setProfileOpen(true)}
              className="pressable shadow-hard-sm inline-flex items-center gap-2 rounded-full bg-tang px-5 py-3 text-sm font-bold text-ink"
            >
              {profile ? "Ändra profil" : "Skapa banprofil"} <ArrowRight className="h-4 w-4" />
            </button>
            {profile ? (
              <button
                onClick={forgetProfile}
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-5 py-3 text-sm font-bold"
              >
                <LogOut className="h-4 w-4" /> Glöm profilen här
              </button>
            ) : null}
          </div>
        </div>

        {/* Konto / molnsynk */}
        <div className="rounded-3xl border-2 border-ink bg-[#FCFAF4] p-7 shadow-hard-sm">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest text-paper">
            <CloudUpload className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-display text-3xl leading-tight">Konto & synk</h2>
          <p className="mt-3 leading-relaxed text-ink/70">
            Med ett konto (e-post och lösenord) kan banor sparas i molnet, kommenteras
            och delas med klubben — och följa med mellan dina enheter.
          </p>
          <p className="mt-4 text-sm font-semibold text-ink/60">
            {loading ? "Kontrollerar…" : user ? `Inloggad som ${user.email}` : "Inte inloggad."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? (
              <button
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-5 py-3 text-sm font-bold"
              >
                <LogOut className="h-4 w-4" /> Logga ut
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="pressable shadow-hard-sm inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-bold text-paper"
              >
                <LogIn className="h-4 w-4" /> Logga in eller skapa konto
              </button>
            )}
          </div>
          <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink/55">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            Banan du ritar just nu sparas alltid lokalt i din webbläsare, med eller utan konto.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <h2 className="font-display text-4xl">Dina ytor</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-2xl border-2 border-ink bg-white p-5 shadow-hard-sm transition-transform hover:-translate-y-0.5"
            >
              <s.icon className="h-5 w-5 text-forest" />
              <h3 className="mt-3 font-display text-2xl leading-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/65">{s.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onDone={() => track("account_created")}
      />
      <PlannerProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        reason="Namn och e-post räcker för att spara och dela banor."
      />
      <SiteFooter />
    </div>
  );
}
