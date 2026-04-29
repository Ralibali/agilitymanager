import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown, ChevronUp, Clock, CheckCircle2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface FeedbackRow {
  id: string;
  user_id: string;
  dog_id: string | null;
  video_url: string;
  question: string;
  coach_response: string | null;
  sport: string;
  status: string;
  created_at: string;
}

export default function CoachFeedbackTab() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ['admin-coach-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const { error } = await supabase
        .from('coach_feedback')
        .update({ coach_response: response, status: 'completed' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coach-feedback'] });
      toast.success('Svar skickat!');
    },
    onError: () => toast.error('Kunde inte spara svaret'),
  });

  const getVideoUrl = (path: string) => {
    const { data } = supabase.storage.from('training-videos').getPublicUrl(path);
    return data.publicUrl;
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('training-videos')
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  const loadVideo = async (id: string, path: string) => {
    if (videoUrls[id]) return;
    const url = await getSignedUrl(path);
    if (url) setVideoUrls(prev => ({ ...prev, [id]: url }));
  };

  const filtered = feedbacks.filter(fb => {
    if (filter === 'pending') return fb.status === 'pending';
    if (filter === 'completed') return fb.status === 'completed';
    return true;
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Laddar...</div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(['pending', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f === 'pending' ? `⏳ Väntar (${feedbacks.filter(x => x.status === 'pending').length})` : f === 'completed' ? '✅ Besvarade' : '📋 Alla'}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">Inga ärenden att visa.</p>
      )}

      {filtered.map(fb => {
        const isExpanded = expandedId === fb.id;
        return (
          <Card key={fb.id} className="overflow-hidden">
            <button
              onClick={() => {
                setExpandedId(isExpanded ? null : fb.id);
                if (!isExpanded) loadVideo(fb.id, fb.video_url);
              }}
              className="w-full text-left p-4 flex items-start gap-3"
            >
              <div className={`p-2 rounded-lg ${fb.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {fb.status === 'pending' ? <Clock size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-green-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fb.question}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{fb.sport}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(fb.created_at), 'd MMM yyyy HH:mm', { locale: sv })}
                  </span>
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-3 border-t">
                {videoUrls[fb.id] ? (
                  <video
                    src={videoUrls[fb.id]}
                    controls
                    className="w-full rounded-lg max-h-[400px]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Laddar video...
                  </div>
                )}

                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Användarens fråga:</p>
                  <p className="text-sm">{fb.question}</p>
                </div>

                {fb.coach_response && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary mb-1">Ditt svar:</p>
                    <p className="text-sm whitespace-pre-wrap">{fb.coach_response}</p>
                  </div>
                )}

                {!fb.coach_response && (
                  <div className="space-y-2">
                    <Textarea
                      value={replyText[fb.id] || ''}
                      onChange={e => setReplyText(prev => ({ ...prev, [fb.id]: e.target.value }))}
                      placeholder="Skriv ditt svar till användaren..."
                      rows={4}
                    />
                    <Button
                      onClick={() => {
                        const text = replyText[fb.id]?.trim();
                        if (!text) return toast.error('Skriv ett svar');
                        replyMutation.mutate({ id: fb.id, response: text });
                      }}
                      disabled={replyMutation.isPending}
                      className="gap-2"
                      size="sm"
                    >
                      {replyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Skicka svar
                    </Button>
                  </div>
                )}

                {/* Trådad konversation (följdfråga + följdsvar) */}
                {fb.coach_response && <AdminFollowupThread feedbackId={fb.id} />}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

interface ThreadMsg {
  id: string;
  feedback_id: string;
  sender: 'user' | 'coach';
  content: string;
  created_at: string;
}

function AdminFollowupThread({ feedbackId }: { feedbackId: string }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-coach-thread', feedbackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_feedback_messages' as any)
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ThreadMsg[];
    },
  });

  const sendCoachReply = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('coach_feedback_messages' as any)
        .insert({ feedback_id: feedbackId, sender: 'coach', content } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coach-thread', feedbackId] });
      setReply('');
      toast.success('Följdsvar skickat');
    },
    onError: (e: any) => toast.error(e.message || 'Kunde inte skicka svar'),
  });

  const userFollowup = messages.find(m => m.sender === 'user');
  const coachFollowup = messages.find(m => m.sender === 'coach');

  if (isLoading) return null;
  if (!userFollowup && !coachFollowup) {
    return (
      <p className="text-xs text-muted-foreground italic">Ingen följdfråga från användaren än.</p>
    );
  }

  return (
    <div className="space-y-2 border-t pt-3 mt-1">
      <p className="text-xs font-semibold text-muted-foreground">Följdkonversation</p>
      {userFollowup && (
        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Användarens följdfråga:</p>
          <p className="text-sm whitespace-pre-wrap">{userFollowup.content}</p>
        </div>
      )}
      {coachFollowup ? (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <p className="text-xs font-semibold text-primary mb-1">Ditt följdsvar:</p>
          <p className="text-sm whitespace-pre-wrap">{coachFollowup.content}</p>
        </div>
      ) : userFollowup ? (
        <div className="space-y-2">
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Skriv ett följdsvar till användaren (ingår i paketet)..."
            rows={3}
          />
          <Button
            onClick={() => {
              const t = reply.trim();
              if (!t) return toast.error('Skriv ett följdsvar');
              sendCoachReply.mutate(t);
            }}
            disabled={sendCoachReply.isPending}
            size="sm"
            className="gap-2"
          >
            {sendCoachReply.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Skicka följdsvar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
