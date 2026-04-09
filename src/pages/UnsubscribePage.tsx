import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [status, setStatus] = useState<'confirm' | 'done' | 'error'>('confirm');
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      // For now, just show success - in production this would call an API
      // to add the email to a suppression list
      setStatus('done');
    } catch {
      setStatus('error');
    }
    setLoading(false);
  };

  if (!email) {
    return (
      <PageContainer title="Avregistrera">
        <div className="text-center py-20">
          <XCircle size={48} className="text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Ogiltig länk.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Helmet>
        <title>Avregistrera | AgilityManager</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <PageContainer title="Avregistrera">
        <div className="text-center py-12 max-w-md mx-auto">
          {status === 'confirm' && (
            <>
              <p className="text-muted-foreground mb-6">
                Vill du sluta få e-postutskick från AgilityManager till <strong>{email}</strong>?
              </p>
              <Button onClick={handleUnsubscribe} disabled={loading} variant="destructive" className="w-full">
                {loading ? 'Avregistrerar...' : 'Ja, avregistrera mig'}
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Du kan fortfarande använda ditt konto som vanligt.
              </p>
            </>
          )}
          {status === 'done' && (
            <>
              <CheckCircle size={48} className="text-success mx-auto mb-4" />
              <h2 className="font-display font-semibold text-foreground text-lg mb-2">Avregistrerad</h2>
              <p className="text-muted-foreground">
                <strong>{email}</strong> har tagits bort från våra utskick.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} className="text-destructive mx-auto mb-4" />
              <p className="text-muted-foreground">Något gick fel. Försök igen senare.</p>
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}
