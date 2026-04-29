import { supabase } from '@/integrations/supabase/client';
import type { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export const store = {
  // Dogs
  getDogs: async (): Promise<Dog[]> => {
    const { data } = await supabase.from('dogs').select('*').order('created_at', { ascending: true });
    return data || [];
  },
  addDog: async (dog: Omit<Dog, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Dog | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('dogs').insert({ ...dog, user_id: userId }).select().single();
    return data;
  },
  updateDog: async (id: string, updates: Partial<Dog>) => {
    await supabase.from('dogs').update(updates).eq('id', id);
  },
  deleteDog: async (id: string) => {
    await supabase.from('dogs').delete().eq('id', id);
  },

  // Training
  getTraining: async (): Promise<TrainingSession[]> => {
    const { data } = await supabase.from('training_sessions').select('*').order('date', { ascending: false });
    return data || [];
  },
  getTrainingForDog: async (dogId: string): Promise<TrainingSession[]> => {
    const { data } = await supabase.from('training_sessions').select('*').eq('dog_id', dogId).order('date', { ascending: false });
    return data || [];
  },
  addTraining: async (session: Omit<TrainingSession, 'id' | 'user_id' | 'created_at'>): Promise<TrainingSession | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('training_sessions').insert({ ...session, user_id: userId }).select().single();
    return data;
  },

  // Competition Results
  getCompetitions: async (): Promise<CompetitionResult[]> => {
    const { data } = await supabase.from('competition_results').select('*').order('date', { ascending: false });
    return data || [];
  },
  getCompetitionsForDog: async (dogId: string): Promise<CompetitionResult[]> => {
    const { data } = await supabase.from('competition_results').select('*').eq('dog_id', dogId).order('date', { ascending: false });
    return data || [];
  },
  addCompetition: async (result: Omit<CompetitionResult, 'id' | 'user_id' | 'created_at'>): Promise<CompetitionResult | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('competition_results').insert({ ...result, user_id: userId }).select().single();
    return data;
  },

  // Planned Competitions
  getPlanned: async (): Promise<PlannedCompetition[]> => {
    const { data } = await supabase.from('planned_competitions').select('*').order('date', { ascending: true });
    return data || [];
  },
  addPlanned: async (p: Omit<PlannedCompetition, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PlannedCompetition | null> => {
    const userId = await getUserId();
    const { data } = await supabase.from('planned_competitions').insert({ ...p, user_id: userId }).select().single();
    return data;
  },
  updatePlanned: async (id: string, updates: Partial<PlannedCompetition>) => {
    await supabase.from('planned_competitions').update(updates).eq('id', id);
  },
};

const DOG_COLORS = [
  'hsl(221, 79%, 48%)',
  'hsl(16, 100%, 60%)',
  'hsl(152, 60%, 42%)',
  'hsl(270, 60%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(45, 90%, 50%)',
];

export async function getNextDogColor(): Promise<string> {
  const dogs = await store.getDogs();
  return DOG_COLORS[dogs.length % DOG_COLORS.length];
}
