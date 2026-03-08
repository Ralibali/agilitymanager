import { PageContainer } from '@/components/PageContainer';
import { Lock, Sparkles, Crown } from 'lucide-react';

const premiumFeatures = [
  { title: 'AI-coach Axel', desc: 'Personliga träningstips baserat på dina loggar' },
  { title: 'Avancerad statistik', desc: 'Diagram, trender och felanalys' },
  { title: 'Banplanerare', desc: 'Rita och spara egna träningsbanor' },
  { title: 'Videoanteckningar', desc: 'Tidsstämplade anteckningar i träningsvideo' },
  { title: 'Export', desc: 'Exportera dagbok som PDF och resultat som CSV' },
  { title: 'Tävlingskalender', desc: 'Planera tävlingar med påminnelser' },
];

export default function SettingsPage() {
  return (
    <PageContainer title="Inställningar">
      {/* Premium CTA */}
      <div className="bg-card rounded-xl p-5 shadow-elevated mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 gradient-accent opacity-10 rounded-full -translate-y-10 translate-x-10" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
            <Crown size={20} className="text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground">Premium</h2>
            <p className="text-xs text-muted-foreground">Lås upp alla funktioner</p>
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {premiumFeatures.map(f => (
            <div key={f.title} className="flex items-start gap-2">
              <Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                <span className="text-xs text-muted-foreground ml-1">– {f.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm">
            49 kr/mån
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm">
            349 kr/år
          </button>
        </div>
      </div>

      {/* App info */}
      <div className="space-y-3">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-1">Om appen</h3>
          <p className="text-sm text-muted-foreground">
            AgilityManager – Din digitala agility-dagbok.
            Version 1.0.0
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-1">Data</h3>
          <p className="text-sm text-muted-foreground">
            All data lagras lokalt på din enhet. Koppla till Lovable Cloud för molnlagring och synk.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
