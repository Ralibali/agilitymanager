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

const features = [
  { icon: CircleDot, title: 'Hoopers-träningslogg', desc: 'Logga dirigeringskvalitet, banflyt och DO-zon. Spåra utvecklingen pass för pass.' },
  { icon: LayoutGrid, title: 'Hoopers-banplanerare', desc: 'Rita banor med hoops, tunnlar, tunnor och staket. Färdiga SHoK-mallar för alla klasser.' },
  { icon: Trophy, title: 'Poängtracker', desc: 'Spåra SHoK-poäng automatiskt. Se hur nära uppflyttning du är med realtidsberäkning.' },
  { icon: TrendingUp, title: 'Resultatimport', desc: 'Importera resultat direkt från shoktavling.se. Automatisk poängberäkning med bonusar.' },
  { icon: Target, title: 'Tävlingskalender', desc: 'Se alla kommande hoopers-tävlingar i Sverige. Filtrera på klass, län och datum.' },
  { icon: BarChart3, title: 'Statistik & ranking', desc: 'Följ din utveckling med grafer per hund, klass och storlek. Jämför med kompisar.' },
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

      {/* Features */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-5xl mx-auto">
          <motion.div {...inViewFadeUp()} className="text-center mb-14">
            <h2 className="font-display font-bold text-foreground text-2xl sm:text-3xl mb-3">
              Allt du behöver för hoopers
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Byggt för SHoK:s regelverk – från Startklass till Klass 3.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} {...inViewFadeUp(i * 0.08)}>
                <Card className="h-full border-border hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon size={20} className="text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-foreground text-base mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div {...inViewFadeUp()}>
            <h2 className="font-display font-bold text-foreground text-2xl sm:text-3xl mb-4">
              Redo att spåra din hoopers-resa?
            </h2>
            <p className="text-muted-foreground mb-6">
              Skapa ett gratis konto och börja logga träningspass, spåra poäng och planera banor idag.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground font-semibold text-base px-8" onClick={() => navigate('/auth')}>
              Kom igång gratis <ArrowRight size={18} className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
