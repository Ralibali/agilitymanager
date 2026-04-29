import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  GraduationCap, Award, Trophy, Heart, Video, Clock, CheckCircle2, ArrowRight,
  Sparkles, Star, ShieldCheck, Zap, Target, Users, PlayCircle, MapPin, Calendar, X, Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { useAuth } from "@/contexts/AuthContext";
import CoachUploadFlow, { type CoachPackId } from "@/components/coach/CoachUploadFlow";

/**
 * Publik coach-sida – tillgänglig utan inloggning.
 * SEO-optimerad för "agility coach online", "videocoachning hund",
 * "agility feedback online", "personlig hundträningscoach", "Malin Öster agility".
 */
const PACKS = [
  { id: "1" as CoachPackId, title: "1 video", price: 149, pro: 79, sub: "Perfekt att testa", popular: false },
  { id: "3" as CoachPackId, title: "3-pack", price: 399, pro: 199, sub: "Spara 50 kr", popular: true },
  { id: "5" as CoachPackId, title: "5-pack", price: 599, pro: 299, sub: "Bäst värde", popular: false },
];

const STEPS = [
  { icon: Video, title: "Filma & ladda upp", desc: "Filma ett moment, en sekvens eller en hel bana. Max 20 MB direkt i appen." },
  { icon: GraduationCap, title: "Malin granskar varje bildruta", desc: "Hon analyserar dirigering, linjer, tempo, kontakter och hundens utförande." },
  { icon: CheckCircle2, title: "Få konkret skriftlig analys", desc: "Tydliga åtgärder du kan ta direkt till nästa pass. Levereras inom 5 arbetsdagar." },
];

const VALUE_PROPS = [
  { Icon: Award, title: "Expertanalys av SM-meriterad coach", desc: "Malin Öster har flera SM-meriter och bryter ner din träning i detalj. Konkreta tips på vad du ska finslipa för att kapa sekunder och öka precisionen." },
  { Icon: MapPin, title: "Träna när & var du vill", desc: "Glöm fasta kurstider och långa resor. Filma när det passar dig, skicka in via AgilityManager och läs feedbacken i lugn och ro – om och om igen." },
  { Icon: Target, title: "Agility, Hoopers & Freestyle", desc: "Skräddarsydd videocoachning för de unika utmaningarna i varje gren. Få grenspecifik agility feedback online – eller för din favoritsport." },
  { Icon: ShieldCheck, title: "Engångsbetalning – inget abonnemang", desc: "Betala bara för den feedback du behöver. Säker betalning via Stripe. Inga dolda avgifter, inga bindningstider." },
];

const USE_CASES = [
  { emoji: "🎯", title: "Finslipa en specifik sekvens", desc: "Har du en kombination som aldrig sitter? Filma, skicka in och få en detaljerad plan för hur ni löser den smidigt och snabbt." },
  { emoji: "🤔", title: "Få ett utomstående perspektiv", desc: "Ibland blir man hemmablind. Låt en expert titta med nya ögon och hitta de små justeringarna som gör den stora skillnaden." },
  { emoji: "🏆", title: "Förbered dig inför tävling", desc: "Gå igenom en hel bana eller en svår del. Få självförtroendet att du har en plan när du står på startlinjen – perfekt sista check inför årets stora mål." },
  { emoji: "🐶", title: "Bygg grunder med valp/unghund", desc: "Säkerställ att grundfärdigheterna sitter från början – från belöningsplacering till hindersug, oavsett gren." },
];

const QUOTES = [
  { name: "Elin Svensson", role: "Agilityförare, klass 3", text: "Malins feedback är ovärderlig. Hon såg direkt ett litet handlingsfel jag gjort i månader som kostade oss diskningar. Efter en analys satte vi vårt första felfria lopp." },
  { name: "Markus Bergman", role: "Hoopers-entusiast", text: "Som ny inom hoopers var personlig coachning online guld värd. Att få detaljerade råd utan att åka iväg passar oss perfekt." },
  { name: "Johanna Karlsson", role: "Tävlar i freestyle & agility", text: "Malins förmåga att se detaljer och förklara enkelt har tagit vår träning till en helt ny nivå. Otroligt prisvärt också." },
];

const COMPARISON = [
  { feature: "Personlig uppmärksamhet", us: "100 % fokus på dig & din hund", kurs: "Delad tid med 5–7 ekipage" },
  { feature: "Tidsåtgång", us: "Filma när du vill, noll restid", kurs: "Fasta tider + restid t/r klubben" },
  { feature: "Repetition & analys", us: "Läs feedbacken om och om igen", kurs: "Muntliga råd som lätt glöms" },
  { feature: "Kostnad per insikt", us: "Från 79 kr för fokuserad feedback", kurs: "Ofta 1 500–2 500 kr per helgkurs" },
  { feature: "Sport som täcks", us: "Agility, hoopers & freestyle", kurs: "Vanligtvis bara en gren" },
];

const STATS = [
  { number: "4,9", suffix: "/5", label: "Snittbetyg från användare" },
  { number: "75", suffix: "%", label: "Ser tydlig förbättring efter en analys" },
  { number: "5", suffix: " dgr", label: "Garanterad svarstid" },
];

const FAQ = [
  { q: "Vad är agility coach online?", a: "Agility coach online är personlig hundträningscoachning där du filmar din träning och skickar in videon. Coachen – i vårt fall SM-meriterade Malin Öster – analyserar och ger dig detaljerad, skriftlig feedback. Ett flexibelt alternativ till traditionell agilitykurs." },
  { q: "Hur fungerar videocoachning för hund?", a: "Det är enkelt: 1) Filma ett pass (max 1–2 min). 2) Ladda upp i AgilityManager och välj Coach. 3) Betala smidigt via Stripe. 4) Inom 5 arbetsdagar får du en personlig, skriftlig analys med konkreta tips och övningar." },
  { q: "Kan jag få feedback i andra sporter än agility?", a: "Absolut. Malin är även erfaren hoopers-coach och freestyle-coach. Du kan skicka in videor för agility, hoopers och freestyle och få grenspecifik feedback – välj bara sport när du laddar upp." },
  { q: "Vem är Malin Öster?", a: "Malin Öster är en högt meriterad och certifierad agilityinstruktör med flera SM-meriter. Hon är känd för sin pedagogiska förmåga och sitt skarpa öga för detaljer som skapar ett vinnande samarbete mellan förare och hund." },
  { q: "Vad kostar det att få agility feedback online?", a: "Vi har flexibla priser utan abonnemang. En enstaka analys kostar 149 kr. Paket: 3 analyser för 399 kr eller 5 för 599 kr. Som AgilityManager Pro-medlem får du ca 50 % rabatt – från 79 kr per video." },
  { q: "Måste jag vara medlem för att använda coachen?", a: "Nej. Coachen är öppen för alla. Du behöver bara skapa ett gratis konto för att kunna ladda upp video och ta emot ditt svar. Pro-medlemmar får ca 50 % rabatt på varje paket." },
  { q: "Vilken typ av video ska jag skicka in?", a: "En video på max 1–2 min där vi tydligt ser dig, hunden och den sekvens du vill ha hjälp med. Filma gärna från en vinkel där coachen ser ditt fotarbete, dina signaler och hundens linjer." },
  { q: "Är detta en vanlig agility online kurs?", a: "Nej. Detta är inte en förinspelad, generell agility online kurs. Det är personlig 1-till-1-coachning på din specifika träning – mer fokuserat och skräddarsytt. Perfekt komplement till klubbträning eller en kurs." },
  { q: "Hur lång video kan jag skicka?", a: "Filen får vara max 20 MB. För de flesta motsvarar det 1–2 minuter i normal upplösning – fullt tillräckligt för ett moment eller en bana." },
  { q: "Vad händer om coachen inte kan ge svar?", a: "Vi återbetalar paketet om Malin av någon anledning inte kan ge feedback på din video." },
];

const META_TITLE = "Agility Coach Online: Personlig Videocoach | AgilityManager";
const META_DESC =
  "Agility coach online som ger dig personlig feedback. Skicka in din träningsvideo & få analys av SM-meriterade Malin Öster inom 5 dagar. Från 79 kr.";

export default function PublicCoachPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CoachPackId>("1");
  const [resumePrefill, setResumePrefill] = useState<
    { pack?: CoachPackId; sport?: "agility" | "hoopers" | "freestyle"; question?: string; privacyMode?: "private" | "private_no_export" } | undefined
  >(undefined);
  const [resumeStep, setResumeStep] = useState<1 | 2 | 3 | 4>(1);

  // Återuppta efter Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("coach_paid") !== "true") return;
    try {
      const raw = sessionStorage.getItem("coach_pending");
      if (!raw) return;
      const pending = JSON.parse(raw) as {
        pack?: CoachPackId;
        sport?: "agility" | "hoopers" | "freestyle";
        question?: string;
        privacyMode?: "private" | "private_no_export";
      };
      setResumePrefill(pending);
      if (pending.pack) setSelectedPack(pending.pack);
      setResumeStep(2);
      setUploadOpen(true);
    } catch {/* ignore */}
  }, []);

  const startUpload = (pack: CoachPackId) => {
    setSelectedPack(pack);
    setResumePrefill(undefined);
    setResumeStep(1);
    setUploadOpen(true);
  };

  const goToCoach = () => startUpload(selectedPack);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Videocoachning för hund (agility, hoopers, freestyle)",
    name: "Agility Coach Online – personlig videocoachning",
    provider: {
      "@type": "Organization",
      name: "AgilityManager",
      url: "https://agilitymanager.lovable.app",
    },
    areaServed: { "@type": "Country", name: "Sverige" },
    description:
      "Personlig skriftlig feedback från SM-meriterade Malin Öster baserat på din uppladdade träningsvideo. För agility, hoopers och freestyle.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "SEK",
      lowPrice: "79",
      highPrice: "599",
      offerCount: "3",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "127",
      bestRating: "5",
    },
  };

  return (
    <div className="min-h-screen bg-cream text-text-primary overflow-x-hidden">
      <Helmet>
        <title>{META_TITLE}</title>
        <meta name="description" content={META_DESC} />
        <link rel="canonical" href="https://agilitymanager.lovable.app/coach" />
        <meta property="og:title" content={META_TITLE} />
        <meta property="og:description" content={META_DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://agilitymanager.lovable.app/coach" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META_TITLE} />
        <meta name="twitter:description" content={META_DESC} />
        <script type="application/ld+json">{JSON.stringify(serviceLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      </Helmet>

      <LandingNav />

      {/* HERO – PANG */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Bakgrunds-blobs */}
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-forest/10 blur-3xl" />
          <div className="absolute top-20 -right-32 w-[460px] h-[460px] rounded-full bg-secondary/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(26,107,60,0.08),transparent_60%)]" />
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest text-white px-3.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase shadow-md shadow-forest/20"
            >
              <Sparkles size={12} /> Personlig Videocoachning
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-5 font-display text-[44px] sm:text-[58px] lg:text-[72px] leading-[0.98] tracking-[-0.025em] text-forest"
            >
              Agility Coach Online.<br />
              <span className="bg-gradient-to-br from-forest via-forest to-secondary bg-clip-text text-transparent">
                Skriftlig analys på 5&nbsp;dagar.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-6 text-[17px] md:text-[19px] text-text-secondary max-w-xl lg:max-w-none leading-relaxed mx-auto lg:mx-0"
            >
              Skicka in din träningsvideo och få personlig expertanalys av <strong className="text-forest">SM-meriterade Malin Öster</strong>.
              För agility, hoopers och freestyle. Konkreta tips direkt i appen – från <strong className="text-forest">79 kr</strong>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3"
            >
              <Button variant="brand" onClick={goToCoach} className="h-13 px-7 text-[15px] gap-2 shadow-xl shadow-forest/25 hover:scale-[1.02] transition-transform">
                {user ? "Skicka in video nu" : "Skapa konto & skicka video"}
                <ArrowRight size={16} />
              </Button>
              <a href="#paket" className="h-13 px-5 text-[14px] text-stone hover:text-forest inline-flex items-center transition-colors">
                Se priser ↓
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[12px] text-stone"
            >
              <span className="inline-flex items-center gap-1"><Check size={13} className="text-forest" /> SM-meriterad coach</span>
              <span className="inline-flex items-center gap-1"><Check size={13} className="text-forest" /> Inget abonnemang</span>
              <span className="inline-flex items-center gap-1"><Check size={13} className="text-forest" /> Svar inom 5 arbetsdagar</span>
              <span className="inline-flex items-center gap-1"><Check size={13} className="text-forest" /> Pengarna tillbaka-garanti</span>
            </motion.div>
          </div>

          {/* Hero-kort: faktisk feedback-preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-forest/15 via-secondary/10 to-transparent rounded-[36px] blur-2xl -z-10" />
            <div className="rounded-3xl bg-white border border-stone/10 shadow-2xl shadow-forest/10 p-5 md:p-6 rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-forest to-forest/70 grid place-items-center text-white font-display text-lg">M</div>
                <div className="leading-tight">
                  <div className="text-[14px] font-semibold text-forest">Malin Öster</div>
                  <div className="text-[11px] text-stone">Coach · svar levererat på 3 dgr</div>
                </div>
                <div className="ml-auto inline-flex items-center gap-0.5 text-secondary">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
              </div>

              <div className="aspect-video rounded-xl bg-gradient-to-br from-forest/90 via-forest to-forest/80 relative overflow-hidden mb-4 grid place-items-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.18),transparent_60%)]" />
                <PlayCircle size={56} className="text-white/90 relative z-10" strokeWidth={1.4} />
                <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider font-semibold text-white/80 bg-black/30 backdrop-blur px-2 py-0.5 rounded">
                  Din träningsvideo · 1:24
                </div>
              </div>

              <div className="space-y-2.5 text-[13px] text-text-primary">
                <div className="flex gap-2"><CheckCircle2 size={15} className="text-forest shrink-0 mt-0.5" /><span><strong>Linje 4–6:</strong> sen vändsignal — testa frontkors istället för rear-cross.</span></div>
                <div className="flex gap-2"><CheckCircle2 size={15} className="text-forest shrink-0 mt-0.5" /><span><strong>Slalom:</strong> hunden tappar tempo, jobba med belöning vid pinne 8.</span></div>
                <div className="flex gap-2"><CheckCircle2 size={15} className="text-forest shrink-0 mt-0.5" /><span><strong>A-hindret:</strong> kontaktzonen ser stabil ut, fortsätt så!</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone/10 flex items-center justify-between text-[11px] text-stone">
                <span>Inom 5 arbetsdagar</span>
                <span className="text-forest font-medium">→ Tillbaka i appen</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section aria-label="Trust" className="border-y border-stone/10 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          {[
            { Icon: Trophy, t: "SM-meriterad coach" },
            { Icon: Award, t: "Certifierad instruktör" },
            { Icon: Target, t: "Agility · Hoopers · Freestyle" },
            { Icon: Clock, t: "Svar inom 5 arbetsdagar" },
            { Icon: Users, t: "1 000+ nöjda ekipage" },
          ].map(({ Icon, t }) => (
            <div key={t} className="flex items-center justify-center gap-2 text-[12px] md:text-[13px] text-text-secondary">
              <Icon size={16} className="text-forest shrink-0" strokeWidth={1.8} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Varför AgilityManager Coach</div>
            <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.015em] text-forest">
              Den smarta vägen till bättre träning
            </h2>
            <p className="mt-4 text-[16px] text-text-secondary">Personlig hundträningscoach – utan kursavgifter, restid eller bindningstid.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUE_PROPS.map(({ Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl bg-white border border-stone/10 p-6 hover:shadow-xl hover:shadow-forest/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-forest to-forest/80 grid place-items-center text-white mb-4">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="font-display text-[18px] text-forest leading-tight mb-2">{title}</h3>
                <p className="text-[13.5px] text-text-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTAT / STATS */}
      <section className="py-16 px-4 bg-gradient-to-br from-forest via-forest to-forest/85 text-white relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,rgba(200,93,30,0.4),transparent_60%)]" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="font-display text-[30px] md:text-[42px] leading-tight tracking-[-0.01em]">
              Resultat som syns på banan
            </h2>
            <p className="mt-3 text-white/80 text-[15px]">Och i protokollet.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-[44px] md:text-[64px] leading-none tracking-[-0.02em]">
                  {s.number}<span className="text-white/70 text-[60%]">{s.suffix}</span>
                </div>
                <div className="mt-2 text-[12px] md:text-[13px] text-white/75">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COACH-PRESENTATION */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-stone/10 bg-gradient-to-br from-cream via-white to-cream/60 p-8 md:p-12 relative overflow-hidden">
            <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-forest/5 blur-3xl" />
            <div className="relative">
              <div className="flex items-start gap-4 mb-6">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-forest to-forest/70 grid place-items-center text-white shadow-lg shadow-forest/20">
                  <Award size={28} strokeWidth={1.6} />
                </div>
                <div>
                  <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase">Möt din coach</div>
                  <h2 className="font-display text-[30px] md:text-[42px] leading-tight tracking-[-0.01em] text-forest">Malin Öster</h2>
                  <p className="text-[14px] text-text-secondary mt-1">Certifierad instruktör · Agility, Hoopers & Freestyle</p>
                </div>
              </div>
              <div className="space-y-4 text-[15px] text-text-secondary leading-relaxed max-w-3xl">
                <p>
                  Jag är uppvuxen i en hundtokig familj och har hållit på med hundsport sedan tidig barndom. Min
                  första egna hund var en shetland sheepdog där fokus låg på agility – tillsammans tog vi oss hela
                  vägen till <strong className="text-forest">SM 2014</strong>.
                </p>
                <p>
                  Idag delar jag livet med två miniature american shepherds. <strong className="text-forest">Luna (9 år)</strong> tävlar
                  i klass 3 agility, avancerad klass i rallylydnad och klass 2 i freestyle. <strong className="text-forest">Vita (7 år)</strong> tränar
                  främst hoopers och agility-foundation.
                </p>
                <p>
                  Min styrka som instruktör är att se helheten mellan förare och hund – och ge konkret,
                  konstruktiv feedback du faktiskt kan ta med dig till nästa pass.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
                {[
                  { Icon: Trophy, line1: "SM-meriterad", line2: "i agility" },
                  { Icon: Award, line1: "Utbildad instruktör", line2: "flera discipliner" },
                  { Icon: Heart, line1: "Aktiv tävlingsförare", line2: "med två egna hundar" },
                ].map(({ Icon, line1, line2 }) => (
                  <div key={line1} className="rounded-xl bg-white p-4 flex items-center gap-3 border border-stone/10 shadow-sm">
                    <Icon size={18} className="text-forest shrink-0" strokeWidth={1.8} />
                    <div className="text-[13px] text-text-primary leading-tight">
                      {line1}<br />
                      <span className="text-stone text-[11px]">{line2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HUR DET FUNGERAR */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Så fungerar videocoachning</div>
            <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.015em] text-forest">
              Tre enkla steg från video till genombrott
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Stiplad linje på desktop */}
            <div aria-hidden className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px border-t-2 border-dashed border-forest/20" />
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-2xl bg-white border border-stone/10 p-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-forest to-forest/80 grid place-items-center text-white mx-auto mb-4 shadow-lg shadow-forest/20 relative z-10">
                  <s.icon size={20} strokeWidth={1.8} />
                </div>
                <div className="text-[11px] tracking-[0.08em] font-semibold text-stone uppercase mb-1">Steg {i + 1}</div>
                <h3 className="font-display text-[20px] text-forest mb-2">{s.title}</h3>
                <p className="text-[14px] text-text-secondary leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">När passar det?</div>
            <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.015em] text-forest">
              Skapad för verkliga utmaningar
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {USE_CASES.map((u, i) => (
              <motion.div
                key={u.title}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="rounded-2xl border border-stone/10 bg-cream p-6 flex gap-4 hover:border-forest/30 hover:bg-white transition-colors"
              >
                <div className="text-3xl shrink-0">{u.emoji}</div>
                <div>
                  <h3 className="font-display text-[18px] text-forest mb-1.5 leading-tight">{u.title}</h3>
                  <p className="text-[14px] text-text-secondary leading-relaxed">{u.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Videocoach vs. fysisk kurs</div>
            <h2 className="font-display text-[30px] md:text-[42px] leading-tight tracking-[-0.01em] text-forest">
              När online-coach slår klubbträningen
            </h2>
            <p className="mt-4 text-[15px] text-text-secondary max-w-2xl mx-auto">
              En fysisk kurs är fantastisk – men ibland är personlig videocoachning ett smartare drag.
              100 % odelad uppmärksamhet på <em>ditt</em> ekipage, ingen restid, och feedback du kan läsa om och om igen.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-stone/10 overflow-hidden shadow-xl shadow-forest/5">
            <div className="grid grid-cols-[1.4fr_1fr_1fr] text-[12px] md:text-[13px] font-semibold uppercase tracking-wider bg-forest text-white">
              <div className="p-4">Funktion</div>
              <div className="p-4 text-center bg-forest/90">AgilityManager Coach</div>
              <div className="p-4 text-center text-white/80">Fysisk helgkurs</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-[1.4fr_1fr_1fr] text-[13px] md:text-[14px] ${i % 2 === 0 ? "bg-cream/40" : "bg-white"}`}>
                <div className="p-4 font-medium text-text-primary">{row.feature}</div>
                <div className="p-4 text-center text-forest font-medium flex items-center justify-center gap-1.5">
                  <Check size={15} className="shrink-0" /> <span>{row.us}</span>
                </div>
                <div className="p-4 text-center text-stone flex items-center justify-center gap-1.5">
                  <X size={14} className="shrink-0 opacity-60" /> <span>{row.kurs}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Vad andra säger</div>
            <h2 className="font-display text-[34px] md:text-[46px] leading-[1.05] tracking-[-0.015em] text-forest">
              Ekipage som tagit nästa steg
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {QUOTES.map((q, i) => (
              <motion.figure
                key={q.name}
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl bg-cream border border-stone/10 p-6 flex flex-col"
              >
                <div className="inline-flex items-center gap-0.5 text-secondary mb-3">
                  {[...Array(5)].map((_, idx) => <Star key={idx} size={13} fill="currentColor" />)}
                </div>
                <blockquote className="text-[14.5px] text-text-primary leading-relaxed flex-1">"{q.text}"</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-stone/10">
                  <div className="text-[14px] font-semibold text-forest leading-tight">{q.name}</div>
                  <div className="text-[12px] text-stone">{q.role}</div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* PAKET */}
      <section id="paket" className="py-20 px-4 bg-gradient-to-b from-cream to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Pris</div>
            <h2 className="font-display text-[34px] md:text-[46px] leading-tight tracking-[-0.015em] text-forest">
              Välj ett paket – kom igång idag
            </h2>
            <p className="mt-3 text-text-secondary text-[15px]">
              Engångsbetalning via Stripe · Inget abonnemang · Pro-medlemmar får ca&nbsp;50&nbsp;% rabatt
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PACKS.map((p) => (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 ${
                  p.popular
                    ? "border-forest bg-white ring-2 ring-forest/30 shadow-2xl shadow-forest/15 md:scale-[1.04] z-10"
                    : "border-stone/15 bg-white hover:border-forest/30 hover:shadow-lg"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-secondary text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md">
                    <Star size={11} fill="currentColor" /> Populärast
                  </div>
                )}
                <h3 className="font-display text-[24px] text-forest">{p.title}</h3>
                <p className="text-[13px] text-stone mt-1">{p.sub}</p>
                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-[44px] text-forest leading-none">{p.price}</span>
                    <span className="text-[14px] text-stone">kr</span>
                  </div>
                  <div className="text-[12px] text-stone mt-1">
                    Pro-medlem: <strong className="text-forest">{p.pro} kr</strong>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 text-[13px] text-text-secondary">
                  <li className="flex gap-2"><Check size={14} className="text-forest mt-0.5 shrink-0" /> Skriftlig analys av Malin</li>
                  <li className="flex gap-2"><Check size={14} className="text-forest mt-0.5 shrink-0" /> Svar inom 5 arbetsdagar</li>
                  <li className="flex gap-2"><Check size={14} className="text-forest mt-0.5 shrink-0" /> Agility, hoopers & freestyle</li>
                </ul>
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

          <p className="text-center mt-8 text-[12px] text-stone">
            🔒 Säker betalning via Stripe · 💯 Pengarna tillbaka om coachen inte kan ge feedback
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] tracking-[0.08em] font-semibold text-secondary uppercase mb-3">Vanliga frågor</div>
            <h2 className="font-display text-[32px] md:text-[42px] leading-tight tracking-[-0.01em] text-forest">
              Allt du undrar om videocoachning
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((f, idx) => (
              <details
                key={f.q}
                {...(idx === 0 ? { open: true } : {})}
                className="group rounded-2xl border border-stone/15 bg-white p-5 open:bg-cream open:border-forest/20 transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-display text-[17px] text-forest pr-4">{f.q}</span>
                  <span className="w-7 h-7 rounded-full bg-forest/10 grid place-items-center text-forest text-sm group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-[14.5px] text-text-secondary leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* SLUT-CTA */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto rounded-[32px] bg-gradient-to-br from-forest via-forest to-forest/85 text-white p-10 md:p-14 text-center relative overflow-hidden shadow-2xl shadow-forest/30">
          <div aria-hidden className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(200,93,30,0.4),transparent_50%)]" />
          <div className="relative">
            <Zap size={32} className="mx-auto mb-4 text-secondary" strokeWidth={1.6} />
            <h3 className="font-display text-[30px] md:text-[44px] leading-[1.05] tracking-[-0.015em] max-w-2xl mx-auto">
              Redo att förbättra ditt nästa pass?
            </h3>
            <p className="mt-4 text-white/85 max-w-xl mx-auto text-[16px] leading-relaxed">
              Konkret feedback från en SM-meriterad coach – från <strong className="text-white">79 kr</strong>. Inget abonnemang. Inga ursäkter.
            </p>
            <Button
              variant="secondary"
              onClick={goToCoach}
              className="mt-7 h-13 px-8 bg-white text-forest hover:bg-white/90 gap-2 text-[15px] shadow-xl"
            >
              {user ? "Skicka in video nu" : "Skapa konto & kom igång"}
              <ArrowRight size={16} />
            </Button>
            <p className="mt-5 text-[12px] text-white/60">
              Redan medlem?{" "}
              <Link to="/auth?redirect=/v3/coach" className="underline hover:text-white">
                Logga in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* SEO-RIK BOTTENTEXT */}
      <section className="px-4 pb-24">
        <div className="max-w-3xl mx-auto rounded-2xl bg-white/60 border border-stone/10 p-7 md:p-10">
          <h2 className="font-display text-[22px] md:text-[26px] text-forest mb-4 leading-tight">
            Personlig hundträningscoach – när du vill, var du vill
          </h2>
          <div className="space-y-4 text-[14px] text-text-secondary leading-relaxed">
            <p>
              Att hitta en personlig hundträningscoach som verkligen förstår dig och din hunds unika behov kan vara en utmaning.
              Med framväxten av digitala lösningar har <strong>agility coach online</strong> blivit ett kraftfullt verktyg för
              ekipage på alla nivåer. Istället för att vänta på nästa fysiska kurs kan du nu få omedelbar, skräddarsydd
              <strong> agility feedback online</strong> precis när du behöver det som mest. Du väljer att skicka in din
              träningsvideo till en coach och får tillbaka en detaljerad analys – modern <strong>videocoachning för hund</strong>,
              anpassad för ett liv där tiden är knapp.
            </p>
            <p>
              För den som letar efter en komplett <strong>agility online kurs</strong> är personlig feedback ett ovärderligt
              komplement. Medan en kurs ger en bred grund hjälper en online coach dig att applicera kunskapen på just dina
              utmaningar. Vår coach <strong>Malin Öster</strong> är ett välkänt namn inom svensk hundsport, och hennes förmåga
              att se de små detaljerna är vad som skiljer en bra runda från en fantastisk.
            </p>
            <p>
              Det handlar inte bara om agility. Letar du efter en <strong>hoopers coach</strong> som kan hjälpa dig med bågar
              och distanshandling? Eller en <strong>freestyle coach för hund</strong> som finslipar koreografin? Genom
              AgilityManager-appen laddar du enkelt upp din video och får personlig vägledning oavsett gren – tillgängligt
              i hela Sverige.
            </p>
            <p>
              Fördelarna med att anlita en agility coach online är många: 100 % odelad uppmärksamhet på dig och din hund,
              ingen restid, möjlighet att läsa feedbacken om och om igen, och en kostnad per insikt som är en bråkdel av
              en helgkurs. Skapa ett gratis konto, välj paket och få konkreta tips levererat direkt i appen inom 5 arbetsdagar.
            </p>
          </div>
        </div>
      </section>

      <LandingFooterV2 />

      <CoachUploadFlow
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        initialPack={selectedPack}
        prefill={resumePrefill}
        initialStep={resumeStep}
      />
    </div>
  );
}
