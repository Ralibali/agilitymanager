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
import { Video, Upload, Loader2, MessageSquare, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import type { Dog } from '@/types';

interface CoachFeedback {
  id: string;
  user_id: string;
  dog_id: string | null;
  video_url: string;
  question: string;
  ai_response: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (f.size > maxSize) {
      toast.error('Max filstorlek är 20 MB');
      return;
    }
    if (!f.type.startsWith('video/')) {
      toast.error('Välj en videofil');
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !question.trim() || !user) {
      toast.error('Ladda upp en video och skriv en fråga');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload video
      const ext = file.name.split('.').pop() || 'mp4';
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('training-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create feedback record
      const dog = dogs.find(d => d.id === dogId);
      const { data: feedbackRow, error: insertError } = await supabase
        .from('coach_feedback')
        .insert({
          user_id: user.id,
          dog_id: dogId || null,
          video_url: filePath,
          question: question.trim(),
          sport,
          status: 'analyzing',
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Call edge function
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-video-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            feedbackId: (feedbackRow as any).id,
            videoPath: filePath,
            question: question.trim(),
            sport,
            dogName: dog?.name || '',
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Analys misslyckades');
      }

      toast.success('Analys klar!');
      queryClient.invalidateQueries({ queryKey: ['coach-feedback'] });
      setFile(null);
      setQuestion('');
      // Reset file input
      const fileInput = document.getElementById('coach-video-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: any) {
      console.error('Coach analysis error:', e);
      toast.error(e.message || 'Något gick fel');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDog = (id: string | null) => id ? dogs.find(d => d.id === id) : null;

  return (
    <Card className="mb-4 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          AI Coach – Videoanalys
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {/* Upload form */}
        <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div>
            <Label className="text-xs">Träningsvideo (max 20 MB)</Label>
            <div className="mt-1">
              <input
                id="coach-video-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal gap-2"
                onClick={() => document.getElementById('coach-video-input')?.click()}
                disabled={isAnalyzing}
              >
                {file ? (
                  <>
                    <Video size={14} className="text-primary" />
                    <span className="truncate">{file.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Välj video...
                  </>
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
                    {dogs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Din fråga till AI-coachen</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="T.ex. Hur ser mina kontakter ut? Vad kan jag förbättra i min dirigering?"
              className="mt-1"
              rows={2}
              disabled={isAnalyzing}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full gap-2"
            disabled={!file || !question.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyserar video...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Analysera
              </>
            )}
          </Button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Tidigare analyser</h4>
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {history.map((fb, i) => {
                  const dog = getDog(fb.dog_id);
                  const isExpanded = expandedId === fb.id;
                  return (
                    <motion.div
                      key={fb.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-lg border border-border/50 bg-secondary/20 overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : fb.id)}
                        className="w-full text-left p-3 flex items-start gap-2"
                      >
                        <MessageSquare size={14} className="text-primary mt-0.5 shrink-0" />
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
                            {fb.status === 'analyzing' && (
                              <Badge variant="secondary" className="text-[10px] h-4 animate-pulse">Analyserar...</Badge>
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
                        {isExpanded && fb.ai_response && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 border-t border-border/50 pt-2">
                              <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                <ReactMarkdown>{fb.ai_response}</ReactMarkdown>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
