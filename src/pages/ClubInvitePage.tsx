import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Users, MapPin, UserPlus, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

interface ClubInfo {
  id: string;
  name: string;
  description: string;
  city: string;
}

export default function ClubInvitePage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .from('clubs')
      .select('id, name, description, city')
      .eq('invite_code', code)
      .single()
      .then(({ data }) => {
        setClub(data);
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!user || !club) return;
    setJoining(true);
    const { error } = await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: user.id,
      status: 'accepted',
    });
    if (error?.code === '23505') {
      toast.info('Du är redan med i denna klubb');
      navigate('/app/clubs');
      return;
    }
    if (error) {
      toast.error('Kunde inte gå med');
      setJoining(false);
      return;
    }
    toast.success(`Välkommen till ${club.name}!`);
    navigate('/app/clubs');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-display">Laddar...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold font-display text-foreground">Ogiltig inbjudningslänk</h1>
          <p className="text-sm text-muted-foreground">Denna klubblänk är inte giltig eller har upphört att gälla.</p>
          <Button onClick={() => navigate('/')}>Till startsidan</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gå med i {club.name} – AgilityManager</title>
        <meta name="description" content={`Bli medlem i ${club.name} på AgilityManager. ${club.description}`} />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users size={28} className="text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-display text-foreground">{club.name}</h1>
            {club.city && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <MapPin size={14} /> {club.city}
              </p>
            )}
            {club.description && (
              <p className="text-sm text-muted-foreground mt-2">{club.description}</p>
            )}
          </div>

          <p className="text-muted-foreground text-sm">
            Du har blivit inbjuden att gå med i denna agilityklubb på AgilityManager!
          </p>

          {user ? (
            <Button
              className="w-full gap-2"
              onClick={handleJoin}
              disabled={joining}
            >
              <UserPlus size={18} />
              {joining ? 'Går med...' : 'Gå med i klubben'}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => navigate(`/auth?redirect=/club-invite/${code}`)}
              >
                <UserPlus size={18} />
                Skapa konto & gå med
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/auth?redirect=/club-invite/${code}`)}
              >
                <LogIn size={18} />
                Logga in & gå med
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
