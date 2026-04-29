import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, BarChart3, Filter, Users, CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface GuestSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Anpassad rubrik beroende på trigger (anmäld-knapp, exit-intent etc.) */
  title?: string;
  description?: string;
  /** Antal sparade markeringar — visas som social proof */
  markedCount?: number;
}

/**
 * Soft/hard wall-modal som öppnas när gäst försöker göra något som kräver konto
 * (Anmäld-knapp) eller via exit-intent. Skickar tillbaka via ?redirect=.
 */
export function GuestSignupModal({
  open,
  onOpenChange,
  title = 'Skapa konto för att slutföra',
  description = 'Anmälningar sparas på ditt konto så du kommer åt dem från alla enheter och får påminnelse innan tävlingen.',
  markedCount = 0,
}: GuestSignupModalProps) {
  const location = useLocation();
  const redirectTo = encodeURIComponent(location.pathname + location.search);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-forest">{title}</DialogTitle>
          <DialogDescription className="text-forest/70">{description}</DialogDescription>
        </DialogHeader>

        {markedCount > 0 && (
          <div className="rounded-xl bg-moss/10 p-3 text-sm text-moss-deep">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Vi sparar dina {markedCount} markering{markedCount === 1 ? '' : 'ar'}
            </div>
            <p className="mt-1 text-forest/70">
              De kopplas automatiskt till ditt konto när du loggar in.
            </p>
          </div>
        )}

        <ul className="space-y-2 py-2">
          <Perk icon={<Bell size={16} />} text="Påminnelse 7 dagar innan tävling" />
          <Perk icon={<BarChart3 size={16} />} text="Resultathistorik och statistik" />
          <Perk icon={<Filter size={16} />} text="Tävlingar filtrerade för din hund" />
          <Perk icon={<Users size={16} />} text="Se vilka kompisar som anmält sig" />
        </ul>

        <div className="flex flex-col gap-2">
          <Button asChild variant="brand" size="lg" className="w-full">
            <Link to={`/auth?mode=signup&source=competitions&redirect=${redirectTo}`}>
              Skapa gratis konto
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to={`/auth?source=competitions&redirect=${redirectTo}`}>
              Jag har redan konto — logga in
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-forest/50">
          Gratis. Inga kortuppgifter krävs.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Perk({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-forest/80">
      <span className="text-moss-deep">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
