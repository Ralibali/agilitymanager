import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { useAuth, PLANS } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, LogOut, ExternalLink, Check, Loader2, Settings, Moon, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';

const premiumFeatures = [
  { title: 'Avancerad statistik', desc: 'Diagram, trender och felanalys' },
  { title: 'Banplanerare', desc: 'Rita och spara egna träningsbanor' },
  { title: 'Videoanteckningar', desc: 'Tidsstämplade anteckningar i träningsvideo' },
  { title: 'Export', desc: 'Exportera dagbok som PDF och resultat som CSV' },
  { title: 'Tävlingskalender', desc: 'Planera tävlingar med påminnelser' },
];

export default function SettingsPage() {
  const { user, signOut, subscription, checkSubscription } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();

  // Handle checkout return
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('Betalning genomförd! Premium aktiveras inom kort.');
      checkSubscription();
    } else if (checkout === 'cancel') {
      toast.info('Betalningen avbröts.');
    }
  }, [searchParams, checkSubscription]);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Kunde inte starta betalning');
      console.error(err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Kunde inte öppna prenumerationshantering');
      console.error(err);
    } finally {
      setPortalLoading(false);
    }
  };

  const activePlan = subscription.subscribed
    ? Object.values(PLANS).find(p => p.priceId === subscription.priceId)
    : null;

  return (
    <PageContainer title="Inställningar">
      {/* User info */}
      <div className="bg-card rounded-xl p-4 shadow-card mb-4">
        <h3 className="font-display font-semibold text-foreground mb-1">Konto</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={signOut}>
          <LogOut size={14} /> Logga ut
        </Button>
      </div>

      {/* Premium section */}
      <div className="bg-card rounded-xl p-5 shadow-elevated mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 gradient-accent opacity-10 rounded-full -translate-y-10 translate-x-10" />
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center">
            <Crown size={20} className="text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground">Premium</h2>
            {subscription.subscribed ? (
              <div className="flex items-center gap-1.5">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Aktiv</Badge>
                {activePlan && <span className="text-xs text-muted-foreground">{activePlan.label}</span>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Lås upp alla funktioner</p>
            )}
          </div>
        </div>

        {subscription.subscribed && subscription.subscriptionEnd && (
          <p className="text-xs text-muted-foreground mb-3">
            Förnyas: {new Date(subscription.subscriptionEnd).toLocaleDateString('sv-SE')}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {premiumFeatures.map(f => (
            <div key={f.title} className="flex items-start gap-2">
              {subscription.subscribed ? (
                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Sparkles size={14} className="text-accent mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="text-sm font-medium text-foreground">{f.title}</span>
                <span className="text-xs text-muted-foreground ml-1">– {f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {subscription.subscribed ? (
          <Button variant="outline" className="w-full gap-2" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
            Hantera prenumeration
          </Button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleCheckout(PLANS.monthly.priceId)}
              disabled={!!checkoutLoading}
              className="flex-1 py-2.5 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {checkoutLoading === PLANS.monthly.priceId ? <Loader2 size={14} className="animate-spin" /> : null}
              19 kr/mån
            </button>
            <button
              onClick={() => handleCheckout(PLANS.yearly.priceId)}
              disabled={!!checkoutLoading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 relative"
            >
              {checkoutLoading === PLANS.yearly.priceId ? <Loader2 size={14} className="animate-spin" /> : null}
              99 kr/år
              <span className="absolute -top-2 -right-1 text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold">
                Spara 57%
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Links */}
      <div className="space-y-3">
        <a
          href="https://agilityklubben.se/regler/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between"
        >
          <div>
            <h3 className="font-display font-semibold text-foreground mb-0.5">SAgiK Regelbok</h3>
            <p className="text-xs text-muted-foreground">Gällande regler 2022–2026</p>
          </div>
          <ExternalLink size={16} className="text-muted-foreground" />
        </a>

        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-1">Om appen</h3>
          <p className="text-sm text-muted-foreground">
            AgilityManager – Din digitala agility-dagbok. Version 1.0.0
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-1">Data</h3>
          <p className="text-sm text-muted-foreground">
            All data lagras säkert i molnet och synkas automatiskt mellan dina enheter.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
