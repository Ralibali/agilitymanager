import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  ArrowRight, Check, LayoutGrid, Trophy, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

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

const topFeatures = [
  {
    icon: Activity,
    title: 'Logga pass på 10 sekunder',
    desc: 'Hoops, tunnlar eller tunnor. Hund, fokusområde, betyg. Klart. Appen syncar i realtid till alla dina enheter.',
  },
  {
    icon: LayoutGrid,
    title: 'Rita banor, dela direkt',
    desc: 'Alla SHoK-godkända hinder och färdiga mallar för Startklass, K1, K2 och K3. Snap-to-grid, mätverktyg, export som PDF.',
  },
  {
    icon: Trophy,
    title: 'SHoK-poäng – automatiskt',
    desc: 'Resultat hämtas från shoktavling.se. DO/BO/UL-bonusar räknas av sig själv och uppflyttning visualiseras per hund.',
  },
];

const coachPills = [
  'SM-meriterad tävlingsförare',
  'Utbildad instruktör',
  'Hoopers · agility · freestyle',
];

const benefits = [
  'Anpassat för SHoK:s regelverk och klasser',
  'Stöd för Small och Large storleksklasser',
  'Automatisk poängberäkning med DO/BO/UL-bonusar',
  'Banmallar för Startklass, K1, K2 och K3',
  'Fungerar på mobil, surfplatta och dator',
  '7 dagars gratis Pro-testperiod utan betalkrav',
];

export default function HoopersLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Hoopers app – Träningslogg, poängtracker & banplanerare | AgilityManager</title>
        <meta name="description" content="AgilityManager för hoopers – logga träningspass, spåra SHoK-poäng, planera banor och se tävlingskalendern. Anpassat för alla hoopers-klasser." />
        <link rel="canonical" href="https://agilitymanager.se/hoopers" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "AgilityManager – Hoopers",
          "applicationCategory": "SportsApplication",
          "description": "Träningsapp för hoopers med hund. Logga pass, spåra SHoK-poäng och planera banor.",
          "operatingSystem": "Web",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "SEK" },
          "author": { "@type": "Organization", "name": "AgilityManager", "url": "https://agilitymanager.se" }
        })}</script>
      </Helmet>

      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(221,79%,15%)] via-[hsl(221,79%,22%)] to-[hsl(221,79%,30%)] pt-28 pb-20 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(16,100%,60%,0.15),transparent_60%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
              🏆 Hoopers i Sverige
            </span>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="font-display font-bold text-white text-3xl sm:text-5xl leading-tight mb-6">
            Den kompletta appen för{' '}
            <span className="text-accent">hoopers med hund</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="text-white/70 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            Logga träningspass, spåra SHoK-poäng, planera banor och håll koll på tävlingskalendern – allt i en app, anpassat för hoopers.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-accent text-white font-semibold text-base px-8" onClick={() => navigate('/auth')}>
              Kom igång gratis <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/hoopers-regler')}>
              Läs hoopers-reglerna
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features (top-3) */}
      <section id="features" className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-14">
            <p
              className="mb-3"
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
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Träningslogg, banplanerare, SHoK-poäng, coach. Inga fler spreadsheets.
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
                  className="text-muted-foreground"
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Se alla 14 funktioner <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Coach */}
      <section className="py-20 px-4" style={{ background: '#0f1411' }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...inViewFadeUp()}>
            <span
              className="inline-block mb-5"
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
            className="mx-auto mb-8"
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
            className="italic mx-auto"
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
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-2 transition-colors"
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

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-10">
            <h2 className="font-display font-bold text-foreground text-2xl sm:text-3xl mb-3">
              Varför AgilityManager för hoopers?
            </h2>
          </motion.div>

          <motion.div {...inViewFadeUp(0.1)} className="grid sm:grid-cols-2 gap-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Check size={18} className="text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80">{b}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SHoK info */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div {...inViewFadeUp()}>
            <h2 className="font-display font-bold text-foreground text-xl sm:text-2xl mb-4">
              Vad är hoopers?
            </h2>
            <p className="text-muted-foreground mb-4">
              Hoopers är en hundsport där hunden springer genom en bana med bågar, tunnlar, tunnor och staket – medan föraren dirigerar från ett fast dirigeringsområde. Sporten är skonsam för hundens leder och passar alla åldrar och storlekar.
            </p>
            <p className="text-muted-foreground mb-6">
              I Sverige styrs sporten av <strong className="text-foreground">Svenska Hoopersklubben (SHoK)</strong> med fyra tävlingsklasser: Startklass, Klass 1, Klass 2 och Klass 3. Läs mer om reglerna i vår detaljerade guide.
            </p>
            <Button variant="outline" onClick={() => navigate('/hoopers-regler')}>
              Läs hela regelverket <ArrowRight size={16} className="ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Final CTA (full-width grön) */}
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
            className="mb-8 mx-auto"
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
              className="inline-flex items-center gap-2 transition-transform hover:scale-[1.02]"
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
            className="mt-4"
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Eller testa Pro 7 dagar utan kostnad
          </motion.p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
