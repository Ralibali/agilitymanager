import { ExternalLink, Info } from 'lucide-react';

interface Props {
  sourceUrl?: string;
}

export function AgilityDataAttribution({ sourceUrl }: Props) {
  return (
    <div className="mt-6 bg-muted/50 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-2">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="font-medium text-foreground text-sm">Hur fungerar detta?</p>
      </div>
      <p>
        AgilityManager hämtar automatiskt tävlingsdata och resultat direkt från agilitydata.se i realtid
        när du öppnar denna sida. Informationen visas live och lagras aldrig av AgilityManager.
      </p>
      <p>
        All data tillhör Svenska Agilityklubben (SAgiK) och Agility Informations Data AB (AGIDA).
        AgilityManager har inget samarbete med eller är godkänd av SAgiK.
      </p>
      <a
        href={sourceUrl || 'https://agilitydata.se'}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
      >
        🔗 Se originaldatan på agilitydata.se <ExternalLink size={12} />
      </a>
    </div>
  );
}
