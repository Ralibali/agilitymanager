import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Dumbbell, Trophy, Timer, Heart, Map, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Dumbbell, title: 'Träningsdagbok', desc: 'Logga pass, energi och framsteg' },
  { icon: Trophy, title: 'Tävlingsresultat', desc: 'Spåra resultat och godkännandegrad' },
  { icon: Timer, title: 'Tidtagarur', desc: 'Mät tider med fel- och vägringsregistrering' },
  { icon: Heart, title: 'Hälsologg', desc: 'Veterinärbesök, vaccinationer och vikt' },
  { icon: Map, title: 'Banplanerare', desc: 'Rita och spara agilitybanor' },
  { icon: BarChart3, title: 'Statistik', desc: 'Visualisera din utveckling över tid' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="relative max-w-lg mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-elevated">
              <Sparkles size={36} className="text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold font-display text-foreground mb-3 tracking-tight">
              AgilityManager
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-sm mx-auto">
              Din digitala agility-dagbok. Träna smartare, tävla bättre.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground font-semibold shadow-elevated gap-2"
                onClick={() => navigate('/auth')}
              >
                Kom igång gratis <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20 max-w-lg mx-auto">
        <h2 className="font-display font-bold text-foreground text-xl text-center mb-8">
          Allt du behöver för agility
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 text-center">
        <div className="bg-card rounded-2xl p-8 max-w-lg mx-auto shadow-card">
          <h2 className="font-display font-bold text-foreground text-lg mb-2">
            Redo att börja?
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            Skapa ett gratis konto och börja logga din träning idag.
          </p>
          <Button
            size="lg"
            className="gradient-primary text-primary-foreground font-semibold gap-2"
            onClick={() => navigate('/auth')}
          >
            Skapa konto <ArrowRight size={18} />
          </Button>
        </div>
      </section>
    </div>
  );
}
