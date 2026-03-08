import { Tables, Enums } from '@/integrations/supabase/types';

// DB row types
export type Dog = Tables<'dogs'>;
export type TrainingSession = Tables<'training_sessions'>;
export type CompetitionResult = Tables<'competition_results'>;
export type PlannedCompetition = Tables<'planned_competitions'>;
export type Profile = Tables<'profiles'>;

// Enum types from DB
export type SizeClass = Enums<'size_class'>;
export type CompetitionLevel = Enums<'competition_level'>;
export type Gender = Enums<'dog_gender'>;
export type TrainingType = Enums<'training_type'>;
export type Discipline = Enums<'discipline'>;
export type CompetitionStatus = Enums<'competition_status'>;
