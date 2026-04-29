import { useAuth, PLANS } from '@/contexts/AuthContext';
import { Crown, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ReactNode, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PremiumGateProps {
  children: ReactNode;
  /** If true, blocks the entire content. If false, just shows inline lock. */
  fullPage?: boolean;
  featureName?: string;
}

export function PremiumGate({ children, fullPage = false, featureName = 'Denna funktion' }: PremiumGateProps) {
  const { subscription, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  if (subscription.subscribed) {
    return <>{children}</>;
  }

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { priceId } });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      toast({
        title: 'Kunde inte starta checkout',
        description: err instanceof Error ? err.message : 'Försök igen',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  if (fullPage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-elevated">
          <Crown size={28} className="text-accent-foreground" />
        </div>
        <h2 className="font-display font-bold text-foreground text-xl mb-2">Pro krävs</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          {featureName} ingår i Pro. Uppgradera för att låsa upp alla funktioner.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-3">
          {/* Månadsvis */}
          <button
            onClick={() => handleCheckout(PLANS.monthly.priceId)}
            disabled={!!loading}
            className="relative flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-elevated disabled:opacity-50"
          >
            <span className="text-xs font-medium text-muted-foreground mb-1">{PLANS.monthly.label}</span>
            <span className="font-display font-bold text-foreground text-lg leading-none">
              {PLANS.monthly.amount} kr
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">per månad</span>
            {loading === PLANS.monthly.priceId && (
              <Loader2 size={14} className="absolute top-2 right-2 animate-spin text-primary" />
            )}
          </button>

          {/* Årsvis */}
          <button
            onClick={() => handleCheckout(PLANS.yearly.priceId)}
            disabled={!!loading}
            className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-primary bg-primary/5 p-4 text-left transition-all hover:shadow-elevated disabled:opacity-50"
          >
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
              {PLANS.yearly.savingsLabel}
            </span>
            <span className="text-xs font-medium text-muted-foreground mb-1">{PLANS.yearly.label}</span>
            <span className="font-display font-bold text-foreground text-lg leading-none">
              {PLANS.yearly.amount} kr
            </span>
            <span className="text-[11px] text-muted-foreground mt-0.5">{PLANS.yearly.monthlyEquivalent}</span>
            {loading === PLANS.yearly.priceId && (
              <Loader2 size={14} className="absolute top-2 right-2 animate-spin text-primary" />
            )}
          </button>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Se alla detaljer
        </button>
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
