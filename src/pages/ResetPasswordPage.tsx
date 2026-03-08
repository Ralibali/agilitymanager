import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Fel', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lösenord uppdaterat!' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-bold font-display text-foreground text-center">Nytt lösenord</h1>
        <div>
          <Label>Nytt lösenord</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minst 6 tecken" />
        </div>
        <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
          {loading ? 'Sparar...' : 'Spara nytt lösenord'}
        </Button>
      </form>
    </div>
  );
}
