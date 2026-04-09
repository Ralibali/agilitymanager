import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Trophy, Dumbbell, Calendar, PencilRuler } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FriendProfile } from '@/types/friends';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  shared_type: string | null;
  shared_id: string | null;
  shared_data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

function SharedItemPreview({ type, data }: { type: string; data: Record<string, unknown> | null }) {
  if (!data) return null;

  const iconMap: Record<string, typeof Trophy> = {
    competition: Calendar,
    result: Trophy,
    training: Dumbbell,
    course: PencilRuler,
  };
  const Icon = iconMap[type] || Trophy;

  const labelMap: Record<string, string> = {
    competition: 'Tävlingstips',
    result: 'Tävlingsresultat',
    training: 'Träningspass',
    course: 'Banskiss',
  };

  return (
    <div className="bg-secondary/50 rounded-lg p-2 mt-1 border border-border/50">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon size={12} />
        <span className="font-medium">{labelMap[type] || type}</span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">
        {(data.name || data.event_name || data.competition_name || 'Delad resurs') as string}
      </p>
      {data.date && <p className="text-xs text-muted-foreground">{data.date as string}</p>}
      {data.location && <p className="text-xs text-muted-foreground">{data.location as string}</p>}
    </div>
  );
}

export default function ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load friend profile
  useEffect(() => {
    if (!friendId) return;
    supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, referral_code')
      .eq('user_id', friendId)
      .single()
      .then(({ data }) => {
        if (data) setFriendProfile(data as FriendProfile);
      });
  }, [friendId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.id || !friendId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as unknown as Message[]);
      // Mark unread messages as read
      const unreadIds = data
        .filter(m => m.receiver_id === user.id && !m.read)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);
      }
    }
  }, [user?.id, friendId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id || !friendId) return;
    const channel = supabase
      .channel(`chat-${[user.id, friendId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as unknown as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === friendId) ||
          (msg.sender_id === friendId && msg.receiver_id === user.id)
        ) {
          setMessages(prev => [...prev, msg]);
          // Mark as read if received
          if (msg.receiver_id === user.id) {
            supabase.from('messages').update({ read: true }).eq('id', msg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, friendId]);

  const sendMessage = async () => {
    if (!user?.id || !friendId || !newMessage.trim()) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: newMessage.trim(),
    } as never);
    if (!error) setNewMessage('');
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `Igår ${time}`;
    return `${d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} ${time}`;
  };

  return (
    <PageContainer>
      <Helmet><title>Chatt — AgilityManager</title></Helmet>

      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate('/friends')}>
            <ArrowLeft size={20} />
          </Button>
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {(friendProfile?.display_name || '?')[0].toUpperCase()}
          </div>
          <h1 className="font-semibold text-foreground">{friendProfile?.display_name || 'Laddar...'}</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Starta konversationen! 🐾
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const isMine = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}>
                    {msg.shared_type && msg.shared_data && (
                      <SharedItemPreview type={msg.shared_type} data={msg.shared_data} />
                    )}
                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-3 border-t border-border">
          <Input
            ref={inputRef}
            placeholder="Skriv ett meddelande..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
