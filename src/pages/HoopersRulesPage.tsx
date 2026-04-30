import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CircleDot, Ruler, Award, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingNavbar } from '@/components/LandingNavbar';
import { LandingFooter } from '@/components/LandingFooter';

const classes = [
  { name: 'Startklass', obstacles: '10–15', doSize: '4 m', zones: 1, tunnel: false, gate: false, points: 200, desc: 'Introduktionsklass. Enkel bandesign utan tunnel eller staket.' },
  { name: 'Klass 1', obstacles: '13–20', doSize: '3 m', zones: 2, tunnel: true, gate: false, points: 300, desc: 'Tunnel tillåten. Kräver bättre dirigering på avstånd.' },
  { name: 'Klass 2', obstacles: '17–22', doSize: '2 m', zones: 2, tunnel: true, gate: true, points: 500, desc: 'Staket tillkommer. Ökad komplexitet i bandesign.' },
  { name: 'Klass 3', obstacles: '20–24', doSize: '2 m', zones: 3, tunnel: true, gate: true, points: 0, desc: 'Elitklassen. Tre dirigeringsområden och avancerade banor.' },
];

const obstacles = [
  { name: 'Båge (Hoop)', dim: '88 cm bred, ~80 cm genomlopp', desc: 'Hunden springer igenom bågen. Grundhindret i hoopers.' },
  { name: 'Bottenlös tunnel', dim: 'Ø 80 cm, 100 cm lång', desc: 'Rak tunnel utan botten – hunden passerar igenom.' },
  { name: 'Tunna (Barrel)', dim: 'Ø ~60 cm, ~90 cm hög', desc: 'Hunden springer runt tunnan – inte igenom.' },
  { name: 'Staket (Gate)', dim: '100–120 cm bred, 60–80 cm hög', desc: 'Hunden passerar bakom staketet. Från Klass 2.' },
];

const bonuses = [
  { code: 'DO', label: 'Dirigeringsområde', points: '+15p', desc: 'Föraren stannar i dirigeringsområdet under hela loppet.' },
  { code: 'BO', label: 'Bonusområde', points: '+25p', desc: 'Föraren dirigerar från bonusområdet istället för att följa med.' },
  { code: 'UL1', label: 'Utökad ledning 1', points: '+10p', desc: 'Hunden klarar hinder på >5 m avstånd.' },
  { code: 'UL2', label: 'Utökad ledning 2', points: '+15p', desc: 'Hunden klarar hinder på >8 m avstånd.' },
  { code: 'UL3', label: 'Utökad ledning 3', points: '+25p', desc: 'Hunden klarar hinder på >12 m avstånd.' },
];

export default function HoopersRulesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Hoopers regler – SHoK:s regelverk för hoopers med hund | AgilityManager</title>
        <meta name="description" content="Komplett guide till hoopers-regler i Sverige. SHoK:s klasser (Startklass–Klass 3), hinder, poängberäkning, dirigeringsområden och uppflyttningskrav." />
        <link rel="canonical" href="https://agilitymanager.se/hoopers-regler" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Hoopers regler – SHoK:s officiella regelverk",
          "description": "Komplett guide till hoopers-regler i Sverige. Klasser, hinder, poäng och uppflyttning.",
          "author": { "@type": "Organization", "name": "AgilityManager", "email": "info@auroramedia.se" },
          "publisher": { "@type": "Organization", "name": "AgilityManager", "url": "https://agilitymanager.se" },
          "datePublished": "2026-04-11",
          "inLanguage": "sv"
        })}</script>
      </Helmet>

      <LandingNavbar />

      <article className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 text-primary mb-4">
            <BookOpen size={20} />
            <span className="text-sm font-medium">Regelverk</span>
          </div>

          <h1 className="font-display font-bold text-foreground text-3xl sm:text-4xl leading-tight mb-4">
            Hoopers regler – SHoK:s regelverk för hoopers i Sverige
          </h1>
          <p className="text-muted-foreground text-lg mb-10">
            Allt du behöver veta om klasser, hinder, poängberäkning och uppflyttning i hoopers – baserat på Svenska Hoopersklubbens (SHoK) officiella regelverk.
          </p>

          <div className="prose prose-lg max-w-none text-foreground/90 space-y-10">

            {/* Intro */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl mt-0">Vad är hoopers?</h2>
              <p>
                Hoopers är en hundsport där hunden springer en bana med bågar (hoops), tunnlar, tunnor och staket – medan föraren dirigerar från ett fast dirigeringsområde (DO). Till skillnad från agility hoppar hunden inte, vilket gör hoopers skonsamt för leder och lämpligt för hundar i alla åldrar och storlekar.
              </p>
              <p>
                I Sverige regleras hoopers av <strong>Svenska Hoopersklubben (SHoK)</strong>. Tävlingar arrangeras av SHoK-anslutna klubbar och resultat rapporteras via <a href="https://shoktavling.se" target="_blank" rel="noopener" className="text-primary hover:underline">shoktavling.se</a>.
              </p>
            </section>

            {/* Storleksklasser */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl flex items-center gap-2">
                <Ruler size={20} className="text-primary" /> Storleksklasser
              </h2>
              <p>SHoK delar in hundar i två storleksklasser baserat på mankhöjd:</p>
              <div className="grid sm:grid-cols-2 gap-4 not-prose">
                <Card className="border-border">
                  <CardContent className="pt-5">
                    <Badge className="mb-2 bg-primary/10 text-primary">Small</Badge>
                    <p className="text-sm text-foreground/80">Hundar med mankhöjd <strong>under 40 cm</strong>. Lägre hinderhöjder och anpassad bantid.</p>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="pt-5">
                    <Badge className="mb-2 bg-primary/10 text-primary">Large</Badge>
                    <p className="text-sm text-foreground/80">Hundar med mankhöjd <strong>40 cm och över</strong>. Standard hinderhöjder.</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Klasser */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl flex items-center gap-2">
                <Award size={20} className="text-primary" /> Tävlingsklasser
              </h2>
              <p>SHoK har fyra klasser. Uppflyttning sker genom att samla poäng på godkända lopp:</p>
              <div className="not-prose space-y-4">
                {classes.map((c) => (
                  <Card key={c.name} className="border-border">
                    <CardContent className="pt-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-display font-bold text-foreground text-base">{c.name}</h3>
                        {c.points > 0 && (
                          <Badge variant="outline" className="text-xs">{c.points}p för uppflyttning</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mb-3">{c.desc}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div><span className="font-semibold text-foreground">Hinder:</span> {c.obstacles}</div>
                        <div><span className="font-semibold text-foreground">DO:</span> {c.doSize}</div>
                        <div><span className="font-semibold text-foreground">DO-zoner:</span> {c.zones}</div>
                        <div><span className="font-semibold text-foreground">Tunnel:</span> {c.tunnel ? 'Ja' : 'Nej'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Hinder */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl flex items-center gap-2">
                <CircleDot size={20} className="text-primary" /> Hindertyper
              </h2>
              <div className="not-prose space-y-3">
                {obstacles.map((o) => (
                  <Card key={o.name} className="border-border">
                    <CardContent className="pt-5">
                      <h3 className="font-display font-bold text-foreground text-sm mb-1">{o.name}</h3>
                      <p className="text-sm text-foreground/80">{o.desc}</p>
                      <p className="text-xs text-muted-foreground mt-1">Mått: {o.dim}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Dirigeringsområde */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl flex items-center gap-2">
                <Users size={20} className="text-primary" /> Dirigeringsområde (DO)
              </h2>
              <p>
                I hoopers dirigerar föraren hunden från ett fast <strong>dirigeringsområde (DO)</strong>. Föraren får inte lämna DO under loppet – all kommunikation sker genom kroppsspråk, röst och handtecken på distans. DO:s storlek varierar beroende på klass:
              </p>
              <ul>
                <li><strong>Startklass:</strong> 4 meter i diameter – stort och generöst</li>
                <li><strong>Klass 1:</strong> 3 meter – kräver bättre positionering</li>
                <li><strong>Klass 2–3:</strong> 2 meter – kräver precision och planering</li>
              </ul>
              <p>
                Det är dirigeringen som skiljer hoopers från agility. Att kunna läsa banans flöde och planera sina signaler i förväg är nyckeln till framgång.
              </p>
            </section>

            {/* Poängberäkning */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Poängberäkning</h2>
              <p>
                Varje godkänt lopp ger <strong>10 poäng</strong> (eller 5 poäng vid mindre bra lopp). Utöver baspoängen kan ekipaget samla bonuspoäng:
              </p>
              <div className="not-prose space-y-2">
                {bonuses.map((b) => (
                  <div key={b.code} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge className="bg-primary/10 text-primary shrink-0 mt-0.5">{b.code}</Badge>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{b.label} <span className="text-primary font-bold">{b.points}</span></div>
                      <p className="text-xs text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Uppflyttning */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Uppflyttning</h2>
              <p>Ekipaget flyttas upp till nästa klass när tillräckligt många poäng samlats:</p>
              <ul>
                <li><strong>Startklass → Klass 1:</strong> 200 poäng</li>
                <li><strong>Klass 1 → Klass 2:</strong> 300 poäng</li>
                <li><strong>Klass 2 → Klass 3:</strong> 500 poäng</li>
              </ul>
              <p>
                Poäng ackumuleras per hund och storleksklass. I AgilityManager kan du följa din poängutveckling automatiskt via <a href="/app/competition" className="text-primary hover:underline">hoopers-poängtrackern</a>.
              </p>
            </section>

            {/* Arena */}
            <section>
              <h2 className="font-display font-bold text-foreground text-xl">Arenayta</h2>
              <p>
                Standardarenan är <strong>30 × 30 meter</strong>. Banan designas så att hunden kan flöda genom hindren utan tvära kast. Minimiavstånd mellan hinder är 5 meter för att ge hunden tid att fokusera och rikta om.
              </p>
            </section>

            {/* CTA */}
            <div className="not-prose pt-6 border-t border-border">
              <h2 className="font-display font-bold text-foreground text-lg mb-3">Börja spåra dina hoopers-resultat</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Med AgilityManager kan du logga träningspass, följa poängutvecklingen och planera banor – allt anpassat för SHoK:s regelverk.
              </p>
              <Button onClick={() => navigate('/auth')} className="bg-primary text-primary-foreground font-semibold">
                Kom igång gratis <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </article>

      <LandingFooter />
    </div>
  );
}
