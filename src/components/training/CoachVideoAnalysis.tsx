import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DogAvatar } from '@/components/DogAvatar';
import { Video, Upload, Loader2, MessageSquare, Trash2, ChevronDown, ChevronUp, GraduationCap, Clock, CheckCircle2 } from 'lucide-react';
import { PremiumGate, PremiumBadge } from '@/components/PremiumGate';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Dog } from '@/types';

interface CoachFeedback {
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

interface CoachVideoAnalysisProps {
  dogs: Dog[];
}

export default function CoachVideoAnalysis({ dogs }: CoachVideoAnalysisProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [dogId, setDogId] = useState(dogs[0]?.id || '');
  const [sport, setSport] = useState('Agility');
  const [pack, setPack] = useState<'1' | '3' | '5'>('1');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PACK_LABELS: Record<'1' | '3' | '5', { price: string; sub: string }> = {
    '1': { price: '149 kr', sub: '1 video' },
    '3': { price: '399 kr', sub: '3-pack · spara 48 kr' },
    '5': { price: '599 kr', sub: '5-pack · spara 146 kr' },
  };

  const { data: history = [] } = useQuery({
    queryKey: ['coach-feedback', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coach_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as CoachFeedback[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coach_feedback').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-feedback'] });
      toast.success('Borttaget');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error('Max filstorlek är 20 MB'); return; }
    if (!f.type.startsWith('video/')) { toast.error('Välj en videofil'); return; }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !question.trim() || !user) {
      toast.error('Ladda upp en video och skriv en fråga');
      return;
    }

    // Check if user already paid (came back from Stripe with coach_paid=true)
    const params = new URLSearchParams(window.location.search);
    const hasPaid = params.get('coach_paid') === 'true';

    if (!hasPaid) {
      // Save form state to sessionStorage before redirecting to Stripe
      sessionStorage.setItem('coach_pending', JSON.stringify({
        question: question.trim(),
        dogId,
        sport,
        fileName: file.name,
      }));
      // Redirect to Stripe payment
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-coach-payment', {
          body: { pack },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (e: any) {
        toast.error('Kunde inte starta betalning');
        console.error(e);
      }
      setIsSubmitting(false);
      return;
    }

    // Payment confirmed – upload video and submit
    setIsSubmitting(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('training-videos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('coach_feedback')
        .insert({
          user_id: user.id,
          dog_id: dogId || null,
          video_url: filePath,
          question: question.trim(),
          sport,
          status: 'pending',
        } as any);
      if (insertError) throw insertError;

      toast.success('Video inskickad! Coachen kommer granska och svara.');
      queryClient.invalidateQueries({ queryKey: ['coach-feedback'] });
      setFile(null);
      setQuestion('');
      const fileInput = document.getElementById('coach-video-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Clean up URL param
      const url = new URL(window.location.href);
      url.searchParams.delete('coach_paid');
      window.history.replaceState({}, '', url.toString());
      sessionStorage.removeItem('coach_pending');
    } catch (e: any) {
      console.error('Submit error:', e);
      toast.error(e.message || 'Något gick fel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDog = (id: string | null) => id ? dogs.find(d => d.id === id) : null;

  return (
    <Card className="mb-4 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <GraduationCap size={18} className="text-primary" />
          Coach – Videoanalys
          <PremiumBadge />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        <PremiumGate fullPage featureName="Coach – Videoanalys">
        <p className="text-xs text-muted-foreground">
          Ladda upp en träningsvideo och ställ en fråga – vår coach granskar och ger personlig feedback.
        </p>

        {/* Upload form */}
        <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div>
            <Label className="text-xs">Träningsvideo (max 20 MB)</Label>
            <div className="mt-1">
              <input id="coach-video-input" type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal gap-2"
                onClick={() => document.getElementById('coach-video-input')?.click()}
                disabled={isSubmitting}
              >
                {file ? (
                  <>
                    <Video size={14} className="text-primary" />
                    <span className="truncate">{file.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                  </>
                ) : (
                  <><Upload size={14} /> Välj video...</>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Sport</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agility">Agility</SelectItem>
                  <SelectItem value="Hoopers">Hoopers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dogs.length > 0 && (
              <div>
                <Label className="text-xs">Hund</Label>
                <Select value={dogId} onValueChange={setDogId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Välj hund" /></SelectTrigger>
                  <SelectContent>
                    {dogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Din fråga till coachen</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="T.ex. Hur ser mina kontakter ut? Vad kan jag förbättra i min dirigering?"
              className="mt-1"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full gap-2" disabled={!file || !question.trim() || isSubmitting}>
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Bearbetar...</>
            ) : (
              <><Upload size={14} /> Betala 99 kr & skicka till coach</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Engångsbetalning 99 kr per videoanalys via Stripe</p>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Mina ärenden</h4>
            <div className="space-y-2">
              {history.map((fb, i) => {
                const dog = getDog(fb.dog_id);
                const isExpanded = expandedId === fb.id;
                const isPending = fb.status === 'pending';
                return (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-lg border border-border/50 bg-secondary/20 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                      className="w-full text-left p-3 flex items-start gap-2"
                    >
                      {isPending ? (
                        <Clock size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{fb.question}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] h-4">{fb.sport}</Badge>
                          {dog && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <DogAvatar dog={dog} size="xs" /> {dog.name}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(fb.created_at), 'd MMM', { locale: sv })}
                          </span>
                          {isPending && (
                            <Badge variant="secondary" className="text-[10px] h-4 text-amber-600">Väntar på svar</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(fb.id); }}
                          className="p-1 rounded hover:bg-destructive/10"
                        >
                          <Trash2 size={12} className="text-destructive" />
                        </button>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && fb.coach_response && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 border-t border-border/50 pt-2">
                            <p className="text-[10px] font-semibold text-primary mb-1">Coachens svar:</p>
                            <p className="text-xs whitespace-pre-wrap">{fb.coach_response}</p>
                          </div>
                        </motion.div>
                      )}
                      {isExpanded && isPending && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 border-t border-border/50 pt-2">
                            <p className="text-xs text-muted-foreground italic">Coachen har ännu inte svarat. Du får besked här när svaret är klart.</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
        </PremiumGate>
      </CardContent>
    </Card>
  );
}
