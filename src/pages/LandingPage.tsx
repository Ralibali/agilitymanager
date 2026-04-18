import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ClipboardList, LayoutGrid, Trophy,
  ArrowRight, Check, Star, Activity,
  Users, Heart, Shield, GraduationCap, Sparkles, Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { TrustBar } from '@/components/landing/TrustBar';
import { LandingFooterV2 } from '@/components/landing/LandingFooterV2';
import { CountUp } from '@/components/CountUp';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useState } from 'react';

/* ────── animation helpers ────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.6, delay, ease: 'easeOut' as const },
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

const topFeatures = [
  {
    icon: Activity,
    title: 'Logga pass på 10 sekunder',
    desc: 'Bana, hinder eller hoopers. Hund, fokusområde, betyg. Klart. Appen syncar i realtid till alla dina enheter.',
  },
  {
    icon: LayoutGrid,
    title: 'Rita banor, dela direkt',
    desc: 'Alla SAgiK- och SHoK-godkända hinder. Snap-to-grid, mätverktyg, export som PDF. Dela med klubben eller träningskompisen.',
  },
  {
    icon: Trophy,
    title: 'Tävlingsdata – automatiskt',
    desc: 'Resultat hämtas från Agidadata.se. Klassresa, pinnar och meriter visualiseras per hund. Aldrig mer manuell inmatning.',
  },
];

const coachPills = [
  'SM-meriterad tävlingsförare',
  'Utbildad instruktör',
  'Agility · hoopers · freestyle',
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
  { q: 'Är AgilityManager gratis?', a: 'Grundversionen är gratis utan tidsbegränsning. Du får 7 dagars gratis Pro när du skapar ett konto – ingen betalning krävs.' },
];

/* ────── component ────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      <Helmet>
        <title>AgilityManager – Träningsapp för agility och hoopers</title>
        <meta name="description" content="Logga träningspass, följ framsteg och analysera din hund i agility och hoopers. Anpassat för svenska regler och SHoK:s officiella klasser." />
        <link rel="canonical" href="https://agilitymanager.se/" />
      </Helmet>

      <LandingNav />
      <main id="main-content">
        <Hero />
        <TrustBar />

        {/* Behåller gamla USP-blocket bortom Fas 1 – ersätts i Fas 2 */}

      {/* ═══════ FEATURES (top-3) ═══════ */}
      <section id="features" className="py-20 px-4" style={{ background: 'hsl(var(--secondary))' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-14">
            <p
              className="mb-3 font-body"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              Så fungerar det
            </p>
            <h2 className="font-display text-foreground text-2xl sm:text-3xl mb-3">
              Allt du behöver – i en app
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-body">
              Träningslogg, banplanerare, tävlingsdata, coach. Inga fler spreadsheets.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                {...inViewFadeUp(i * 0.08)}
                whileHover={{ y: -3 }}
                onClick={() => navigate('/funktioner')}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/funktioner');
                  }
                }}
                className="bg-card cursor-pointer transition-all duration-200 hover:border-primary/40"
                style={{
                  border: '0.5px solid hsl(var(--border))',
                  borderRadius: '14px',
                  padding: '28px',
                }}
              >
                <div
                  className="flex items-center justify-center mb-5"
                  style={{
                    width: '64px',
                    height: '64px',
                    background: '#e8f4ed',
                    borderRadius: '16px',
                  }}
                >
                  <f.icon size={28} style={{ color: '#1a6b3c' }} strokeWidth={1.75} />
                </div>
                <h3
                  className="font-display text-foreground mb-2"
                  style={{ fontSize: '18px', fontWeight: 500, lineHeight: 1.3 }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-muted-foreground font-body"
                  style={{ fontSize: '14px', lineHeight: 1.6 }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/funktioner')}
              className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Se alla 14 funktioner <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ COACH ═══════ */}
      <section className="py-20 px-4" style={{ background: '#0f1411' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...inViewFadeUp()}>
            <span
              className="inline-block mb-5 font-body"
              style={{
                background: '#1a6b3c',
                color: '#e8f4ed',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '999px',
              }}
            >
              Coach · Pro-funktion
            </span>
          </motion.div>

          <motion.h2
            {...inViewFadeUp(0.05)}
            className="font-display text-2xl sm:text-3xl mb-4"
            style={{ color: '#ffffff' }}
          >
            Få personlig feedback från en riktig coach
          </motion.h2>

          <motion.p
            {...inViewFadeUp(0.1)}
            className="font-body mx-auto mb-8"
            style={{
              fontSize: '16px',
              lineHeight: 1.6,
              maxWidth: '560px',
              color: 'rgba(232,237,232,0.7)',
            }}
          >
            Ladda upp en träningsvideo i appen. Vår coach tittar på dirigering, linjer och hundens tempo – och svarar med konkreta tips inom 48 timmar.
          </motion.p>

          <motion.div
            {...inViewFadeUp(0.15)}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {coachPills.map((pill) => (
              <span
                key={pill}
                className="font-body"
                style={{
                  padding: '6px 14px',
                  border: '0.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '999px',
                  fontSize: '12px',
                  color: 'rgba(232,237,232,0.85)',
                }}
              >
                {pill}
              </span>
            ))}
          </motion.div>

          <motion.blockquote
            {...inViewFadeUp(0.2)}
            className="font-body italic mx-auto"
            style={{
              fontSize: '20px',
              lineHeight: 1.5,
              maxWidth: '600px',
              color: '#ffffff',
              marginTop: '32px',
            }}
          >
            "Jag tittar på varje video och ger konkreta övningar att träna på. Ofta är det små justeringar i dirigeringen som gör största skillnaden."
          </motion.blockquote>

          <motion.p
            {...inViewFadeUp(0.25)}
            className="font-body"
            style={{
              fontSize: '13px',
              color: 'rgba(232,237,232,0.55)',
              marginTop: '12px',
            }}
          >
            — Coachen bakom AgilityManager
          </motion.p>

          <motion.p
            {...inViewFadeUp(0.3)}
            className="font-body"
            style={{
              fontSize: '13px',
              color: 'rgba(232,237,232,0.55)',
              marginTop: '28px',
            }}
          >
            Tillgänglig via Pro · Svarsgaranti 48h · Ingår i abonnemanget
          </motion.p>

          <motion.div {...inViewFadeUp(0.35)} className="mt-8">
            <button
              onClick={() => {
                const el = document.getElementById('pricing');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 font-body transition-colors"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'transparent',
                padding: '10px 20px',
                borderRadius: 'var(--radius-button)',
              }}
            >
              Läs mer om videoanalys <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══════ HOOPERS ═══════ */}
      <section className="py-20 px-4" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-10">
            <span
              className="inline-block px-3 py-1 text-xs font-semibold mb-4"
              style={{ background: '#fdf0e8', color: '#c85d1e', borderRadius: 'var(--radius-pill)' }}
            >
              Ny sport
            </span>
            <h2 className="font-display text-foreground text-2xl sm:text-3xl mb-3">
              Nu även för hoopers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-body">
              Hoopers är officiell SKK-sport sedan november 2025 och organiseras av Svenska Hoopersklubben (SHoK).
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
                className="border border-border p-6"
                style={{
                  background: 'hsl(var(--secondary))',
                  borderRadius: 'var(--radius-card)',
                }}
              >
                <h3 className="font-display text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-body">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            {...inViewFadeUp(0.3)}
            className="mt-8 p-6 sm:p-8"
            style={{
              background: 'linear-gradient(135deg, #1a2a1f, #111)',
              borderRadius: 'var(--radius-card)',
            }}
          >
            <h3 className="font-display text-white text-lg mb-2">Vad är hoopers?</h3>
            <p className="text-sm leading-relaxed font-body" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Hoopers är en hundsport där hunden tar sig igenom en bana med bågar, tunnlar, tunnor och staket – utan hopp.
              Föraren dirigerar hunden på distans med kroppsspråk och röst från ett fastlagt dirigeringsområde.
              Sporten passar alla hundar – oavsett ålder, ras och storlek.
              <button onClick={() => navigate('/blogg/hoopers-hund')} className="hover:underline ml-1" style={{ color: '#5cb87a' }}>Läs mer om hoopers →</button>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════ AUDIENCE ═══════ */}
      <section className="py-20 px-4" style={{ background: 'hsl(var(--secondary))' }}>
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display text-foreground text-2xl sm:text-3xl text-center mb-12">
            För dig – oavsett var du är i din resa
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Beginner */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="p-8 text-white"
              style={{
                background: 'linear-gradient(135deg, #1a2a1f, #111)',
                borderRadius: 'var(--radius-card)',
              }}
            >
              <p className="text-2xl mb-2">🐾</p>
              <h3 className="font-display text-xl mb-3">Nybörjare</h3>
              <p className="text-sm mb-5 leading-relaxed font-body" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Precis börjat träna agility? AgilityManager hjälper dig strukturera träningen och bygga en grund.
              </p>
              <ul className="space-y-2.5">
                {['Enkel träningslogg utan krångel', 'Banplanerare med export (PNG/PDF)', 'Hälsologg och träningsmål', 'Gå med i klubbar och grupper'].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm font-body" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <Check size={16} style={{ color: '#e8a05c' }} className="mt-0.5 flex-shrink-0" />
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
              className="bg-card p-8"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '2px solid rgba(26, 107, 60, 0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <p className="text-2xl mb-2">🏆</p>
              <h3 className="font-display text-xl text-foreground mb-3">Aktiv tävlare</h3>
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed font-body">
                Jagar du pinnar i klass 1–3 eller siktar på SM? Analysera dina resultat och planera strategiskt.
              </p>
              <ul className="space-y-2.5">
                {['Detaljerad tävlingsstatistik per hund', 'AI-träningsinsikter och klassuppflyttning', 'Tävlingskalender med påminnelser', 'Vänner, chatt och bandelning'].map(t => (
                  <li key={t} className="flex items-start gap-2 text-sm text-foreground font-body">
                    <Check size={16} style={{ color: '#1a6b3c' }} className="mt-0.5 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ STATS / SWEDEN ═══════ */}
      <section className="py-20 px-4" style={{ background: '#111111' }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 {...inViewFadeUp()} className="font-display text-white text-2xl sm:text-3xl mb-12">
            Byggt för svensk agility
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
            <motion.div {...inViewFadeUp(0.1)}>
              <div className="font-display text-3xl sm:text-4xl mb-1" style={{ color: '#e8a05c' }}>
                <CountUp end={100000} suffix="+" className="font-display text-3xl sm:text-4xl" />
              </div>
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>tävlingsstarter per år i Sverige</p>
            </motion.div>
            <motion.div {...inViewFadeUp(0.2)}>
              <div className="font-display text-3xl sm:text-4xl mb-1" style={{ color: '#e8a05c' }}>
                <CountUp end={3} className="font-display text-3xl sm:text-4xl" /> <span>klasser</span>
              </div>
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>från nybörjare till champion</p>
            </motion.div>
            <motion.div {...inViewFadeUp(0.3)}>
              <div className="font-display text-3xl sm:text-4xl mb-1" style={{ color: '#e8a05c' }}>
                <CountUp end={5} className="font-display text-3xl sm:text-4xl" /> <span>storleksklasser</span>
              </div>
              <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.5)' }}>alla hundraser välkomna</p>
            </motion.div>
          </div>

          <motion.p {...inViewFadeUp(0.4)} className="text-sm max-w-xl mx-auto leading-relaxed font-body" style={{ color: 'rgba(255,255,255,0.4)' }}>
            AgilityManager är byggt med SAgiK:s regelverk som grund – klasser, pinnar, championat och storleksklasser stämmer med hur svensk agility fungerar.
          </motion.p>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section id="pricing" className="py-20 px-4" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display text-foreground text-2xl sm:text-3xl text-center mb-4">
            Välj din plan
          </motion.h2>

          {/* Toggle */}
          <div className="flex justify-center mb-10">
            <div className="p-1 flex gap-1" style={{ background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-pill)' }}>
              <button
                className="px-4 py-1.5 text-sm font-medium transition-all font-body"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: !annual ? '#fff' : 'transparent',
                  boxShadow: !annual ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  color: !annual ? '#111' : '#999',
                }}
                onClick={() => setAnnual(false)}
              >
                Månadsvis
              </button>
              <button
                className="px-4 py-1.5 text-sm font-medium transition-all font-body"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  background: annual ? '#fff' : 'transparent',
                  boxShadow: annual ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  color: annual ? '#111' : '#999',
                }}
                onClick={() => setAnnual(true)}
              >
                Årsvis
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div
              {...inViewFadeUp(0.1)}
              className="bg-card border border-border p-8"
              style={{
                borderRadius: 'var(--radius-card)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <h3 className="font-display text-foreground text-xl mb-1">Gratis</h3>
              <p className="text-muted-foreground text-sm mb-6 font-body">Perfekt för att komma igång</p>
              <div className="font-display text-3xl text-foreground mb-6">0 kr<span className="text-base font-normal text-muted-foreground font-body">/mån</span></div>
              <ul className="space-y-3 mb-8">
                {['Träningslogg (obegränsat)', '1 hund', 'Banplanerare (3 sparade banor)', 'Tävlingsresultat (senaste 10)', 'Banexport (PNG & PDF)', 'Hundförsäkringsjämförelse'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground font-body">
                    <Check size={16} style={{ color: '#1a6b3c' }} className="mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full font-semibold" onClick={() => navigate('/auth')}>
                Kom igång gratis
              </Button>
            </motion.div>

            {/* Pro */}
            <motion.div
              {...inViewFadeUp(0.2)}
              className="bg-card p-8 relative"
              style={{
                borderRadius: 'var(--radius-card)',
                border: '2px solid #1a6b3c',
                boxShadow: '0 4px 16px rgba(26, 107, 60, 0.1)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-3 left-6 text-xs font-bold px-3 py-1"
                style={{ background: '#1a6b3c', color: '#fff', borderRadius: 'var(--radius-pill)' }}
              >
                Mest populär
              </motion.div>
              <h3 className="font-display text-foreground text-xl mb-1">Pro</h3>
              <p className="text-muted-foreground text-sm mb-6 font-body">För den seriösa tävlaren</p>
              <div className="font-display text-3xl text-foreground mb-6">
                {annual ? '99 kr' : '19 kr'}
                <span className="text-base font-normal text-muted-foreground font-body">/{annual ? 'år' : 'mån'}</span>
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
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground font-body">
                    <Check size={16} style={{ color: '#1a6b3c' }} className="mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full font-semibold"
                style={{ background: '#1a6b3c', color: '#fff' }}
                onClick={() => navigate('/auth')}
              >
                Prova Pro 7 dagar gratis
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section className="py-20 px-4" style={{ background: 'hsl(var(--secondary))' }}>
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display text-foreground text-2xl sm:text-3xl text-center mb-12">
            Vad svenska agilityförare säger
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                {...inViewFadeUp(i * 0.1)}
                className="bg-card border border-border p-6"
                style={{
                  borderRadius: 'var(--radius-card)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={16} style={{ color: '#c85d1e', fill: '#c85d1e' }} />
                  ))}
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4 italic font-body">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-foreground text-sm font-body">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-body">{t.dog}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="py-20 px-4" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-2xl mx-auto">
          <motion.h2 {...inViewFadeUp()} className="font-display text-foreground text-2xl sm:text-3xl text-center mb-10">
            Vanliga frågor
          </motion.h2>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} {...inViewFadeUp(i * 0.05)}>
                <AccordionItem
                  value={`faq-${i}`}
                  className="border-none px-5"
                  style={{ background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-card)' }}
                >
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4 font-body">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed font-body">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════ FINAL CTA (full-width grön) ═══════ */}
      <section className="py-20 px-4" style={{ background: '#1a6b3c' }}>
        <div className="max-w-2xl mx-auto text-center">
          <motion.h2
            {...inViewFadeUp()}
            className="font-display text-2xl sm:text-3xl mb-3"
            style={{ color: '#ffffff' }}
          >
            Börja träna smartare idag
          </motion.h2>
          <motion.p
            {...inViewFadeUp(0.1)}
            className="mb-8 font-body mx-auto"
            style={{
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.85)',
              maxWidth: '480px',
            }}
          >
            Gratis att starta. Ingen kortbindning. Uppgradera när du vill.
          </motion.p>
          <motion.div {...inViewFadeUp(0.2)}>
            <button
              onClick={() => navigate('/auth?mode=signup')}
              className="inline-flex items-center gap-2 font-body transition-transform hover:scale-[1.02]"
              style={{
                background: '#ffffff',
                color: '#0f1411',
                fontSize: '15px',
                fontWeight: 500,
                padding: '14px 28px',
                borderRadius: 'var(--radius-button)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
            >
              Skapa gratis konto <ArrowRight size={18} />
            </button>
          </motion.div>
          <motion.p
            {...inViewFadeUp(0.3)}
            className="font-body mt-4"
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Eller testa Pro 7 dagar utan kostnad
          </motion.p>
        </div>
      </section>

      </main>
      <LandingFooterV2 />
    </div>
  );
}
