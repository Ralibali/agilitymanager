import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function SupportForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user!.id,
        subject,
        message,
      });
      if (error) throw error;

      // Notify admin via email
      await supabase.functions.invoke('notify-admin', {
        body: {
          type: 'support_ticket',
          data: { subject, message, user_email: user!.email },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-support-tickets'] });
      setSubject('');
      setMessage('');
      toast.success('Ditt ärende har skickats!');
    },
    onError: () => toast.error('Kunde inte skicka ärende'),
  });

  const statusLabel = (s: string) => {
    switch (s) {
      case 'open': return { text: 'Öppet', class: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' };
      case 'answered': return { text: 'Besvarat', class: 'bg-green-500/10 text-green-600 border-green-500/20' };
      case 'closed': return { text: 'Stängt', class: 'bg-muted text-muted-foreground border-muted' };
      default: return { text: s, class: '' };
    }
  };

  return (
    <div className="space-y-4">
      {/* New ticket form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={18} className="text-primary" />
            <h3 className="font-display font-semibold text-foreground">Kontakta support</h3>
          </div>
          <Input
            placeholder="Ämne"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="rounded-xl"
          />
          <Textarea
            placeholder="Beskriv ditt ärende..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-xl min-h-[100px]"
          />
          <Button
            className="w-full gap-2"
            disabled={!subject.trim() || !message.trim() || createTicket.isPending}
            onClick={() => createTicket.mutate()}
          >
            {createTicket.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Skicka ärende
          </Button>
        </CardContent>
      </Card>

      {/* Previous tickets */}
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : tickets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Dina ärenden</h4>
          {tickets.map((t: any) => {
            const status = statusLabel(t.status);
            return (
              <Card key={t.id}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                    <Badge variant="outline" className={`text-[9px] ${status.class}`}>{status.text}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                  {t.admin_reply && (
                    <div className="bg-primary/5 rounded-lg p-2 mt-1">
                      <div className="flex items-center gap-1 mb-0.5">
                        <CheckCircle2 size={10} className="text-primary" />
                        <span className="text-[10px] font-semibold text-primary">Svar från support</span>
                      </div>
                      <p className="text-xs text-foreground">{t.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
