import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '@/components/PageContainer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, MapPin, Crown, MessageSquare, Calendar, UserPlus, LogOut, Pin, ChevronLeft, Trash2, UsersRound, Link2, Copy, Check, ShieldCheck, ShieldOff, BarChart3, Mail } from 'lucide-react';
import { ClubGroupsTab } from '@/components/clubs/ClubGroupsTab';
import ClubAdminStats from '@/components/clubs/ClubAdminStats';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface Club {
  id: string;
  name: string;
  description: string;
  city: string;
  logo_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  quick_tags: string[];
}

interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface ClubPost {
  id: string;
  club_id: string;
  user_id: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author_name?: string;
}

interface ClubEvent {
  id: string;
  club_id: string;
  user_id: string;
  group_id: string | null;
  title: string;
  description: string;
  date: string;
  event_type: string;
  created_at: string;
}

export default function ClubPage() {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [myMemberships, setMyMemberships] = useState<ClubMember[]>([]);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCity, setNewCity] = useState('');

  const fetchMyClubs = async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from('club_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    setMyMemberships(memberships || []);

    if (memberships && memberships.length > 0) {
      const clubIds = memberships.map(m => m.club_id);
      const { data: clubs } = await supabase
        .from('clubs')
        .select('*')
        .in('id', clubIds);
      setMyClubs(clubs || []);
    } else {
      setMyClubs([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMyClubs(); }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
      .limit(20);
    setSearchResults(data || []);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) { toast.error('Ange ett klubbnamn'); return; }
    const { data: club, error } = await supabase.from('clubs').insert({
      name: newName.trim(),
      description: newDesc.trim(),
      city: newCity.trim(),
      created_by: user.id,
    }).select().single();

    if (error || !club) { toast.error('Kunde inte skapa klubb'); return; }

    // Add creator as admin
    await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: user.id,
      role: 'admin',
      status: 'accepted',
    });

    toast.success('Klubb skapad!');
    setCreateOpen(false);
    setNewName(''); setNewDesc(''); setNewCity('');
    fetchMyClubs();
  };

  const handleApply = async (clubId: string) => {
    if (!user) return;
    const { error } = await supabase.from('club_members').insert({
      club_id: clubId,
      user_id: user.id,
      status: 'pending',
    });
    if (error?.code === '23505') { toast.info('Du har redan ansökt'); return; }
    if (error) { toast.error('Kunde inte skicka ansökan'); return; }
    toast.success('Ansökan skickad!');
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim() || !user) return;
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('invite_code', inviteCode.trim())
      .single();
    if (!club) { toast.error('Ingen klubb hittades med den koden'); return; }
    // Check if already member
    const existing = myMemberships.find(m => m.club_id === club.id);
    if (existing) { toast.info('Du är redan med i denna klubb'); return; }
    const { error } = await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: user.id,
      status: 'accepted',
    });
    if (error?.code === '23505') { toast.info('Du är redan med'); return; }
    if (error) { toast.error('Kunde inte gå med'); return; }
    toast.success(`Du gick med i ${club.name}!`);
    setInviteCode('');
    fetchMyClubs();
  };

  if (selectedClub) {
    return <ClubDetail club={selectedClub} userId={user?.id || ''} onBack={() => { setSelectedClub(null); fetchMyClubs(); }} />;
  }

  if (loading) return <PageContainer title="Klubbar"><div className="text-center py-20 text-muted-foreground">Laddar...</div></PageContainer>;

  const isMember = (clubId: string) => myMemberships.some(m => m.club_id === clubId);

  return (
    <>
      <Helmet>
        <title>Klubbar – Agilityklubbar & Träningsgrupper | AgilityManager</title>
        <meta name="description" content="Gå med i agilityklubbar, dela kalender och träna tillsammans." />
      </Helmet>
      <PageContainer
        title="Klubbar"
        subtitle={`${myClubs.length} klubbar`}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus size={14} /> Skapa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Skapa klubb</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Klubbnamn" />
                <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Stad" />
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Beskrivning" rows={3} />
                <Button onClick={handleCreate} className="w-full">Skapa klubb</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {/* Search */}
        <div className="flex gap-2 mb-4">
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Sök klubb eller stad..."
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search size={16} />
          </Button>
        </div>

        {/* Join by invite code */}
        <div className="flex gap-2 mb-4">
          <Input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="Ange inbjudningskod..."
            onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
          />
          <Button variant="outline" size="sm" onClick={handleJoinByCode} className="gap-1 shrink-0">
            <Link2 size={14} /> Gå med
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sökresultat</h3>
            {searchResults.map(club => (
              <div key={club.id} className="bg-card rounded-xl p-3 shadow-card flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{club.name}</h4>
                  {club.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {club.city}</span>}
                </div>
                {isMember(club.id) ? (
                  <Button size="sm" variant="outline" onClick={() => setSelectedClub(club)}>Öppna</Button>
                ) : (
                  <Button size="sm" className="gap-1" onClick={() => handleApply(club.id)}>
                    <UserPlus size={12} /> Ansök
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* My clubs */}
        {myClubs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm mb-2">Du är inte med i någon klubb ännu.</p>
            <p className="text-xs">Sök efter en klubb eller skapa en ny!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mina klubbar</h3>
            <AnimatePresence>
              {myClubs.map((club, i) => {
                const membership = myMemberships.find(m => m.club_id === club.id);
                return (
                  <motion.button
                    key={club.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedClub(club)}
                    className="w-full bg-card rounded-xl p-4 shadow-card text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-display font-semibold text-foreground">{club.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {club.city && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} /> {club.city}</span>}
                          {membership?.role === 'admin' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5"><Crown size={8} /> Admin</Badge>
                          )}
                        </div>
                      </div>
                      <Users size={16} className="text-muted-foreground" />
                    </div>
                    {club.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{club.description}</p>}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </PageContainer>
    </>
  );
}

// --- Club detail view ---
function ClubDetail({ club, userId, onBack }: { club: Club; userId: string; onBack: () => void }) {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [eventSignups, setEventSignups] = useState<Record<string, { id: string; user_id: string; comment: string; status: string }[]>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [newPost, setNewPost] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [tagDraft, setTagDraft] = useState<string[]>(club.quick_tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [calendarGroupFilter, setCalendarGroupFilter] = useState<string>('all'); // 'all' | 'mine' | group_id
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);

  // New event form
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('training');
  const [eventGroupId, setEventGroupId] = useState<string>('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventMaxPart, setEventMaxPart] = useState('');
  const fetchData = async () => {
    const [{ data: m }, { data: p }, { data: e }, { data: g }] = await Promise.all([
      supabase.from('club_members').select('*').eq('club_id', club.id),
      supabase.from('club_posts').select('*').eq('club_id', club.id).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('club_events').select('*').eq('club_id', club.id).order('date', { ascending: true }),
      supabase.from('club_groups').select('id, name').eq('club_id', club.id),
    ]);
    setMembers(m || []);
    setPosts(p || []);
    setEvents(e || []);
    setGroups(g || []);

    const me = (m || []).find(mb => mb.user_id === userId);
    setIsAdmin(me?.role === 'admin');

    // Fetch user's group memberships
    if (g && g.length > 0) {
      const { data: gm } = await supabase
        .from('club_group_members')
        .select('group_id')
        .eq('user_id', userId)
        .in('group_id', g.map(gr => gr.id));
      setMyGroupIds((gm || []).map(x => x.group_id));
    }

    // Fetch signups for all events
    if (e && e.length > 0) {
      const eventIds = e.map(ev => ev.id);
      const { data: signups } = await supabase
        .from('club_event_signups')
        .select('*')
        .in('event_id', eventIds);
      const grouped: Record<string, { id: string; user_id: string; comment: string; status: string }[]> = {};
      (signups || []).forEach(s => {
        if (!grouped[s.event_id]) grouped[s.event_id] = [];
        grouped[s.event_id].push({ id: s.id, user_id: s.user_id, comment: s.comment, status: s.status });
      });
      setEventSignups(grouped);
    }

    // Fetch display names
    const userIds = [...new Set([...(m || []).map(mb => mb.user_id), ...(p || []).map(pp => pp.user_id)])];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      const map: Record<string, string> = {};
      (profs || []).forEach(pr => { map[pr.user_id] = pr.display_name || 'Anonym'; });
      setProfiles(map);
    }
  };

  useEffect(() => { fetchData(); }, [club.id]);

  const sendClubEmail = async (title: string, message: string, content?: string) => {
    try {
      await supabase.functions.invoke('club-notify', {
        body: { club_id: club.id, title, message, content },
      });
    } catch (e) { /* email is best-effort */ }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    await supabase.from('club_posts').insert({ club_id: club.id, user_id: userId, content: newPost.trim() });
    const senderName = profiles[userId] || 'Någon';
    await notifyClubMembers(`📢 ${senderName} postade i ${club.name}: "${newPost.trim().slice(0, 60)}"`, userId);
    sendClubEmail('Nytt inlägg', `${senderName} postade i ${club.name}`, newPost.trim().slice(0, 200));
    setNewPost('');
    fetchData();
  };

  const handleTogglePin = async (postId: string, pinned: boolean) => {
    await supabase.from('club_posts').update({ pinned: !pinned }).eq('id', postId);
    fetchData();
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('club_posts').delete().eq('id', postId);
    fetchData();
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventDate) { toast.error('Ange titel och datum'); return; }
    await supabase.from('club_events').insert({
      club_id: club.id,
      user_id: userId,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      date: eventDate,
      event_type: eventType,
      group_id: eventGroupId || null,
      location: eventLocation.trim(),
      max_participants: eventMaxPart ? parseInt(eventMaxPart) : null,
    });
    const groupName = eventGroupId ? groups.find(g => g.id === eventGroupId)?.name : null;
    const eventLabel = groupName ? `${eventTitle.trim()} (${groupName})` : eventTitle.trim();
    await notifyClubMembers(`📅 Nytt event i ${club.name}: ${eventLabel}`, userId);
    sendClubEmail('Nytt event', `Nytt event i ${club.name}: ${eventLabel}`, eventDesc.trim() || undefined);
    toast.success('Event skapat!');
    setEventDialogOpen(false);
    setEventTitle(''); setEventDesc(''); setEventDate(''); setEventType('training'); setEventGroupId('');
    setEventLocation(''); setEventMaxPart('');
    fetchData();
  };

  const handleAcceptMember = async (memberId: string) => {
    await supabase.from('club_members').update({ status: 'accepted' }).eq('id', memberId);
    toast.success('Medlem godkänd!');
    fetchData();
  };

  const handleRejectMember = async (memberId: string) => {
    await supabase.from('club_members').delete().eq('id', memberId);
    fetchData();
  };

  const handleLeave = async () => {
    await supabase.from('club_members').delete().eq('club_id', club.id).eq('user_id', userId);
    toast.success('Du har lämnat klubben');
    onBack();
  };

  const [signupComments, setSignupComments] = useState<Record<string, string>>({});

  const handleSignupEvent = async (eventId: string, status: string = 'signed_up') => {
    const comment = signupComments[eventId]?.trim() || '';
    const existing = (eventSignups[eventId] || []).find(s => s.user_id === userId);
    if (existing) {
      await supabase.from('club_event_signups').update({ status, comment }).eq('id', existing.id);
      toast.success(status === 'not_going' ? 'Markerad som ej kommande' : 'Anmäld!');
    } else {
      const { error } = await supabase.from('club_event_signups').insert({ event_id: eventId, user_id: userId, status, comment });
      if (error?.code === '23505') { toast.info('Du är redan anmäld'); return; }
      if (error) { toast.error('Kunde inte anmäla'); return; }
      toast.success(status === 'not_going' ? 'Markerad som ej kommande' : 'Anmäld!');
    }
    setSignupComments(prev => ({ ...prev, [eventId]: '' }));
    fetchData();
  };

  const handleUnsignupEvent = async (eventId: string) => {
    await supabase.from('club_event_signups').delete().eq('event_id', eventId).eq('user_id', userId);
    toast.success('Avanmäld');
    fetchData();
  };

  const handleToggleAdmin = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await supabase.from('club_members').update({ role: newRole }).eq('id', memberId);
    toast.success(newRole === 'admin' ? 'Befordrad till admin!' : 'Degraderad till medlem');
    fetchData();
  };

  // Notify all members except sender
  const notifyClubMembers = async (message: string, excludeUserId: string) => {
    const accepted = members.filter(m => m.status === 'accepted' && m.user_id !== excludeUserId);
    if (accepted.length === 0) return;
    const notifications = accepted.map(m => ({
      user_id: m.user_id,
      message,
    }));
    await supabase.from('notifications').insert(notifications);
  };

  const acceptedMembers = members.filter(m => m.status === 'accepted');
  const pendingMembers = members.filter(m => m.status === 'pending');
  const eventTypeLabel: Record<string, string> = { training: '🏋️ Träning', competition: '🏆 Tävling', social: '🎉 Socialt' };

  return (
    <PageContainer
      title={club.name}
      subtitle={`${acceptedMembers.length} medlemmar${club.city ? ` · ${club.city}` : ''}`}
      action={
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft size={14} /> Tillbaka
        </Button>
      }
    >
      {club.description && <p className="text-sm text-muted-foreground mb-4">{club.description}</p>}

      {/* Invite code for admins */}
      {isAdmin && (
        <div className="bg-secondary/50 rounded-xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Inbjudningskod</span>
              <p className="text-sm font-mono font-semibold text-foreground">{club.invite_code}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(club.invite_code);
                setCodeCopied(true);
                toast.success('Kod kopierad!');
                setTimeout(() => setCodeCopied(false), 2000);
              }}
            >
              {codeCopied ? <Check size={14} /> : <Copy size={14} />}
              {codeCopied ? 'Kopierad' : 'Kopiera kod'}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1 text-xs"
            onClick={() => {
              const url = `${window.location.origin}/club-invite/${club.invite_code}`;
              navigator.clipboard.writeText(url);
              toast.success('Inbjudningslänk kopierad!');
            }}
          >
            <Link2 size={14} /> Kopiera inbjudningslänk
          </Button>
        </div>
      )}

      <Tabs defaultValue="posts">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="posts" className="flex-1 text-[10px] gap-0.5"><MessageSquare size={11} /> Inlägg</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 text-[10px] gap-0.5"><Calendar size={11} /> Kalender</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 text-[10px] gap-0.5"><BarChart3 size={11} /> Stats</TabsTrigger>
          <TabsTrigger value="groups" className="flex-1 text-[10px] gap-0.5"><UsersRound size={11} /> Grupper</TabsTrigger>
          <TabsTrigger value="members" className="flex-1 text-[10px] gap-0.5"><Users size={11} /> Medl.</TabsTrigger>
        </TabsList>

        {/* Posts / bulletin */}
        <TabsContent value="posts" className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Skriv ett inlägg..." onKeyDown={e => e.key === 'Enter' && handlePost()} />
            <Button size="sm" onClick={handlePost}>Posta</Button>
          </div>
          {posts.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Inga inlägg ännu.</p>}
          {posts.map(p => (
            <div key={p.id} className={`bg-card rounded-xl p-3 shadow-card ${p.pinned ? 'border-l-2 border-primary' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{profiles[p.user_id] || 'Anonym'}</span>
                    {p.pinned && <Pin size={10} className="text-primary" />}
                  </div>
                  <p className="text-sm text-foreground mt-1">{p.content}</p>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(p.created_at), 'd MMM HH:mm', { locale: sv })}</span>
                </div>
                {(isAdmin || p.user_id === userId) && (
                  <div className="flex gap-1">
                    {isAdmin && (
                      <button onClick={() => handleTogglePin(p.id, p.pinned)} className="p-1 hover:bg-secondary rounded" title={p.pinned ? 'Avpinna' : 'Pinna'}>
                        <Pin size={12} className={p.pinned ? 'text-primary' : 'text-muted-foreground'} />
                      </button>
                    )}
                    <button onClick={() => handleDeletePost(p.id)} className="p-1 hover:bg-secondary rounded">
                      <Trash2 size={12} className="text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Calendar */}
        <TabsContent value="calendar" className="mt-3 space-y-3">
          {isAdmin && (
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 w-full"><Plus size={14} /> Nytt event</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Skapa event</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Titel" />
                  <Textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Beskrivning" rows={2} />
                  <Input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  <Input value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Plats (valfritt)" />
                  <Input type="number" value={eventMaxPart} onChange={e => setEventMaxPart(e.target.value)} placeholder="Max deltagare (valfritt)" min="1" />
                  <div className="flex gap-2">
                    {(['training', 'competition', 'social'] as const).map(t => (
                      <Button
                        key={t}
                        size="sm"
                        variant={eventType === t ? 'default' : 'outline'}
                        onClick={() => setEventType(t)}
                        className="flex-1 text-xs"
                      >
                        {eventTypeLabel[t]}
                      </Button>
                    ))}
                  </div>
                  {groups.length > 0 && (
                    <select
                      value={eventGroupId}
                      onChange={e => setEventGroupId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Alla medlemmar (ingen grupp)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}
                  <Button onClick={handleCreateEvent} className="w-full">Skapa</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Group filter */}
          {groups.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant={calendarGroupFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setCalendarGroupFilter('all')}
                className="text-xs h-7"
              >
                Alla
              </Button>
              <Button
                size="sm"
                variant={calendarGroupFilter === 'mine' ? 'default' : 'outline'}
                onClick={() => setCalendarGroupFilter('mine')}
                className="text-xs h-7"
              >
                Mina grupper
              </Button>
              {groups.map(g => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={calendarGroupFilter === g.id ? 'default' : 'outline'}
                  onClick={() => setCalendarGroupFilter(g.id)}
                  className="text-xs h-7"
                >
                  {g.name}
                </Button>
              ))}
            </div>
          )}

          {(() => {
            const filtered = events.filter(e => {
              if (calendarGroupFilter === 'all') return true;
              if (calendarGroupFilter === 'mine') return !e.group_id || myGroupIds.includes(e.group_id);
              return e.group_id === calendarGroupFilter || !e.group_id;
            });
            if (filtered.length === 0) return <p className="text-center text-muted-foreground text-sm py-8">Inga event att visa.</p>;
            return filtered.map(e => {
              const signups = eventSignups[e.id] || [];
              const mySignup = signups.find(s => s.user_id === userId);
              const isSigned = !!mySignup;
              const goingCount = signups.filter(s => s.status === 'signed_up').length;
              const notGoingCount = signups.filter(s => s.status === 'not_going').length;
              const isExpanded = expandedEvent === e.id;
              const groupName = e.group_id ? groups.find(g => g.id === e.group_id)?.name : null;
              return (
                <div key={e.id} className="bg-card rounded-xl p-3 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{eventTypeLabel[e.event_type] || e.event_type}</span>
                        {groupName && <Badge variant="outline" className="text-[9px] px-1 py-0">{groupName}</Badge>}
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">{e.title}</h4>
                      {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                    <h4 className="font-semibold text-sm text-foreground">{e.title}</h4>
                    {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-xs font-medium text-foreground">{format(new Date(e.date), 'd MMM', { locale: sv })}</div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(e.date), 'HH:mm')}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : e.id)}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ✅ {goingCount} {notGoingCount > 0 && <span className="ml-1">❌ {notGoingCount}</span>} {isExpanded ? '▲' : '▼'}
                  </button>
                  <div className="flex gap-1">
                    {isSigned && mySignup?.status === 'signed_up' ? (
                      <>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-primary/50 text-primary" onClick={() => handleUnsignupEvent(e.id)}>
                          <Check size={12} /> Kommer
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground" onClick={() => handleSignupEvent(e.id, 'not_going')}>
                          ❌
                        </Button>
                      </>
                    ) : isSigned && mySignup?.status === 'not_going' ? (
                      <>
                        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground" onClick={() => handleSignupEvent(e.id, 'signed_up')}>
                          ✅
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1 border-destructive/50 text-destructive" onClick={() => handleUnsignupEvent(e.id)}>
                          Kommer inte
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="text-xs h-7 gap-1" onClick={() => handleSignupEvent(e.id, 'signed_up')}>
                          <UserPlus size={12} /> Kommer
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleSignupEvent(e.id, 'not_going')}>
                          ❌
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* Comment input for RSVP */}
                {!isSigned && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {(club.quick_tags || []).map(quick => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => {
                            const current = signupComments[e.id] || '';
                            const tag = quick;
                            const updated = current ? `${current}, ${tag}` : tag;
                            setSignupComments(prev => ({ ...prev, [e.id]: updated }));
                          }}
                          className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Kommentar, t.ex. 'Kommer med två hundar'"
                      value={signupComments[e.id] || ''}
                      onChange={(ev) => setSignupComments(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      className="text-xs h-8"
                      maxLength={200}
                    />
                  </div>
                )}
                {isSigned && mySignup && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {(club.quick_tags || []).map(quick => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => {
                            const current = signupComments[e.id] ?? mySignup.comment ?? '';
                            const tag = quick;
                            const updated = current ? `${current}, ${tag}` : tag;
                            setSignupComments(prev => ({ ...prev, [e.id]: updated }));
                          }}
                          className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="Lägg till en kommentar..."
                      value={signupComments[e.id] ?? mySignup.comment ?? ''}
                      onChange={(ev) => setSignupComments(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      onBlur={async () => {
                        const newComment = (signupComments[e.id] ?? '').trim();
                        if (newComment !== (mySignup.comment || '')) {
                          await supabase.from('club_event_signups').update({ comment: newComment }).eq('id', mySignup.id);
                          fetchData();
                        }
                      }}
                      className="text-xs h-8"
                      maxLength={200}
                    />
                  </div>
                )}
                {isExpanded && signups.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {signups.filter(s => s.status === 'signed_up').length > 0 && (
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">Kommer</p>
                    )}
                    {signups.filter(s => s.status === 'signed_up').map(s => (
                      <div key={s.id} className="text-xs text-foreground flex items-center gap-1.5">
                        <span className="text-green-500">✅</span>
                        {profiles[s.user_id] || 'Anonym'}
                        {s.comment && <span className="text-muted-foreground ml-1">– {s.comment}</span>}
                      </div>
                    ))}
                    {signups.filter(s => s.status === 'not_going').length > 0 && (
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-2">Kommer inte</p>
                    )}
                    {signups.filter(s => s.status === 'not_going').map(s => (
                      <div key={s.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="text-red-400">❌</span>
                        {profiles[s.user_id] || 'Anonym'}
                        {s.comment && <span className="ml-1">– {s.comment}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            });
          })()}
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats" className="mt-3">
          <ClubAdminStats
            clubId={club.id}
            memberUserIds={acceptedMembers.map(m => m.user_id)}
            profiles={profiles}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {/* Groups */}
        <TabsContent value="groups" className="mt-3">
          <ClubGroupsTab
            clubId={club.id}
            userId={userId}
            isAdmin={isAdmin}
            profiles={profiles}
            acceptedMemberIds={acceptedMembers.map(m => m.user_id)}
          />
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-3 space-y-3">
          {/* Pending approvals */}
          {isAdmin && pendingMembers.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ansökningar ({pendingMembers.length})</h4>
              {pendingMembers.map(m => (
                <div key={m.id} className="bg-card rounded-xl p-3 shadow-card flex items-center justify-between">
                  <span className="text-sm text-foreground">{profiles[m.user_id] || 'Anonym'}</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptMember(m.id)}>Godkänn</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRejectMember(m.id)}>Avvisa</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Medlemmar ({acceptedMembers.length})</h4>
          {acceptedMembers.map(m => (
            <div key={m.id} className="bg-card rounded-xl p-3 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{profiles[m.user_id] || 'Anonym'}</span>
                {m.role === 'admin' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5"><Crown size={8} /> Admin</Badge>}
              </div>
              <div className="flex items-center gap-1">
                {isAdmin && m.user_id !== userId && (
                  <>
                    <button
                      onClick={() => handleToggleAdmin(m.id, m.role)}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                      title={m.role === 'admin' ? 'Ta bort admin' : 'Gör till admin'}
                    >
                      {m.role === 'admin' ? (
                        <ShieldOff size={14} className="text-muted-foreground" />
                      ) : (
                        <ShieldCheck size={14} className="text-primary" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectMember(m.id)}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                      title="Ta bort medlem"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </>
                )}
                <span className="text-[10px] text-muted-foreground">{format(new Date(m.joined_at), 'd MMM yyyy', { locale: sv })}</span>
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full gap-1 text-destructive mt-4" onClick={handleLeave}>
            <LogOut size={14} /> Lämna klubben
          </Button>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
