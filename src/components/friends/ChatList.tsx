import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { FriendProfile } from '@/types/friends';

interface ChatPreview {
  friendId: string;
  profile: FriendProfile;
  lastMessage: string;
  lastTime: string;
  unread: number;
  sharedType: string | null;
}

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    if (!user?.id) return;

    // Get all friends
    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!friendships || friendships.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }

    const friendIds = friendships.map(f =>
      f.requester_id === user.id ? f.receiver_id : f.requester_id
    );

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, referral_code')
      .in('user_id', friendIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p as FriendProfile]));

    // Get latest message per friend
    const chatPreviews: ChatPreview[] = [];

    for (const fId of friendIds) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${fId}),and(sender_id.eq.${fId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', fId)
        .eq('receiver_id', user.id)
        .eq('read', false);

      const profile = profileMap.get(fId) || { user_id: fId, display_name: null, avatar_url: null, referral_code: null };
      const lastMsg = msgs?.[0];

      chatPreviews.push({
        friendId: fId,
        profile,
        lastMessage: lastMsg?.content || '',
        lastTime: lastMsg?.created_at || '',
        unread: count || 0,
        sharedType: lastMsg?.shared_type || null,
      });
    }

    // Sort by last message time, friends with messages first
    chatPreviews.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0;
      if (!a.lastTime) return 1;
      if (!b.lastTime) return -1;
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
    });

    setChats(chatPreviews);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        loadChats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadChats]);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Igår';
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <MessageCircle size={40} className="mx-auto text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">Inga konversationer ännu</p>
        <p className="text-muted-foreground text-xs">Lägg till kompisar och börja chatta!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map(chat => (
        <Card
          key={chat.friendId}
          className="cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => navigate(`/chat/${chat.friendId}`)}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(chat.profile.display_name || '?')[0].toUpperCase()}
              </div>
              {chat.unread > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {chat.unread}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`font-medium text-sm ${chat.unread > 0 ? 'text-foreground' : 'text-foreground'}`}>
                  {chat.profile.display_name || 'Anonym'}
                </span>
                <span className="text-[10px] text-muted-foreground">{formatTime(chat.lastTime)}</span>
              </div>
              <p className={`text-xs truncate ${chat.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {chat.sharedType ? '📎 Delad resurs' : chat.lastMessage || 'Starta konversationen!'}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
