import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviterName, setInviterName] = useState<string | null>(null);
  const [inviterUserId, setInviterUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    supabase
      .from('profiles')
      .select('user_id, display_name')
      .eq('referral_code', code)
      .single()
      .then(({ data }) => {
        if (data) {
          setInviterName(data.display_name);
          setInviterUserId(data.user_id);
        }
        setLoading(false);
      });
  }, [code]);

  // If logged in, auto-send friend request
  useEffect(() => {
    if (!user?.id || !inviterUserId || user.id === inviterUserId) return;
    (async () => {
      const { error } = await supabase.from('friendships').insert({
        requester_id: inviterUserId,
        receiver_id: user.id,
        status: 'pending',
      });
      if (!error) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          message: `${inviterName || 'Någon'} vill bli kompisar på AgilityManager!`,
        });
        toast.success(`Vänskapsförfrågan från ${inviterName || 'din kompis'} har lagts till!`);
      }
      navigate('/friends');
    })();
  }, [user?.id, inviterUserId, inviterName, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-display">Laddar...</div>
      </div>
    );
  }

  if (!inviterName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold font-display text-foreground">Ogiltig inbjudningslänk</h1>
          <Button onClick={() => navigate('/')}>Till startsidan</Button>
        </div>
      </div>
    );
  }

  // Not logged in — show registration prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            {inviterName} vill bli kompisar på AgilityManager!
          </h1>
          <p className="text-muted-foreground">
            Skapa ett konto gratis och få 7 extra dagars premium! 🐾
          </p>
          <div className="space-y-3">
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => navigate(`/auth?ref=${code}`)}
            >
              <UserPlus size={18} className="mr-2" />
              Skapa konto gratis
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/auth?ref=${code}`)}>
              Logga in
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
