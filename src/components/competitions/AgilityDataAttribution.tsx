import { Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  sourceUrl?: string;
  sport?: 'agility' | 'hoopers';
}

/**
 * Tydlig, alltid synlig datakälla & ansvarsfriskrivning för publika tävlingssidor.
 * Lugn 'Varm Sand'-stil men omöjlig att missa.
 */
export function AgilityDataAttribution({ sourceUrl, sport = 'agility' }: Props) {
  const isHoopers = sport === 'hoopers';
  return (
    <aside
      className="mt-8 rounded-2xl border border-border-subtle bg-surface px-4 py-4 sm:px-5"
      aria-label="Datakälla och ansvarsfriskrivning"
    >
      <div className="flex gap-3">
        <Info className="h-5 w-5 flex-shrink-0 text-primary mt-0.5" aria-hidden="true" />
        <div className="text-sm text-text-secondary leading-relaxed space-y-2">
          <p>
            <strong className="text-text-primary">Datakälla:</strong>{' '}
            {isHoopers ? (
              <>
                Information hämtas automatiskt från{' '}
                <a
                  href={sourceUrl || 'https://shok.se'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  SHoK <ExternalLink className="h-3 w-3" />
                </a>
                . Data kan vara försenad eller felaktig.
              </>
            ) : (
              <>
                Information hämtas automatiskt från{' '}
                <a
                  href={sourceUrl || 'https://agilitydata.se'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  agilitydata.se <ExternalLink className="h-3 w-3" />
                </a>{' '}
                (SAgiK/AGIDA). Data kan vara försenad eller felaktig.
              </>
            )}
          </p>
          <p>
            AgilityManager har inget samarbete med, och är inte godkänd av,{' '}
            {isHoopers ? 'SHoK' : 'SAgiK eller AGIDA'}. Verifiera alltid information direkt hos arrangören innan anmälan.{' '}
            <Link to="/disclaimer" className="text-primary underline-offset-2 hover:underline">
              Läs fullständig ansvarsfriskrivning
            </Link>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}
