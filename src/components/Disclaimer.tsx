import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Variant = 'health' | 'ai' | 'competition' | 'breed' | 'editorial' | 'general';

const TEXT: Record<Variant, string> = {
  health:
    'Hälsoinformation och påminnelser i AgilityManager är endast vägledande och ersätter aldrig veterinärmedicinsk rådgivning. Konsultera alltid legitimerad veterinär vid hälsofrågor.',
  ai: 'AI-genererat innehåll kan vara felaktigt eller ofullständigt. Behandla utdata som förslag och verifiera alltid med kvalificerad tränare eller veterinär innan du agerar.',
  competition:
    'Tävlingsdata hämtas från publika källor (bl.a. Agilitydata.se och SHoK) och kan vara försenad eller felaktig. Verifiera alltid information direkt hos arrangören före anmälan.',
  breed:
    'Rasprofiler är generaliserade och baseras på publika källor och rasstandard. Individuella hundar varierar – kontakta alltid seriös uppfödare och rasklubb innan val av hund.',
  editorial:
    'Innehållet är endast avsett för informations- och underhållningssyfte och utgör inte professionell rådgivning. Rådfråga alltid kvalificerad fackman vid behov.',
  general:
    'Innehåll i AgilityManager är endast vägledande och utgör inte professionell rådgivning.',
};

interface DisclaimerProps {
  variant?: Variant;
  className?: string;
  /** Visa länk till fullständig ansvarsfriskrivning. Default: true. */
  showLink?: boolean;
}

/**
 * Diskret, återanvändbar disclaimer-ruta.
 * Använd på sidor där missförstånd kan leda till skada (hälsa, AI-coach, tävling, raser, blogg).
 */
export function Disclaimer({
  variant = 'general',
  className,
  showLink = true,
}: DisclaimerProps) {
  return (
    <aside
      role="note"
      aria-label="Ansvarsfriskrivning"
      className={cn(
        'flex gap-3 rounded-lg border border-border/60 bg-muted/40 px-4 py-3',
        'text-xs leading-relaxed text-muted-foreground',
        className,
      )}
    >
      <Info size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground/80" aria-hidden />
      <p>
        {TEXT[variant]}{' '}
        {showLink && (
          <Link
            to="/ansvarsfriskrivning"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Läs fullständig ansvarsfriskrivning
          </Link>
        )}
        .
      </p>
    </aside>
  );
}
