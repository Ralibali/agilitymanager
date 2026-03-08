import { Dog, TrainingSession, CompetitionResult, PlannedCompetition } from '@/types';

const KEYS = {
  dogs: 'am_dogs',
  training: 'am_training',
  competitions: 'am_competitions',
  planned: 'am_planned',
  onboarded: 'am_onboarded',
};

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  // Dogs
  getDogs: (): Dog[] => get(KEYS.dogs),
  addDog: (dog: Dog) => { const d = get<Dog>(KEYS.dogs); d.push(dog); set(KEYS.dogs, d); },
  updateDog: (dog: Dog) => { const d = get<Dog>(KEYS.dogs).map(x => x.id === dog.id ? dog : x); set(KEYS.dogs, d); },
  deleteDog: (id: string) => { set(KEYS.dogs, get<Dog>(KEYS.dogs).filter(x => x.id !== id)); },

  // Training
  getTraining: (): TrainingSession[] => get(KEYS.training),
  getTrainingForDog: (dogId: string): TrainingSession[] => get<TrainingSession>(KEYS.training).filter(t => t.dogId === dogId),
  addTraining: (s: TrainingSession) => { const d = get<TrainingSession>(KEYS.training); d.push(s); set(KEYS.training, d); },

  // Competition Results
  getCompetitions: (): CompetitionResult[] => get(KEYS.competitions),
  getCompetitionsForDog: (dogId: string): CompetitionResult[] => get<CompetitionResult>(KEYS.competitions).filter(c => c.dogId === dogId),
  addCompetition: (c: CompetitionResult) => { const d = get<CompetitionResult>(KEYS.competitions); d.push(c); set(KEYS.competitions, d); },

  // Planned Competitions
  getPlanned: (): PlannedCompetition[] => get(KEYS.planned),
  addPlanned: (p: PlannedCompetition) => { const d = get<PlannedCompetition>(KEYS.planned); d.push(p); set(KEYS.planned, d); },
  updatePlanned: (p: PlannedCompetition) => { const d = get<PlannedCompetition>(KEYS.planned).map(x => x.id === p.id ? p : x); set(KEYS.planned, d); },

  // Onboarding
  isOnboarded: (): boolean => localStorage.getItem(KEYS.onboarded) === 'true',
  setOnboarded: () => localStorage.setItem(KEYS.onboarded, 'true'),
};

export function generateId(): string {
  return crypto.randomUUID();
}

const DOG_COLORS = [
  'hsl(221, 79%, 48%)',
  'hsl(16, 100%, 60%)',
  'hsl(152, 60%, 42%)',
  'hsl(270, 60%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(45, 90%, 50%)',
];

export function getNextDogColor(): string {
  const dogs = store.getDogs();
  return DOG_COLORS[dogs.length % DOG_COLORS.length];
}
