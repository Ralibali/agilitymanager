import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, useInView } from 'framer-motion';
import {
  ClipboardList, LayoutGrid, Trophy, TrendingUp, Target, Shield,
  ChevronDown, ArrowRight, Check, Star, Zap, Users, MessageCircle,
  Timer, Brain, Download, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';
import { CountUp } from '@/components/CountUp';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useState } from 'react';

/* ────── animation helpers ────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.5, delay, ease: 'easeOut' as const },
});

const inViewFadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: '-60px' as const },
  transition: { duration: 0.5, delay, ease: 'easeOut' as const },
});

/* ────── data ────── */
const usps = [
  { icon: ClipboardList, title: 'Träningslogg', desc: 'Logga varje pass – agility och hoopers. Sätt träningsmål och följ din progression.' },
  { icon: LayoutGrid, title: 'Banplanerare', desc: 'Rita banor med alla hinder, exportera som PNG eller PDF och dela med vänner.' },
  { icon: Trophy, title: 'Tävling & resultat', desc: 'Tävlingskalender, resultatlogg, klassuppflyttning och automatisk resultatimport.' },
];

const features = [
  { icon: ClipboardList, title: 'Träningslogg', desc: 'Logga datum, hund, fokusområde, energinivå och notat. Betygsätt dirigering och banflyt. Bygg upp din historik pass för pass.' },
  { icon: LayoutGrid, title: 'Banplanerare', desc: 'Designa banor med alla SAgiK- och SHoK-godkända hinder. Snap-to-grid, mätverktyg, färgteman och exempelbanor.' },
  { icon: Download, title: 'Exportera banor', desc: 'Exportera dina banor som PNG eller PDF med metadata – datum, banstorlek och antal hinder. Helt gratis.' },
  { icon: Trophy, title: 'Tävlingsresultat', desc: 'Logga tävlingar med klass, tid, fel och pinnar. Hämta resultat automatiskt från agilitydata.se.' },
  { icon: Calendar, title: 'Tävlingskalender', desc: 'Se alla kommande agility- och hooperstävlingar i Sverige. Filtrera på län, bevaka och få påminnelser.' },
  { icon: TrendingUp, title: 'Statistik & progression', desc: 'Diagram över tid, fel, godkänt-andel och utveckling per hund. Identifiera vad ni behöver träna mer.' },
  { icon: Target, title: 'Träningsmål', desc: 'Sätt upp mål med delmål och följ din progress. Kategorisera per träningsområde.' },
  { icon: Brain, title: 'AI-träningsinsikter', desc: 'Få personliga träningsrekommendationer baserade på din loggade data och ditt tävlingsresultat.' },
  { icon: Shield, title: 'Hälsologg & vikt', desc: 'Logga veterinärbesök, vaccinationer och vikt med viktdiagram. Håll koll på nästa besök.' },
  { icon: Users, title: 'Klubbar & grupper', desc: 'Skapa eller gå med i din agilityklubb. Anslagstavla, delade kalendrar, event-anmälan och grupper.' },
  { icon: MessageCircle, title: 'Vänner & chatt', desc: 'Lägg till vänner, chatta, dela banor och jämför statistik. Skanna QR-kod för snabb tillägg.' },
  { icon: Timer, title: 'Tidtagning', desc: 'Inbyggd stoppur för träning med felräkning. Spara tider per hund och följ förbättringar.' },
];

const testimonials = [
  { quote: 'Äntligen ett ställe att samla allt. Jag kan se exakt var vi tappat tid de senaste 6 månaderna.', name: 'Sofia L.', dog: 'Border Collie, Klass 3' },
  { quote: 'Banplaneraren är guld. Jag skissar upp träningsbanor på tio minuter istället för att rita på papper.', name: 'Marcus K.', dog: 'Shetland Sheepdog, Klass 2' },
  { quote: 'Älskar att man kan logga hoopers också. Perfekt att ha allt samlat i en app.', name: 'Anna P.', dog: 'Australian Shepherd, Klass 1' },
];

const faqs = [
  { q: 'Vad är agility och hur fungerar klassystemet?', a: 'Agility är en hinderbana på tid. I Sverige tävlar man i klass 1–3 under SAgiK/SKK. Man behöver 3 pinnar per klass för att flytta upp.' },
  { q: 'Vad är hoopers?', a: 'Hoopers är en hundsport där hunden springer igenom bågar, tunnlar och runt tunnor – utan hopp. Föraren dirigerar på distans. Det är officiell SKK-sport sedan november 2025.' },
  { q: 'Kan jag logga både agility och hoopers?', a: 'Ja. Du väljer sport per hund, så kan du ha en agilityträning och en hoopers-hund i samma konto.' },
  { q: 'Hur fungerar banplaneraren?', a: 'Dra och släpp hinder på en canvas med rutnät. Du kan exportera banan som PNG eller PDF med metadata. Både agility- och hoopers-hinder stöds.' },
  { q: 'Kan jag dela banor med andra?', a: 'Ja. Du kan dela banor direkt via appen till vänner, eller exportera som bild/PDF och dela via valfri kanal.' },
  { q: 'Stöder appen SHoK:s regelverk?', a: 'Ja. Klasstruktur, hinderkategorier och storleksindelning följer Svenska Hoopersklubbens officiella regler.' },
  { q: 'Fungerar appen för nybörjare?', a: 'Ja. Du behöver inga förkunskaper. Fyll i vad du tränat, hur det gick och appen gör resten.' },
  { q: 'Är AgilityManager gratis?', a: 'Grundversionen är gratis utan tidsbegränsning. Du får 7 dagars gratis Pro när du skapar ett konto – ingen betalning krävs. Därefter kan du uppgradera till Pro för full tillgång.' },
];

/* ────── component ────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>AgilityManager – Träningsapp för agility och hoopers</title>
        <meta name="description" content="Logga träningspass, följ framsteg och analysera din hund i agility och hoopers. Anpassat för svenska regler och SHoK:s officiella klasser." />
        <link rel="canonical" href="https://agilitymanager.se/" />
      </Helmet>

      <LandingNavbar />

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[hsl(220,40%,7%)]" id="main-content">
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(221,79%,48%)" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Decorative agility SVG - desktop only */}
        <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[420px] h-[420px] opacity-[0.08]">
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 350 L40 280 L80 280 L80 350" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M120 350 L120 300 L160 300 L160 350" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M200 350 L200 260" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M220 350 L220 260" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M240 350 L240 260" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M260 350 L260 260" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M280 350 L280 260" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <ellipse cx="340" cy="310" rx="40" ry="25" stroke="hsl(221,79%,48%)" strokeWidth="2" />
            <path d="M60 200 Q200 120 340 200" stroke="hsl(221,79%,48%)" strokeWidth="1.5" strokeDasharray="6 4" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center px-4 py-24">
          <motion.h1
            {...fadeUp(0)}
            className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-7xl tracking-tight leading-[1.1] mb-6"
          >
            Träningsappen för{' '}
            <span className="text-primary">agility och hoopers.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="text-lg sm:text-xl text-[hsl(215,20%,65%)] max-w-xl mx-auto mb-4 font-body leading-relaxed"
          >
            Logga pass, analysera framsteg och håll koll på din hunds utveckling. Oavsett om du kör agility, hoopers eller båda.
          </motion.p>

          <motion.p
            {...fadeUp(0.35)}
            className="text-sm text-[hsl(215,20%,55%)] mb-8"
          >
            🐕 Anpassad för SKK:s och SHoK:s regelverk
          </motion.p>

          <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-semibold gap-2 text-base px-8 h-12"
              onClick={() => navigate('/auth')}
            >
              Kom igång gratis <ArrowRight size={18} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20 font-semibold text-base px-8 h-12 bg-white/10 backdrop-blur-sm"
              onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Se hur det fungerar
            </Button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown size={28} className="text-white/30" />
        </motion.div>
      </section>

      {/* ═══════ USP TRIO ═══════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {usps.map((usp, i) => (
            <motion.div key={usp.title} {...inViewFadeUp(i * 0.1)} className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <usp.icon size={26} className="text-primary" />
              </div>
              <h3 className="font-display font-bold text-foreground text-lg mb-2">{usp.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">{usp.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="py-20 px-4 bg-[hsl(210,25%,97%)]">
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-14">
            <h2 className="font-display font-bold text-foreground text-2xl sm:text-3xl mb-3">
              Allt du behöver – i en app
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Träningslogg, banplanerare, tävlingskalender, klubbar, chatt, AI-insikter och mer. AgilityManager fungerar för nybörjaren och tävlaren i klass 3.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...inViewFadeUp(i * 0.08)}
                whileHover={{ y: -2, boxShadow: '0 8px 30px -12px hsl(221 79% 48% / 0.15)' }}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm transition-all duration-200 hover:border-primary/30"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOOPERS ═══════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">Ny sport</span>
            <h2 className="font-display font-bold text-foreground text-2xl sm:text-3xl mb-3">
              Nu även för hoopers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hoopers är officiell SKK-sport sedan november 2025 och organiseras av Svenska Hoopersklubben (SHoK). AgilityManager stöder hela regelverket – från Startklass till Klass 3.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: 'Hoops, tunnlar & tunnor', desc: 'Logga alla hoopers-hinder: bågar, tunnlar, tunnor och staket.' },
              { title: 'SHoK-klasser', desc: 'Tävlingsklasser: Startklass, Klass 1, 2 och 3. Small (under 40 cm) och Large.' },
              { title: 'Dirigering & banflyt', desc: 'Betygsätt dirigeringskvalitet och banflyt (1–5) per pass och följ trenden.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                {...inViewFadeUp(i * 0.1)}
                className="bg-[hsl(210,25%,97%)] rounded-2xl border border-border p-6"
              >
                <h3 className="font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div {...inViewFadeUp(0.3)} className="mt-8 bg-[hsl(220,40%,7%)] rounded-2xl p-6 sm:p-8 text-white/80">
            <h3 className="font-display font-semibold text-white text-lg mb-2">Vad är hoopers?</h3>
            <p className="text-sm leading-relaxed">
              Hoopers är en hundsport där hunden tar sig igenom en bana med bågar, tunnlar, tunnor och staket – utan hopp. 
              Föraren dirigerar hunden på distans med kroppsspråk och röst från ett fastlagt dirigeringsområde. 
              Sporten passar alla hundar – oavsett ålder, ras och storlek. 
              <button onClick={() => navigate('/blogg/hoopers-hund')} className="text-primary hover:underline ml-1">Läs mer om hoopers →</button>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ AUDIENCE ═══════ */}
      <section className="py-20 px-4 bg-[hsl(210,33%,98%)]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-foreground text-2xl sm:text-3xl text-center mb-12">
            För dig – oavsett var du är i din resa
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Beginner */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-[hsl(220,40%,7%)] rounded-2xl p-8 text-white"
            >
              <p className="text-2xl mb-2">🐾</p>
              <h3 className="font-display font-bold text-xl mb-3">Nybörjare</h3>
              <p className="text-white/70 text-sm mb-5 leading-relaxed">
                Precis börjat träna agility? AgilityManager hjälper dig strukturera träningen, förstå regelverket och bygga en grund att stå på.
              </p>
              <ul className="space-y-2.5">
                {['Enkel träningslogg utan krångel', 'Banplanerare med export (PNG/PDF)', 'Hälsologg och träningsmål', 'Gå med i klubbar och grupper'].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-white/80">
                    <Check size={16} className="text-warning mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Competitor */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white rounded-2xl border-2 border-primary/20 p-8"
            >
              <p className="text-2xl mb-2">🏆</p>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">Aktiv tävlare</h3>
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                Jagar du pinnar i klass 1–3 eller siktar på SM? Håll koll på varje start, analysera dina resultat och planera nästa träning strategiskt.
              </p>
              <ul className="space-y-2.5">
                {['Detaljerad tävlingsstatistik per hund', 'AI-träningsinsikter och klassuppflyttning', 'Tävlingskalender med påminnelser', 'Vänner, chatt och bandelning'].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                    <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS / SWEDEN ═══════ */}
      <section className="py-20 px-4 bg-[hsl(220,40%,7%)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-white text-2xl sm:text-3xl mb-12">
            Byggt för svensk agility
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            <motion.div {...inViewFadeUp(0.1)}>
              <div className="font-display font-bold text-3xl sm:text-4xl text-warning mb-1">
                <CountUp end={100000} suffix="+" className="font-display font-bold text-3xl sm:text-4xl text-warning" />
              </div>
              <p className="text-white/60 text-sm">tävlingsstarter per år i Sverige</p>
            </motion.div>
            <motion.div {...inViewFadeUp(0.2)}>
              <div className="font-display font-bold text-3xl sm:text-4xl text-warning mb-1">
                <CountUp end={3} className="font-display font-bold text-3xl sm:text-4xl text-warning" /> <span className="font-display font-bold text-3xl sm:text-4xl text-warning">klasser</span>
              </div>
              <p className="text-white/60 text-sm">från nybörjare till champion</p>
            </motion.div>
            <motion.div {...inViewFadeUp(0.3)}>
              <div className="font-display font-bold text-3xl sm:text-4xl text-warning mb-1">
                <CountUp end={5} className="font-display font-bold text-3xl sm:text-4xl text-warning" /> <span className="font-display font-bold text-3xl sm:text-4xl text-warning">storleksklasser</span>
              </div>
              <p className="text-white/60 text-sm">alla hundraser välkomna</p>
            </motion.div>
          </div>

          <motion.p {...inViewFadeUp(0.4)} className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
            AgilityManager är byggt med SAgiK:s regelverk som grund – klasser, pinnar, championat och storleksklasser stämmer med hur svensk agility faktiskt fungerar.
          </motion.p>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-foreground text-2xl sm:text-3xl text-center mb-4">
            Välj din plan
          </motion.h2>

          {/* Toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-muted rounded-full p-1 flex gap-1">
              <button
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setAnnual(false)}
              >
                Månadsvis
              </button>
              <button
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${annual ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setAnnual(true)}
              >
                Årsvis
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div {...inViewFadeUp(0.1)} className="bg-white rounded-2xl border border-border p-8">
              <h3 className="font-display font-bold text-foreground text-xl mb-1">Gratis</h3>
              <p className="text-muted-foreground text-sm mb-6">Perfekt för att komma igång</p>
              <div className="font-display font-bold text-3xl text-foreground mb-6">0 kr<span className="text-base font-normal text-muted-foreground">/mån</span></div>
              <ul className="space-y-3 mb-8">
                {['Träningslogg (obegränsat)', '1 hund', 'Banplanerare (3 sparade banor)', 'Tävlingsresultat (senaste 10)', 'Banexport (PNG & PDF)', 'Hundförsäkringsjämförelse'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check size={16} className="text-success mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full font-semibold"
                onClick={() => navigate('/auth')}
              >
                Kom igång gratis
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              {...inViewFadeUp(0.2)}
              className="bg-white rounded-2xl border-2 border-primary p-8 relative"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full"
              >
                Mest populär
              </motion.div>
              <h3 className="font-display font-bold text-foreground text-xl mb-1">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6">För den seriösa tävlaren</p>
              <div className="font-display font-bold text-3xl text-foreground mb-6">
                {annual ? '99 kr' : '19 kr'}
                <span className="text-base font-normal text-muted-foreground">/{annual ? 'år' : 'mån'}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Allt i Gratis',
                  'Obegränsat antal hundar',
                  'Obegränsade sparade banor',
                  'Full tävlingshistorik',
                  'Avancerad statistik (90+ dagar)',
                  'AI-träningsinsikter',
                  'Vänner, chatt och bandelning',
                  'Tävlingskalender med påminnelser',
                  'Hämta resultat från agilitydata.se',
                  'CSV-export av träningsdata',
                ].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-primary text-primary-foreground font-semibold"
                onClick={() => navigate('/auth')}
              >
                Prova Pro 7 dagar gratis
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-20 px-4 bg-[hsl(210,33%,98%)]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-foreground text-2xl sm:text-3xl text-center mb-12">
            Vad svenska agilityförare säger
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                {...inViewFadeUp(i * 0.1)}
                className="bg-white rounded-2xl p-6 shadow-sm border border-border"
              >
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={16} className="text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-foreground text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.dog}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-foreground text-2xl sm:text-3xl text-center mb-10">
            Vanliga frågor
          </motion.h2>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} {...inViewFadeUp(i * 0.05)}>
                <AccordionItem value={`faq-${i}`} className="bg-[hsl(210,25%,97%)] rounded-xl border-none px-5">
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="py-20 px-4 bg-[hsl(220,40%,7%)]">
        <div className="max-w-lg mx-auto text-center">
          <motion.h2 {...inViewFadeUp()} className="font-display font-bold text-white text-2xl sm:text-3xl mb-3">
            Redo att börja?
          </motion.h2>
          <motion.p {...inViewFadeUp(0.1)} className="text-white/60 mb-8">
            Skapa ett gratis konto och börja logga din träning idag.
          </motion.p>
          <motion.div {...inViewFadeUp(0.2)}>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground font-semibold gap-2 text-base px-8 h-12"
              onClick={() => navigate('/auth')}
            >
              Skapa konto <ArrowRight size={18} />
            </Button>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}