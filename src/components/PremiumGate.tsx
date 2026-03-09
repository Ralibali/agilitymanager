import { useAuth } from '@/contexts/AuthContext';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface PremiumGateProps {
  children: ReactNode;
  /** If true, blocks the entire content. If false, just shows inline lock. */
  fullPage?: boolean;
  featureName?: string;
}

export function PremiumGate({ children, fullPage = false, featureName = 'Denna funktion' }: PremiumGateProps) {
  const { subscription } = useAuth();
  const navigate = useNavigate();

  if (subscription.subscribed) {
    return <>{children}</>;
  }

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-elevated">
          <Crown size={28} className="text-accent-foreground" />
        </div>
        <h2 className="font-display font-bold text-foreground text-xl mb-2">Premium krävs</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {featureName} ingår i Premium. Uppgradera för att låsa upp alla funktioner.
        </p>
        <div className="flex gap-3">
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => navigate('/settings')}>
            <Crown size={16} /> Se prisplaner
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
      <Lock size={8} /> PRO
    </span>
  );
}

export function usePremium() {
  const { subscription } = useAuth();
  return subscription.subscribed;
}
