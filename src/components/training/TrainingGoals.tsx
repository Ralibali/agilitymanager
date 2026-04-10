import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Dog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { DogAvatar } from '@/components/DogAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trophy, Dumbbell, Brain, Zap, ChevronDown, ChevronUp, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface Goal {
  id: string;
  user_id: string;
  dog_id: string;
  title: string;
  description: string;
  category: string;
  target_date: string | null;
  status: string;
  created_at: string;
  milestones?: Milestone[];
}

interface Milestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'technique', label: 'Teknik', icon: Brain },
  { value: 'competition', label: 'Tävling', icon: Trophy },
  { value: 'fitness', label: 'Kondition', icon: Dumbbell },
  { value: 'speed', label: 'Snabbhet', icon: Zap },
  { value: 'other', label: 'Övrigt', icon: Target },
];

function getCategoryIcon(cat: string) {
  const c = CATEGORIES.find(c => c.value === cat);
  return c ? c.icon : Target;
}

function getCategoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

interface TrainingGoalsProps {
  dogs: Dog[];
}

export default function TrainingGoals({ dogs }: TrainingGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New goal form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('technique');
  const [newDogId, setNewDogId] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newMilestones, setNewMilestones] = useState<string[]>(['']);

  const fetchGoals = async () => {
    const { data: goalsData } = await supabase
      .from('training_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!goalsData) { setLoading(false); return; }

    const { data: milestonesData } = await supabase
      .from('training_milestones')
      .select('*')
      .order('sort_order', { ascending: true });

    const enriched = goalsData.map((g: any) => ({
      ...g,
      milestones: (milestonesData || []).filter((m: any) => m.goal_id === g.id),
    }));

    setGoals(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleAddGoal = async () => {
    if (!newTitle.trim() || !newDogId) {
      toast.error('Fyll i titel och välj hund');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goal, error } = await supabase.from('training_goals').insert({
      user_id: user.id,
      dog_id: newDogId,
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      target_date: newTargetDate || null,
    }).select().single();

    if (error || !goal) {
      toast.error('Kunde inte skapa mål');
      return;
    }

    const milestoneRows = newMilestones
      .filter(m => m.trim())
      .map((m, i) => ({
        goal_id: goal.id,
        user_id: user.id,
        title: m.trim(),
        sort_order: i,
      }));

    if (milestoneRows.length > 0) {
      await supabase.from('training_milestones').insert(milestoneRows);
    }

    toast.success('Mål skapat!');
    setDialogOpen(false);
    setNewTitle('');
    setNewDesc('');
    setNewCategory('technique');
    setNewDogId('');
    setNewTargetDate('');
    setNewMilestones(['']);
    fetchGoals();
  };

  const toggleMilestone = async (milestone: Milestone) => {
    const newCompleted = !milestone.completed;
    await supabase.from('training_milestones').update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq('id', milestone.id);
    fetchGoals();
  };

  const completeGoal = async (goalId: string) => {
    await supabase.from('training_goals').update({ status: 'completed' }).eq('id', goalId);
    toast.success('🎉 Mål uppnått!');
    fetchGoals();
  };

  const deleteGoal = async (goalId: string) => {
    await supabase.from('training_goals').delete().eq('id', goalId);
    toast.success('Mål borttaget');
    fetchGoals();
  };

  if (loading) return null;

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-foreground flex items-center gap-2">
          <Target size={18} /> Träningsmål
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus size={14} /> Nytt mål</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Skapa träningsmål</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-foreground">Hund</label>
                <Select value={newDogId} onValueChange={setNewDogId}>
                  <SelectTrigger><SelectValue placeholder="Välj hund" /></SelectTrigger>
                  <SelectContent>
                    {dogs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Titel</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="T.ex. Klara K2 Agility" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Beskrivning</label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Beskriv ditt mål..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Kategori</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Måldatum</label>
                  <Input type="date" value={newTargetDate} onChange={e => setNewTargetDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Milstolpar</label>
                <div className="space-y-2 mt-1">
                  {newMilestones.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={m}
                        onChange={e => {
                          const copy = [...newMilestones];
                          copy[i] = e.target.value;
                          setNewMilestones(copy);
                        }}
                        placeholder={`Steg ${i + 1}`}
                      />
                      {newMilestones.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => setNewMilestones(newMilestones.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setNewMilestones([...newMilestones, ''])} className="gap-1">
                    <Plus size={12} /> Lägg till steg
                  </Button>
                </div>
              </div>
              <Button onClick={handleAddGoal} className="w-full">Skapa mål</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Target size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Inga träningsmål ännu. Skapa ditt första!</p>
        </div>
      )}

      <AnimatePresence>
        {activeGoals.map((goal, i) => {
          const dog = dogs.find(d => d.id === goal.dog_id);
          const milestones = goal.milestones || [];
          const completed = milestones.filter(m => m.completed).length;
          const total = milestones.length;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          const expanded = expandedGoal === goal.id;
          const Icon = getCategoryIcon(goal.category);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                {dog && <DogAvatar dog={dog} size="sm" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-primary" />
                      <h3 className="font-display font-semibold text-foreground text-sm">{goal.title}</h3>
                    </div>
                    <button onClick={() => setExpandedGoal(expanded ? null : goal.id)} className="p-1">
                      {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {getCategoryLabel(goal.category)}
                    </span>
                    {dog && <span className="text-[10px] text-muted-foreground">{dog.name}</span>}
                    {goal.target_date && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Calendar size={10} /> {format(new Date(goal.target_date), 'd MMM yyyy', { locale: sv })}
                      </span>
                    )}
                  </div>

                  {total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{completed}/{total} klara</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2"
                    >
                      {goal.description && (
                        <p className="text-xs text-muted-foreground">{goal.description}</p>
                      )}

                      {milestones.map(m => (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer group">
                          <Checkbox
                            checked={m.completed}
                            onCheckedChange={() => toggleMilestone(m)}
                          />
                          <span className={`text-xs ${m.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {m.title}
                          </span>
                        </label>
                      ))}

                      <div className="flex gap-2 pt-2">
                        {progress === 100 && (
                          <Button size="sm" variant="default" className="gap-1 text-xs" onClick={() => completeGoal(goal.id)}>
                            <Trophy size={12} /> Markera som uppnått
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 size={12} /> Ta bort
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uppnådda mål</h3>
          {completedGoals.map(goal => {
            const dog = dogs.find(d => d.id === goal.dog_id);
            return (
              <div key={goal.id} className="bg-card/50 rounded-xl p-3 opacity-70">
                <div className="flex items-center gap-2">
                  {dog && <DogAvatar dog={dog} size="sm" />}
                  <div>
                    <h4 className="text-sm font-medium text-foreground line-through">{goal.title}</h4>
                    <span className="text-[10px] text-success">✓ Uppnått</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
