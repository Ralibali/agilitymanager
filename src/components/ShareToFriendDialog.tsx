import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FriendProfile } from '@/types/friends';

interface ShareToFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharedType: 'competition' | 'result' | 'training' | 'course';
  sharedId: string;
  sharedData: Record<string, unknown>;
}

export default function ShareToFriendDialog({
  open,
  onOpenChange,
  sharedType,
  sharedId,
  sharedData,
}: ShareToFriendDialogProps) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user?.id) return;
    setSentTo(new Set());
    setMessage('');

    (async () => {
      setLoading(true);
      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const otherIds = friendships.map(f =>
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, referral_code')
        .in('user_id', otherIds);

      setFriends((profiles || []) as FriendProfile[]);
      setLoading(false);
    })();
  }, [open, user?.id]);

  const sendToFriend = async (friendId: string) => {
    if (!user?.id) return;
    setSending(friendId);

    const labelMap: Record<string, string> = {
      competition: 'Kolla in den här tävlingen!',
      result: 'Kolla mitt resultat!',
      training: 'Kolla mitt träningspass!',
      course: 'Kolla in den här banan!',
    };

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: message.trim() || labelMap[sharedType] || 'Kolla!',
      shared_type: sharedType,
      shared_id: sharedId,
      shared_data: sharedData as unknown as Record<string, never>,
    } as never);

    if (error) {
      toast.error('Kunde inte skicka');
    } else {
      setSentTo(prev => new Set(prev).add(friendId));
      toast.success('Skickat!');
    }
    setSending(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Dela med kompis</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Lägg till ett meddelande (valfritt)..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="mb-2"
        />

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : friends.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Lägg till kompisar först för att kunna dela!
            </p>
          ) : (
            friends.map(f => (
              <Card key={f.user_id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {(f.display_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-sm text-foreground">{f.display_name || 'Anonym'}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={sentTo.has(f.user_id) ? 'secondary' : 'default'}
                    disabled={sentTo.has(f.user_id) || sending === f.user_id}
                    onClick={() => sendToFriend(f.user_id)}
                  >
                    {sending === f.user_id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : sentTo.has(f.user_id) ? (
                      <><Check size={14} className="mr-1" /> Skickat</>
                    ) : (
                      <><Send size={14} className="mr-1" /> Skicka</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
