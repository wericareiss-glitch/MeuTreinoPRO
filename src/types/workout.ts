export type MuscleGroup = 
  | 'quadriceps' 
  | 'hamstrings' 
  | 'glutes' 
  | 'calves' 
  | 'chest' 
  | 'back' 
  | 'shoulders' 
  | 'rear_delts' 
  | 'triceps' 
  | 'biceps' 
  | 'abs';

export type SplitOption = 'fullbody' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'abcde' | 'upper_lower' | 'ppl';
export type StrategyOption = 'single' | 'synergy';
export type LevelOption = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentRequirement = 'full_gym' | 'cables_free' | 'dumbbells_only';
export type GenderOption = 'male' | 'female';
export type FocusOption = 'glutes' | 'strength' | 'v_taper' | 'balanced';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleKey: MuscleGroup;
  equip: string[];
  profile: string;
  stability: string;
  target: string;
  bio: string;
  cue: string;
}

export interface WorkoutItem {
  id: string;
  muscleKey: MuscleGroup;
  exercise: Exercise;
  sets: number;
  reps: string;
  rir: string;
  rest: number;
  tagRole?: string;
}

export interface SetLog {
  weight: string;
  reps: string;
  rpe?: string;
  rir?: string;
  done: boolean;
  timestamp?: number;
}

export type WorkoutLogs = Record<string, SetLog>;

export interface CompletedExerciseSummary {
  name: string;
  muscleGroup: string;
  sets: { weight: number; reps: number; rpe?: string }[];
}

export interface WorkoutSessionSummary {
  id: string;
  date: string;
  splitName: string;
  totalSets: number;
  totalVolumeLoadKg: number;
  notes?: string;
  completedExercises: CompletedExerciseSummary[];
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  calvesCm?: number;
  hipsCm?: number;
  photoFront?: string;
  photoBack?: string;
  photoSide?: string;
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  weightKg: number;
  heightM: number;
  gender: GenderOption;
  level: LevelOption;
  focus: FocusOption;
  frequency: number;
  preferredSplit: SplitOption;
  exercisesPerMuscle: 1 | 2;
  weeklyBudget: number;
  muscleBudgets: Record<MuscleGroup, number>;
}

export interface GeneratedWorkoutRoutine {
  id: string;
  letter: string;
  name: string;
  subtitle: string;
  split: SplitOption;
  items: WorkoutItem[];
}

export function rpeToRir(rpe: string): string {
  const val = parseFloat(rpe);
  if (isNaN(val)) return '';
  if (val >= 10) return '0';
  if (val >= 9) return '1';
  if (val >= 8) return '2';
  if (val >= 7) return '3';
  return '4';
}

export function rirToRpe(rir: string): string {
  const val = parseInt(rir, 10);
  if (isNaN(val)) return '';
  if (val === 0) return '10';
  if (val === 1) return '9';
  if (val === 2) return '8';
  if (val === 3) return '7';
  return '6';
}
