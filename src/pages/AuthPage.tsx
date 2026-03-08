import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast({ title: 'Fel', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Kolla din e-post', description: 'En återställningslänk har skickats.' });
        setResetMode(false);
      }
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Inloggningsfel', description: error.message, variant: 'destructive' });
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: 'Registreringsfel', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Konto skapat!', description: 'Kolla din e-post för att verifiera kontot.' });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">AgilityManager</h1>
          <p className="text-sm text-muted-foreground mt-1">Din digitala agility-dagbok</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {resetMode ? (
            <>
              <div>
                <Label>E-post</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? 'Skickar...' : 'Skicka återställningslänk'}
              </Button>
              <button type="button" onClick={() => setResetMode(false)} className="text-sm text-primary w-full text-center">
                Tillbaka till inloggning
              </button>
            </>
          ) : (
            <>
              {!isLogin && (
                <div>
                  <Label>Namn</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ditt namn" />
                </div>
              )}
              <div>
                <Label>E-post</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" />
              </div>
              <div>
                <Label>Lösenord</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minst 6 tecken" />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                {loading ? 'Vänta...' : isLogin ? 'Logga in' : 'Skapa konto'}
              </Button>
              {isLogin && (
                <button type="button" onClick={() => setResetMode(true)} className="text-xs text-muted-foreground w-full text-center">
                  Glömt lösenord?
                </button>
              )}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary w-full text-center">
                {isLogin ? 'Har du inget konto? Skapa ett' : 'Har du redan konto? Logga in'}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}
