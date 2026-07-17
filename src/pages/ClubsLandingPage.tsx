import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Calendar, Check, Crown, Loader2, Megaphone, Users,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { SEO, SITE_URL } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CLUB_FEATURES = [
  { icon: Megaphone, title: "Anslagstavla", desc: "Nå alla medlemmar direkt — nyheter, träningstider och påminnelser på ett ställe." },
  { icon: Calendar, title: "Gemensam kalender", desc: "Planera klubbträningar och event. Medlemmarna ser allt i sin egen kalender." },
  { icon: Users, title: "Undergrupper", desc: "Samla nybörjare, elitgruppen eller unghundsklassen i egna rum med egen chatt." },
  { icon: Building2, title: "Medlemsvy för styrelsen", desc: "Se vilka som är aktiva, följ engagemanget och håll klubben levande." },
];

const PRO_BULLETS = [
  "Pro till hela klubben till grupppris — ju fler medlemmar, desto lägre pris per person",
  "Obegränsade banor med 3D-vy för alla instruktörer",
  "AI-träningsinsikter och full statistik för varje medlem",
  "Perfekt för klubbar som tränar agility eller hoopers tillsammans",
];

export default function ClubsLandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clubName, setClubName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState("");
  const [sport, setSport] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    const { error } = await supabase.from("club_interest_leads").insert({
      club_name: clubName.trim(),
      contact_name: contactName.trim(),
      email: email.trim(),
      members_estimate: members ? Number(members) : null,
      sport: sport || null,
      message: message.trim() || null,
      user_id: user?.id ?? null,
    });
    setSending(false);
    if (error) {
      toast({
        title: "Kunde inte skicka",
        description: "Försök igen eller maila info@auroramedia.se",
        variant: "destructive",
      });
      return;
    }
    setSent(true);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AgilityManager för klubbar",
    description:
      "Klubbverktyg för agility- och hoopersklubbar: anslagstavla, gemensam kalender och undergrupper gratis. Grupppris på Pro för hela klubben.",
    url: `${SITE_URL}/klubb`,
  };

  return (
    <div className="min-h-screen bg-bone font-sans-ds">
      <SEO
        title="För klubbar – agility- och hoopersklubbar"
        description="Samla klubben i AgilityManager: anslagstavla, gemensam kalender och undergrupper gratis. Be om grupppris på Pro för hela klubben."
        canonical="/klubb"
        jsonLd={jsonLd}
      />
      <LandingNav />

      <main className="pt-28 pb-20 px-5">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/70">
              För klubbar
            </p>
            <h1 className="font-display text-4xl sm:text-5xl text-forest mt-3 tracking-tight">
              Hela klubben.{" "}
              <span className="text-forest-soft">Samma verktyg.</span>
            </h1>
            <p className="text-stone mt-4 text-[15px] sm:text-base">
              AgilityManager är gratis för klubbar att använda — och när ni är redo
              ger vi er Pro till hela gänget till grupppris.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <Button
                className="bg-forest text-bone hover:bg-forest-soft font-semibold"
                onClick={() => document.getElementById("klubb-intresse")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Crown size={15} className="mr-1.5" /> Be om klubbpris
              </Button>
              <Button
                variant="outline"
                className="border-forest/25 text-forest hover:bg-forest/5"
                onClick={() => navigate(user ? "/v3/clubs" : "/auth?mode=signup&source=klubb")}
              >
                {user ? "Öppna klubbvy" : "Starta er klubb gratis"}
              </Button>
            </div>
          </div>

          {/* Funktioner */}
          <div className="mt-14 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {CLUB_FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-3xl border border-forest/12 bg-card p-6"
              >
                <f.icon size={20} className="text-forest" />
                <h2 className="font-display text-lg text-forest mt-3">{f.title}</h2>
                <p className="text-sm text-stone mt-1.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Klubb Pro */}
          <div className="mt-14 max-w-3xl mx-auto grid md:grid-cols-2 gap-5 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border-2 border-forest bg-card p-7"
            >
              <div className="text-xs font-bold px-3 py-1 rounded-full bg-forest text-bone inline-flex items-center gap-1">
                <Crown size={11} /> Klubb Pro
              </div>
              <h2 className="font-display text-xl text-forest mt-3">
                Pro till hela klubben — till grupppris
              </h2>
              <ul className="mt-4 space-y-2.5">
                {PRO_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-forest">
                    <Check size={16} className="mt-0.5 shrink-0 text-forest" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-stone mt-5">
                Berätta om er klubb så återkommer vi med ett prisförslag inom några dagar.
              </p>
            </motion.div>

            {/* Intresseformulär */}
            <motion.div
              id="klubb-intresse"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 }}
              className="rounded-3xl border border-forest/12 bg-card p-7 scroll-mt-28"
            >
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
                    <Check size={22} className="text-forest" />
                  </div>
                  <h3 className="font-display text-lg text-forest mt-4">Tack, {contactName.split(" ")[0]}!</h3>
                  <p className="text-sm text-stone mt-2 max-w-xs">
                    Vi hör av oss till <strong>{email}</strong> med ett prisförslag för {clubName} inom några dagar.
                  </p>
                  <Link
                    to="/priser"
                    className="text-sm font-medium text-forest underline-offset-2 hover:underline mt-4"
                  >
                    Se individuella priser →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-display text-lg text-forest">Be om prisförslag</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="club-name">Klubbens namn *</Label>
                    <Input id="club-name" required value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="T.ex. Tölö Agilityklubb" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-name">Kontaktperson *</Label>
                      <Input id="contact-name" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Namn" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="members">Antal medlemmar</Label>
                      <Input id="members" type="number" min={1} value={members} onChange={(e) => setMembers(e.target.value)} placeholder="T.ex. 45" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sport">Sport</Label>
                    <select
                      id="sport"
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Välj…</option>
                      <option value="agility">Agility</option>
                      <option value="hoopers">Hoopers</option>
                      <option value="bada">Båda sporterna</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-post *</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="namn@klubb.se" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Meddelande (valfritt)</Label>
                    <Textarea id="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Berätta gärna om er — sporter, nivåer, vad ni behöver." />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full bg-forest text-bone hover:bg-forest-soft font-semibold">
                    {sending ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Skicka intresseanmälan
                  </Button>
                  <p className="text-[11px] text-stone text-center">
                    Vi använder uppgifterna bara för att återkomma med prisförslag.{" "}
                    <Link to="/integritetspolicy" className="underline">Integritetspolicy</Link>
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
