import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { GraduationCap, Award, Trophy, Heart, Video, Clock, CheckCircle2, ArrowRight, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { useAuth } from "@/contexts/AuthContext";
import CoachUploadFlow, { type CoachPackId } from "@/components/coach/CoachUploadFlow";

/**
 * Publik coach-sida – tillgänglig utan inloggning.
 * Säljer in coach-feedback-tjänsten och låter besökaren starta uppladdningsflödet
 * direkt från sidan (paket → video → bekräftelse → betalning + uppladdning).
 */
const PACKS = [
  { id: "1" as CoachPackId, title: "1 video", price: 149, pro: 79, sub: "Perfekt att testa", popular: false },
  { id: "3" as CoachPackId, title: "3-pack", price: 399, pro: 199, sub: "Spara 50 kr", popular: true },
  { id: "5" as CoachPackId, title: "5-pack", price: 599, pro: 299, sub: "Bäst värde", popular: false },
];

const STEPS = [
  { icon: Video, title: "Ladda upp en kort video", desc: "Max 20 MB. Ett moment, ett pass eller en bana – upp till dig." },
  { icon: GraduationCap, title: "Coachen granskar", desc: "Malin tittar på dirigering, linjer, tempo och hundens utförande." },
  { icon: CheckCircle2, title: "Få konkret feedback", desc: "Skriftligt svar med tips du kan ta med direkt till nästa pass. Inom 5 arbetsdagar." },
];

export default function PublicCoachPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CoachPackId>("1");

  const startUpload = (pack: CoachPackId) => {
    setSelectedPack(pack);
    setUploadOpen(true);
  };

  const goToCoach = () => startUpload(selectedPack);

  return (
    <div className="min-h-screen bg-cream text-text-primary">
      <Helmet>
        <title>Personlig coach-feedback på dina träningsvideor | AgilityManager</title>
        <meta
          name="description"
          content="Ladda upp en kort träningsvideo och få personlig, skriftlig feedback från SM-meriterad coach Malin Öster inom 5 arbetsdagar. Från 79 kr per video."
        />
        <link rel="canonical" href="https://agilitymanager.lovable.app/coach" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Coach-videoanalys",
            provider: { "@type": "Organization", name: "AgilityManager" },
            description:
              "Personlig skriftlig feedback från certifierad agility-coach baserat på din uppladdade träningsvideo.",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "SEK",
              lowPrice: "79",
              highPrice: "599",
              offerCount: "3",
            },
          })}
        </script>
      </Helmet>

      <LandingNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 text-forest px-3 py-1 text-[12px] font-medium mb-5"
          >
            <Sparkles size={12} /> Öppet för alla – inget medlemskap krävs
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-display text-[40px] md:text-[64px] leading-[1.02] tracking-[-0.02em] text-forest"
          >
            Få personlig feedback<br />på din träningsvideo
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 text-[17px] md:text-[19px] text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            Ladda upp en kort video. Vår SM-meriterade coach <strong className="text-forest">Malin Öster</strong> tittar
            på dirigering, linjer och tempo – och svarar med konkreta tips inom 5 arbetsdagar.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button variant="brand" onClick={goToCoach} className="h-12 px-6 text-[15px] gap-2">
              {user ? "Skicka in video nu" : "Skapa konto & skicka video"}
              <ArrowRight size={16} />
            </Button>
            <a href="#paket" className="h-12 px-6 text-[14px] text-stone hover:text-forest inline-flex items-center transition-colors">
              Se priser ↓
            </a>
          </motion.div>
          <p className="mt-5 text-[12px] text-stone">
            Från <strong className="text-forest">79 kr</strong> per video · Engångsbetalning · Inget abonnemang krävs
          </p>
        </div>
      </section>

      {/* Coach-presentation */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-stone/10 bg-cream p-8 md:p-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center">
                <Award size={26} className="text-forest" strokeWidth={1.6} />
              </div>
              <div>
                <div className="text-[11px] tracking-[0.04em] font-medium text-stone uppercase">Möt din coach</div>
                <h2 className="font-display text-[28px] md:text-[36px] leading-tight tracking-[-0.01em] text-forest">Malin Öster</h2>
                <p className="text-[14px] text-text-secondary mt-1">Certifierad instruktör · Agility, Hoopers & Freestyle</p>
              </div>
            </div>
            <div className="space-y-4 text-[15px] text-text-secondary leading-relaxed">
              <p>
                Jag är uppvuxen i en hundtokig familj och har hållit på med hundsport sedan tidig barndom. Min
                första egna hund var en shetland sheepdog där fokus låg på agility – tillsammans tog vi oss hela
                vägen till SM 2014.
              </p>
              <p>
                Idag delar jag livet med två miniature american shepherds. <strong className="text-forest">Luna (9 år)</strong> tävlar
                i klass 3 agility, avancerad klass i rallylydnad och klass 2 i freestyle. <strong className="text-forest">Vita (7 år)</strong> tränar
                främst hoopers och agility-foundation.
              </p>
              <p>
                Min styrka som instruktör ligger i att se helheten mellan förare och hund – och ge konkret,
                konstruktiv feedback du faktiskt kan ta med dig till nästa pass.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
              {[
                { Icon: Trophy, line1: "SM-meriterad", line2: "i agility" },
                { Icon: Award, line1: "Utbildad instruktör", line2: "flera discipliner" },
                { Icon: Heart, line1: "Aktiv tävlingsförare", line2: "med två egna hundar" },
              ].map(({ Icon, line1, line2 }) => (
                <div key={line1} className="rounded-xl bg-white p-4 flex items-center gap-3 border border-stone/10">
                  <Icon size={18} className="text-forest shrink-0" strokeWidth={1.8} />
                  <div className="text-[13px] text-text-primary leading-tight">
                    {line1}
                    <br />
                    <span className="text-stone text-[11px]">{line2}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hur det fungerar */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-[32px] md:text-[44px] leading-tight tracking-[-0.01em] text-forest text-center mb-12">
            Så fungerar det
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl bg-white border border-stone/10 p-6"
              >
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center mb-4">
                  <s.icon size={18} className="text-forest" strokeWidth={1.8} />
                </div>
                <div className="text-[11px] tracking-[0.04em] font-medium text-stone uppercase mb-1">Steg {i + 1}</div>
                <h3 className="font-display text-[20px] text-forest mb-2">{s.title}</h3>
                <p className="text-[14px] text-text-secondary leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Paket */}
      <section id="paket" className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-[32px] md:text-[44px] leading-tight tracking-[-0.01em] text-forest">
              Välj ett paket
            </h2>
            <p className="mt-3 text-text-secondary text-[15px]">
              Engångsbetalning via Stripe · Inget abonnemang · Pro-medlemmar får ca 50% rabatt
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PACKS.map((p) => (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  p.popular ? "border-forest bg-forest/[0.02] ring-1 ring-forest/20" : "border-stone/15 bg-cream"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-forest text-white text-[11px] font-medium px-2.5 py-1 rounded-full">
                    <Star size={11} fill="currentColor" /> Populärast
                  </div>
                )}
                <h3 className="font-display text-[22px] text-forest">{p.title}</h3>
                <p className="text-[13px] text-stone mt-1">{p.sub}</p>
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[40px] text-forest leading-none">{p.price}</span>
                    <span className="text-[14px] text-stone">kr</span>
                  </div>
                  <div className="text-[12px] text-stone mt-1">
                    Pro: <strong className="text-forest">{p.pro} kr</strong>
                  </div>
                </div>
                <Button
                  variant={p.popular ? "brand" : "outline"}
                  onClick={() => startUpload(p.id)}
                  className="mt-6 h-11"
                >
                  Välj {p.title.toLowerCase()}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + slut-CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-[28px] md:text-[36px] text-forest text-center mb-8">Vanliga frågor</h2>
          <div className="space-y-4">
            {[
              {
                q: "Måste jag vara medlem för att använda coachen?",
                a: "Nej. Coachen är öppen för alla. Du behöver bara skapa ett gratis konto för att kunna ladda upp video och få ditt svar. Pro-medlemmar får ca 50% rabatt på varje paket.",
              },
              {
                q: "Hur lång video kan jag skicka?",
                a: "Filen får vara max 20 MB. För de flesta motsvarar det 1–2 minuter i normal upplösning – fullt tillräckligt för ett moment eller en bana.",
              },
              {
                q: "Hur snabbt får jag svar?",
                a: "Inom 5 arbetsdagar – oftast snabbare. Du får svaret direkt i appen, och en notis när coachen har svarat.",
              },
              {
                q: "Kan jag fråga om vad som helst?",
                a: "Ja – inom agility, hoopers och freestyle. Det kan vara dirigering, linjer, kontakter, hopp, banplanering eller frågor kring hundens utförande.",
              },
              {
                q: "Vad händer om coachen inte kan ge svar?",
                a: "Vi återbetalar paketet om Malin av någon anledning inte kan ge feedback på din video.",
              },
            ].map((f) => (
              <details key={f.q} className="group rounded-xl border border-stone/15 bg-white p-5 open:bg-cream transition-colors">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-display text-[17px] text-forest">{f.q}</span>
                  <span className="text-stone group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-[14px] text-text-secondary leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-14 text-center rounded-3xl bg-forest text-white p-10">
            <Clock size={28} className="mx-auto mb-3 opacity-80" strokeWidth={1.6} />
            <h3 className="font-display text-[26px] md:text-[32px] leading-tight">Redo att förbättra ditt nästa pass?</h3>
            <p className="mt-3 text-white/80 max-w-lg mx-auto text-[15px]">
              Konkret feedback från en SM-meriterad coach – från 79 kr.
            </p>
            <Button
              variant="secondary"
              onClick={goToCoach}
              className="mt-6 h-12 px-6 bg-white text-forest hover:bg-white/90 gap-2"
            >
              {user ? "Skicka in video nu" : "Skapa konto & kom igång"}
              <ArrowRight size={16} />
            </Button>
            <p className="mt-4 text-[12px] text-white/60">
              Redan medlem?{" "}
              <Link to="/auth?redirect=/v3/coach" className="underline">
                Logga in
              </Link>
            </p>
          </div>
        </div>
      </section>

      <LandingFooterV2 />

      <CoachUploadFlow open={uploadOpen} onOpenChange={setUploadOpen} initialPack={selectedPack} />
    </div>
  );
}
