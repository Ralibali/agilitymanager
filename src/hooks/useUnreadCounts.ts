import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UnreadCounts {
  messages: number;
  notifications: number;
  friendRequests: number;
  total: number;
}

export function useUnreadCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0, friendRequests: 0, total: 0 });

  useEffect(() => {
    if (!user?.id) return;

    const fetchCounts = async () => {
      const [msgRes, notifRes, friendRes] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('read', false),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false),
        supabase
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
      ]);

      const messages = msgRes.count ?? 0;
      const notifications = notifRes.count ?? 0;
      const friendRequests = friendRes.count ?? 0;

      setCounts({
        messages,
        notifications,
        friendRequests,
        total: messages + notifications + friendRequests,
      });
    };

    fetchCounts();

    // Subscribe to realtime changes for messages
    const channelName = `unread-counts-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchCounts())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchCounts())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return counts;
}
