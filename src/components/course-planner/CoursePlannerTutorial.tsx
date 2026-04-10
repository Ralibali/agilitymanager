import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  MousePointer2, Move, RotateCcw, Copy, Pencil, Hash, Ruler,
  ZoomIn, Save, Undo2, Grid3X3, Users, Sparkles, ChevronRight, ChevronLeft, X,
} from 'lucide-react';

const STEPS = [
  {
    title: 'Välkommen till Banplaneraren! 🏅',
    desc: 'Här kan du rita, planera och spara agilitybanor med alla SAgiK-godkända hinder. Swipa igenom för att lära dig grunderna.',
    icon: Sparkles,
    tips: [],
  },
  {
    title: 'Placera hinder',
    desc: 'Tryck på ett hinder i verktygsfältet för att placera det på banan. Dra det sedan till rätt position.',
    icon: MousePointer2,
    tips: [
      'Hinder snappar automatiskt till rutnätet (0,5m)',
      'Hinder magnetiseras mot varandra när de är nära',
      'Hovra över ett hinder i verktygsfältet för att se mått och info',
    ],
  },
  {
    title: 'Flytta & rotera',
    desc: 'Tryck på ett hinder på banan för att markera det. Dra för att flytta, använd rotationsknappen för att rotera 15°.',
    icon: Move,
    tips: [
      'Rotera: välj hinder → tryck rotationsknappen',
      'På mobil: tvåfingerrotation fungerar också',
      'Radera: välj hinder → tryck papperskorgen',
    ],
  },
  {
    title: 'Numrera banan',
    desc: 'Tryck # för att aktivera numreringsläget. Klicka sedan på hinder i ordning — de numreras automatiskt.',
    icon: Hash,
    tips: [
      'Olika färger = olika banor (t.ex. grön + blå för agility + hopp)',
      'Numren kan dras fritt runt hindret',
      'Ångra senaste numreringen med ↩-knappen',
    ],
  },
  {
    title: 'Rita förarlinje',
    desc: 'Tryck pennan ✏️ för att rita din förarlinje direkt på banan.',
    icon: Pencil,
    tips: [
      'Rita genom att dra fingret/musen',
      'Radera linjen med suddgummi-knappen',
      'Linjen sparas tillsammans med banan',
    ],
  },
  {
    title: 'Mät avstånd',
    desc: 'Aktivera mätverktyget 📏 och klicka två punkter för att mäta avståndet i meter.',
    icon: Ruler,
    tips: [
      'Banlängden beräknas automatiskt och visas i toolbar',
      'Varning visas om hinder står för nära varandra',
      'Minst 5m krävs mellan vissa hinder enligt regelverket',
    ],
  },
  {
    title: 'Gruppera & kopiera',
    desc: 'Markera flera hinder samtidigt för att flytta eller rotera dem som en grupp.',
    icon: Users,
    tips: [
      'Desktop: Shift+klick för att markera flera',
      'Mobil: långtryck aktiverar multiselect',
      'Ctrl+C / Ctrl+V kopierar markerat hinder',
    ],
  },
  {
    title: 'Ångra, zooma & spara',
    desc: 'Du har full kontroll med ångra/gör om, zoom och autospar-påminnelse.',
    icon: Undo2,
    tips: [
      'Ctrl+Z = ångra, Ctrl+Y = gör om (30 steg)',
      'Zooma med scrollhjul eller knapparna',
      'Minimap i hörnet hjälper dig navigera',
      'Osparade ändringar visas med ● i toolbar',
    ],
  },
  {
    title: 'Mallar & sparning',
    desc: 'Ladda färdiga mallar som startpunkt eller spara dina egna banor för framtiden.',
    icon: Save,
    tips: [
      '5 färdiga mallar: Nybörjar-, Kontakt-, Klass 1/3-bana, Slalomträning',
      'Spara obegränsat med Pro',
      'Exportera som bild med nedladdningsknappen',
      'Dela banor med vänner direkt i appen',
    ],
  },
];

const STORAGE_KEY = 'course-planner-tutorial-seen';

interface TutorialProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function CoursePlannerTutorial({ forceOpen, onClose }: TutorialProps) {
  const [open, setOpen] = useState(() => {
    if (forceOpen) return true;
    try { return localStorage.getItem(STORAGE_KEY) !== 'true'; } catch { return true; }
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) { setOpen(true); setStep(0); }
  }, [forceOpen]);

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose?.();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl gap-0">
        {/* Header */}
        <div className="bg-primary/5 px-6 pt-6 pb-4 text-center relative">
          <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Icon size={28} className="text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground text-lg">{current.title}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{current.desc}</p>
        </div>

        {/* Tips */}
        {current.tips.length > 0 && (
          <div className="px-6 py-4 space-y-2">
            {current.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setStep(s => s - 1)} className="gap-1 text-xs">
                <ChevronLeft size={14} /> Bakåt
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleClose} className="gap-1 text-xs bg-primary text-primary-foreground">
                Sätt igång! 🚀
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1 text-xs bg-primary text-primary-foreground">
                Nästa <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TutorialButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
      title="Visa guide"
    >
      <Sparkles size={14} />
    </button>
  );
}
