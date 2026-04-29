import { Sparkles, Bell, BarChart3, Filter, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const DISMISS_KEY = 'am.guest.conversion_banner.dismissed';

interface GuestConversionBannerProps {
  /** Antal markeringar gästen redan gjort — höjer trycket i texten */
  markedCount?: number;
}

/**
 * Permanent (men dismissible) banner i toppen av tävlingskalendrar för gäster.
 * Lyfter fram fyra konkreta värden för att skapa konto.
 */
export function GuestConversionBanner({ markedCount = 0 }: GuestConversionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (dismissed) return null;

  const redirectTo = encodeURIComponent(location.pathname + location.search);
  const headline = markedCount > 0
    ? `Du har ${markedCount} markering${markedCount === 1 ? '' : 'ar'} — spara dem genom att skapa konto`
    : 'Skapa konto — gratis';

  return (
    <div className="relative mb-6 rounded-2xl bg-white p-5 ring-1 ring-bone-deep">
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="absolute right-3 top-3 rounded-md p-1 text-forest/50 transition hover:bg-bone hover:text-forest"
        aria-label="Stäng"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss/10 text-moss-deep">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg leading-snug text-forest">
            {headline}
          </h3>
          <p className="mt-1 text-sm text-forest/70">
            Allt här är gratis. Konto behövs bara för att spara mellan enheter och slutföra anmälningar.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        <ValueProp icon={<Bell size={16} />} text="Synk mellan enheter + påminnelse 7 dagar innan" />
        <ValueProp icon={<BarChart3 size={16} />} text="Resultathistorik och statistik" />
        <ValueProp icon={<Filter size={16} />} text="Visa bara tävlingar för din hunds storlek/klass" />
        <ValueProp icon={<Users size={16} />} text="Se vilka kompisar som anmält sig" />
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant="brand" size="sm">
          <Link to={`/auth?mode=signup&source=competitions&redirect=${redirectTo}`}>
            Skapa gratis konto
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/auth?source=competitions&redirect=${redirectTo}`}>
            Logga in
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ValueProp({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-forest/80">
      <span className="mt-0.5 text-moss-deep">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
