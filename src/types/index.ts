export type SizeClass = 'XSmall' | 'Small' | 'Medium' | 'Large';
export type CompetitionLevel = 'Öppen' | 'Mellan' | 'Elite';
export type Gender = 'Hane' | 'Tik';
export type TrainingType = 'Bana' | 'Hinder' | 'Kontakt' | 'Vändning' | 'Distans' | 'Freestyle' | 'Annan';
export type Discipline = 'Agility' | 'Jumping' | 'Hinder';
export type CompetitionStatus = 'planerad' | 'anmäld' | 'bekräftad' | 'genomförd';

export interface Dog {
  id: string;
  name: string;
  breed: string;
  gender: Gender;
  color: string;
  birthdate: string;
  photoUrl?: string;
  sizeClass: SizeClass;
  competitionLevel: CompetitionLevel;
  notes: string;
  themeColor: string;
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  dogId: string;
  date: string;
  durationMin: number;
  type: TrainingType;
  reps: number;
  notesGood: string;
  notesImprove: string;
  dogEnergy: number;
  handlerEnergy: number;
  tags: string[];
  createdAt: string;
}

export interface CompetitionResult {
  id: string;
  dogId: string;
  date: string;
  eventName: string;
  organizer: string;
  discipline: Discipline;
  sizeClass: SizeClass;
  faults: number;
  timeSec: number;
  passed: boolean;
  placement?: number;
  notes: string;
  createdAt: string;
}

export interface PlannedCompetition {
  id: string;
  dogId: string;
  date: string;
  eventName: string;
  location: string;
  signupUrl: string;
  status: CompetitionStatus;
  reminderDaysBefore: number;
  createdAt: string;
}
