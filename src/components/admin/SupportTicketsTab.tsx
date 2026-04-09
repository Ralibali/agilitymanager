import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function SupportTicketsTab() {
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Get profiles for user names
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-profiles-for-tickets'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name');
      return data || [];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, reply, status }: { id: string; reply: string; status: 'open' | 'answered' | 'closed' }) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ admin_reply: reply, status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      setReplyingTo(null);
      setReplyText('');
      toast({ title: 'Svar skickat' });
    },
    onError: () => toast({ title: 'Kunde inte svara', variant: 'destructive' }),
  });

  const getUserName = (userId: string) => {
    const p = profiles.find((p: any) => p.user_id === userId);
    return p?.display_name || 'Okänd';
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'open': return { text: 'Öppet', class: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
      case 'answered': return { text: 'Besvarat', class: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'closed': return { text: 'Stängt', class: 'bg-muted text-muted-foreground border-muted' };
      default: return { text: s, class: '' };
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!tickets.length) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Inga supportärenden ännu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t: any) => {
        const status = statusBadge(t.status);
        return (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">{t.subject}</span>
                  <p className="text-[10px] text-muted-foreground">
                    {getUserName(t.user_id)} · {new Date(t.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${status.class}`}>{status.text}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t.message}</p>

              {t.admin_reply && (
                <div className="bg-primary/5 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <CheckCircle2 size={10} className="text-primary" />
                    <span className="text-[10px] font-semibold text-primary">Ditt svar</span>
                  </div>
                  <p className="text-xs text-foreground">{t.admin_reply}</p>
                </div>
              )}

              {replyingTo === t.id ? (
                <div className="space-y-2 pt-1">
                  <Textarea
                    placeholder="Skriv svar..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="rounded-xl min-h-[80px] text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1 text-xs"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      onClick={() => replyMutation.mutate({ id: t.id, reply: replyText, status: 'answered' })}
                    >
                      {replyMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Svara
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                      Avbryt
                    </Button>
                    {t.status !== 'closed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => replyMutation.mutate({ id: t.id, reply: t.admin_reply || '', status: 'closed' })}
                      >
                        Stäng
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => { setReplyingTo(t.id); setReplyText(t.admin_reply || ''); }}
                >
                  <MessageCircle size={12} /> {t.admin_reply ? 'Redigera svar' : 'Svara'}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
