import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

type Shortcut = { keys: string[]; label: string };
type Section = { title: string; items: Shortcut[] };

const SECTIONS: Section[] = [
  {
    title: 'Redigering',
    items: [
      { keys: ['Ctrl', 'Z'], label: 'Ångra senaste ändring' },
      { keys: ['Ctrl', 'Shift', 'Z'], label: 'Gör om (redo)' },
      { keys: ['Ctrl', 'Y'], label: 'Gör om (redo)' },
      { keys: ['Ctrl', 'C'], label: 'Kopiera markerat hinder' },
      { keys: ['Ctrl', 'V'], label: 'Klistra in hinder' },
      { keys: ['Ctrl', 'D'], label: 'Duplicera markerat hinder' },
      { keys: ['Delete'], label: 'Ta bort markerat hinder' },
      { keys: ['R'], label: 'Rotera markerat hinder 15°' },
      { keys: ['Shift', 'R'], label: 'Rotera markerat hinder -15°' },
    ],
  },
  {
    title: 'Markering & Navigering',
    items: [
      { keys: ['Esc'], label: 'Avmarkera / avsluta läge' },
      { keys: ['Ctrl', '0'], label: 'Anpassa till skärmen' },
      { keys: ['Ctrl', '+'], label: 'Zooma in' },
      { keys: ['Ctrl', '-'], label: 'Zooma ut' },
      { keys: ['Mellanslag', '+', 'drag'], label: 'Panorera banan' },
      { keys: ['Piltangent'], label: 'Flytta markerat hinder 0,5 m' },
      { keys: ['Shift', 'Piltangent'], label: 'Flytta markerat hinder 2 m' },
    ],
  },
  {
    title: 'Verktyg',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Öppna kommandopalett (snabbsök)' },
      { keys: ['?'], label: 'Visa denna hjälp' },
      { keys: ['Ctrl', 'S'], label: 'Spara bana' },
      { keys: ['Ctrl', 'P'], label: 'Exportera som PDF' },
      { keys: ['N'], label: 'Starta numreringsläge' },
      { keys: ['P'], label: 'Rita förarens väg' },
      { keys: ['M'], label: 'Mätverktyg' },
      { keys: ['G'], label: 'Visa/dölj rutnät' },
    ],
  },
];

function KeyPill({ label }: { label: string }) {
  const isArrow = label === 'Piltangent' || label === 'drag';
  return (
    <kbd
      className={[
        'inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md',
        'bg-muted border border-border text-xs font-mono font-semibold shadow-sm',
        isArrow ? 'italic font-sans font-normal text-muted-foreground' : '',
      ].join(' ')}
    >
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Kortkommandon
          </DialogTitle>
          <DialogDescription>
            Snabbare banbyggnad med tangentbordet. Tryck <KeyPill label="?" /> när som helst för att öppna hjälpen.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{item.label}</span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map((k, j) => (
                        <span key={j} className="flex items-center gap-1">
                          <KeyPill label={k} />
                          {j < item.keys.length - 1 && <span className="text-muted-foreground">+</span>}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
          💡 Tips: Kombinera <KeyPill label="Ctrl" /> + <KeyPill label="K" /> för att snabbsöka alla kommandon utan att lyfta händerna från tangentbordet.
        </p>
      </DialogContent>
    </Dialog>
  );
}
