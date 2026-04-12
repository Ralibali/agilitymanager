import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DogAvatar } from '@/components/DogAvatar';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isToday, isBefore, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarDays, Plus, MapPin, Clock, CheckCircle2, Trash2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Dog } from '@/types';

interface PlannedTraining {
  id: string;
  user_id: string;
  dog_id: string | null;
  title: string;
  description: string;
  date: string;
  time_start: string | null;
  time_end: string | null;
  location: string;
  training_type: string;
  sport: string;
  recurring: string;
  completed: boolean;
}

const TRAINING_TYPES = ['Bana', 'Hinder', 'Kontakt', 'Vändning', 'Distans', 'Freestyle', 'Dirigering', 'Hoop', 'Tunnel', 'Tunna', 'Målgång', 'Kombination', 'Annan'];

interface TrainingCalendarProps {
  dogs: Dog[];
}

export default function TrainingCalendar({ dogs }: TrainingCalendarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<PlannedTraining | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [location, setLocation] = useState('');
  const [trainingType, setTrainingType] = useState('Bana');
  const [sport, setSport] = useState('Agility');
  const [dogId, setDogId] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['planned-training', user?.id, format(monthStart, 'yyyy-MM'), format(addMonths(monthEnd, 1), 'yyyy-MM')],
    queryFn: async () => {
      if (!user) return [];
      const from = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
      const to = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('planned_training')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlannedTraining[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Partial<PlannedTraining>) => {
      const { error } = await supabase.from('planned_training').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-training'] });
      toast.success('Träningspass planerat!');
      resetForm();
      setAddOpen(false);
    },
    onError: () => toast.error('Kunde inte spara'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlannedTraining> & { id: string }) => {
      const { error } = await supabase.from('planned_training').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-training'] });
      toast.success('Uppdaterat!');
      resetForm();
      setEditingSession(null);
    },
    onError: () => toast.error('Kunde inte uppdatera'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planned_training').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-training'] });
      toast.success('Borttaget');
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('planned_training').update({ completed } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planned-training'] }),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTimeStart('');
    setTimeEnd('');
    setLocation('');
    setTrainingType('Bana');
    setSport('Agility');
    setDogId(dogs[0]?.id || '');
  };

  const openAdd = (date?: Date) => {
    resetForm();
    if (date) setSelectedDate(date);
    setDogId(dogs[0]?.id || '');
    setAddOpen(true);
  };

  const openEdit = (s: PlannedTraining) => {
    setEditingSession(s);
    setTitle(s.title);
    setDescription(s.description);
    setTimeStart(s.time_start || '');
    setTimeEnd(s.time_end || '');
    setLocation(s.location);
    setTrainingType(s.training_type);
    setSport(s.sport);
    setDogId(s.dog_id || '');
    setSelectedDate(parseISO(s.date));
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Ange en titel'); return; }
    if (!selectedDate) { toast.error('Välj ett datum'); return; }

    const payload: any = {
      user_id: user!.id,
      dog_id: dogId || null,
      title: title.trim(),
      description: description.trim(),
      date: format(selectedDate, 'yyyy-MM-dd'),
      time_start: timeStart || null,
      time_end: timeEnd || null,
      location: location.trim(),
      training_type: trainingType,
      sport,
    };

    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, ...payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const getSessionsForDate = (date: Date) =>
    sessions.filter(s => isSameDay(parseISO(s.date), date));

  const datesWithSessions = sessions.map(s => parseISO(s.date));

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  const getDog = (id: string | null) => id ? dogs.find(d => d.id === id) : null;

  const sportColor = (sport: string) =>
    sport === 'Hoopers' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-primary/10 text-primary';

  return (
    <Card className="mb-4 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            Träningskalender
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => openAdd(new Date())}>
            <Plus size={14} /> Planera
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-medium capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: sv })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Calendar */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={sv}
          className={cn("p-0 pointer-events-auto")}
          modifiers={{
            hasSession: datesWithSessions,
          }}
          modifiersStyles={{
            hasSession: {
              fontWeight: 700,
              position: 'relative',
            },
          }}
          components={{
            DayContent: ({ date }) => {
              const count = getSessionsForDate(date).length;
              const completed = getSessionsForDate(date).every(s => s.completed) && count > 0;
              return (
                <div className="relative flex flex-col items-center">
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 rounded-full",
                            completed ? "bg-green-500" : "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          }}
        />

        {/* Selected date sessions */}
        {selectedDate && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                {isToday(selectedDate) ? 'Idag' : format(selectedDate, 'EEEE d MMMM', { locale: sv })}
              </h4>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openAdd(selectedDate)}>
                <Plus size={12} /> Lägg till
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {selectedDateSessions.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground text-center py-4"
                >
                  Inga planerade pass. Tryck + för att lägga till.
                </motion.p>
              ) : (
                <div className="space-y-2">
                  {selectedDateSessions.map((s, i) => {
                    const dog = getDog(s.dog_id);
                    const isPast = isBefore(parseISO(s.date), new Date()) && !isToday(parseISO(s.date));
                    return (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          "p-3 rounded-lg border border-border/50 bg-secondary/30",
                          s.completed && "opacity-70"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={s.completed}
                            onCheckedChange={(checked) =>
                              toggleComplete.mutate({ id: s.id, completed: !!checked })
                            }
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className={cn("text-sm font-semibold", s.completed && "line-through text-muted-foreground")}>
                                {s.title}
                              </h5>
                              <div className="flex items-center gap-1">
                                <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-secondary">
                                  <Edit2 size={12} className="text-muted-foreground" />
                                </button>
                                <button onClick={() => deleteMutation.mutate(s.id)} className="p-1 rounded hover:bg-destructive/10">
                                  <Trash2 size={12} className="text-destructive" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="secondary" className={cn("text-[10px] h-4", sportColor(s.sport))}>
                                {s.sport}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {s.training_type}
                              </Badge>
                              {dog && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <DogAvatar dog={dog} size="xs" /> {dog.name}
                                </span>
                              )}
                            </div>
                            {s.time_start && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock size={10} /> {s.time_start?.slice(0, 5)}{s.time_end ? ` – ${s.time_end.slice(0, 5)}` : ''}
                              </p>
                            )}
                            {s.location && (
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <MapPin size={10} /> {s.location}
                              </p>
                            )}
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                            )}
                            {s.completed && (
                              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Genomfört
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={addOpen || !!editingSession} onOpenChange={(o) => {
          if (!o) { setAddOpen(false); setEditingSession(null); resetForm(); }
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingSession ? 'Redigera träningspass' : 'Planera träningspass'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Titel *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T.ex. Kontaktträning" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">Datum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                      <CalendarDays size={14} className="mr-2" />
                      {selectedDate ? format(selectedDate, 'PPP', { locale: sv }) : 'Välj datum'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={sv}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Starttid</Label>
                  <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Sluttid</Label>
                  <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="mt-1" />
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
                <div>
                  <Label className="text-xs">Typ</Label>
                  <Select value={trainingType} onValueChange={setTrainingType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRAINING_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

              <div>
                <Label className="text-xs">Plats</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="T.ex. Klubbhallen" className="mt-1" />
              </div>

              <div>
                <Label className="text-xs">Anteckningar</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vad ska fokus vara?" className="mt-1" rows={2} />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={addMutation.isPending || updateMutation.isPending}>
                {editingSession ? 'Spara ändringar' : 'Planera pass'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
