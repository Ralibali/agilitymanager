import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, UserPlus, QrCode, Share2, Check, X, Users, Loader2, Copy, ScanLine, Eye, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import type { Friendship, FriendProfile } from '@/types/friends';
import QrScannerDialog from '@/components/friends/QrScannerDialog';
import SharedCoursesInbox from '@/components/friends/SharedCoursesInbox';
import ChatList from '@/components/friends/ChatList';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<(Friendship & { profile: FriendProfile })[]>([]);
  const [pendingRequests, setPendingRequests] = useState<(Friendship & { profile: FriendProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<FriendProfile | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Load friends and pending requests
  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!friendships) { setLoading(false); return; }

    const otherIds = friendships.map(f =>
      f.requester_id === user.id ? f.receiver_id : f.requester_id
    );

    let profiles: FriendProfile[] = [];
    if (otherIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, referral_code')
        .in('user_id', otherIds);
      profiles = (data || []) as FriendProfile[];
    }

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));

    const accepted: (Friendship & { profile: FriendProfile })[] = [];
    const pending: (Friendship & { profile: FriendProfile })[] = [];

    for (const f of friendships) {
      const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id;
      const profile = profileMap.get(otherId) || { user_id: otherId, display_name: null, avatar_url: null, referral_code: null };
      const entry = { ...f, profile } as Friendship & { profile: FriendProfile };
      if (f.status === 'accepted') accepted.push(entry);
      else if (f.status === 'pending') pending.push(entry);
    }

    setFriends(accepted);
    setPendingRequests(pending);
    setLoading(false);
  }, [user?.id]);

  // Load my profile for QR/referral
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, referral_code')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setMyProfile(data as FriendProfile);
      });
  }, [user?.id]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Realtime subscription for friendships
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('friendships-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        loadFriends();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadFriends]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, referral_code')
        .or(`display_name.ilike.%${searchQuery}%`)
        .neq('user_id', user?.id || '')
        .limit(10);
      setSearchResults((data || []) as FriendProfile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user?.id]);

  const sendRequest = async (receiverId: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
    });
    if (error) {
      if (error.code === '23505') toast.info('Förfrågan redan skickad!');
      else toast.error('Kunde inte skicka förfrågan');
    } else {
      toast.success('Vänskapsförfrågan skickad!');
      // Create notification
      await supabase.from('notifications').insert({
        user_id: receiverId,
        message: `${myProfile?.display_name || 'Någon'} vill bli kompisar på AgilityManager!`,
      });
      loadFriends();
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    toast.success('Vän accepterad!');
    loadFriends();
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    toast.info('Förfrågan nekad');
    loadFriends();
  };

  const shareInviteLink = async () => {
    if (!myProfile?.referral_code) return;
    const url = `${window.location.origin}/invite/${myProfile.referral_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gå med i AgilityManager!',
          text: `${myProfile.display_name || 'Jag'} vill bli kompisar på AgilityManager — skapa ett konto gratis och få 7 extra dagars premium! 🐾`,
          url,
        });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Inbjudningslänk kopierad!');
    }
  };

  const incomingRequests = pendingRequests.filter(r => r.receiver_id === user?.id);
  const outgoingRequests = pendingRequests.filter(r => r.requester_id === user?.id);

  const isAlreadyFriend = (userId: string) =>
    friends.some(f => f.profile.user_id === userId) ||
    pendingRequests.some(f => f.profile.user_id === userId);

  return (
    <PageContainer>
      <Helmet><title>Kompisar — AgilityManager</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display text-foreground">Kompisar</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowQr(true)} title="Visa QR-kod">
              <QrCode size={18} />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowScanner(true)} title="Scanna QR-kod">
              <ScanLine size={18} />
            </Button>
            <Button variant="outline" size="icon" onClick={shareInviteLink} title="Bjud in kompis">
              <Share2 size={18} />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök på namn..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {searchResults.map(p => (
                <Card key={p.user_id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(p.display_name || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{p.display_name || 'Anonym'}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendRequest(p.user_id)}
                      disabled={isAlreadyFriend(p.user_id)}
                    >
                      {isAlreadyFriend(p.user_id) ? <Check size={14} /> : <UserPlus size={14} />}
                      <span className="ml-1">{isAlreadyFriend(p.user_id) ? 'Skickad' : 'Lägg till'}</span>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center py-4">
              Ingen användare hittades — tipsa din kompis om AgilityManager! 🐾
            </motion.p>
          )}
        </AnimatePresence>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="friends">
              Kompisar {friends.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{friends.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="chat">
              Chatt
            </TabsTrigger>
            <TabsTrigger value="pending">
              Förfrågningar {incomingRequests.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{incomingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="shared">Banor</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-2 mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Users size={48} className="mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">Inga kompisar ännu</p>
                <p className="text-sm text-muted-foreground">Sök eller bjud in kompisar med QR-kod eller länk!</p>
              </div>
            ) : (
              friends.map(f => (
                <Card key={f.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {(f.profile.display_name || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{f.profile.display_name || 'Anonym'}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/chat/${f.profile.user_id}`)}
                        title="Chatta"
                      >
                        <MessageCircle size={18} className="text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/friend-stats/${f.profile.user_id}`)}
                        title="Visa statistik"
                      >
                        <Eye size={18} className="text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {incomingRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Inkommande</h3>
                {incomingRequests.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                          {(r.profile.display_name || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{r.profile.display_name || 'Anonym'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="text-green-600" onClick={() => acceptRequest(r.id)}>
                          <Check size={18} />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => declineRequest(r.id)}>
                          <X size={18} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {outgoingRequests.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Skickade</h3>
                {outgoingRequests.map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
                          {(r.profile.display_name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-foreground">{r.profile.display_name || 'Anonym'}</span>
                      </div>
                      <Badge variant="secondary">Väntar</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Inga väntande förfrågningar</p>
            )}
          </TabsContent>

          <TabsContent value="shared" className="mt-4">
            <SharedCoursesInbox />
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader><DialogTitle>Min QR-kod</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={`${window.location.origin}/invite/${myProfile?.referral_code || ''}`} size={200} />
            </div>
            <p className="text-sm text-muted-foreground">Visa för din kompis att scanna!</p>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/invite/${myProfile?.referral_code || ''}`);
              toast.success('Länk kopierad!');
            }}>
              <Copy size={14} className="mr-1" /> Kopiera länk
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner */}
      <QrScannerDialog open={showScanner} onOpenChange={setShowScanner} onScan={(code) => {
        // Extract referral code from URL
        const match = code.match(/\/invite\/([a-f0-9]+)/);
        if (match) {
          const refCode = match[1];
          // Find user by referral code and send request
          supabase
            .from('profiles')
            .select('user_id, display_name')
            .eq('referral_code', refCode)
            .single()
            .then(({ data }) => {
              if (data && data.user_id !== user?.id) {
                sendRequest(data.user_id);
                setShowScanner(false);
              } else {
                toast.error('Kunde inte hitta användaren');
              }
            });
        }
      }} />
    </PageContainer>
  );
}
