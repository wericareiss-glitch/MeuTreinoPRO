/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

export type EquipmentRequirement = 'full_gym' | 'cables_free' | 'dumbbells_only';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleKey: MuscleGroup;
  equip: EquipmentRequirement[];
  profile: string;
  stability: 'Máxima' | 'Alta' | 'Média' | 'Livre';
  target: string;
  bio: string;
  cue: string;
}

export type SplitOption = 
  | 'fullbody' 
  | 'upper_lower' 
  | 'ppl' 
  | 'abcde' 
  | 'upper' 
  | 'lower' 
  | 'push' 
  | 'pull' 
  | 'legs';
export type StrategyOption = 'single' | 'synergy';
export type LevelOption = 'beginner' | 'intermediate' | 'advanced';
export type GenderOption = 'male' | 'female';
export type FocusOption = 'glutes' | 'strength' | 'v_taper' | 'balanced';

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

export interface GeneratedWorkoutRoutine {
  id: string;
  letter: string;
  name: string;
  subtitle: string;
  split: SplitOption;
  muscleGroups: MuscleGroup[];
  items: WorkoutItem[];
  totalSets: number;
  estimatedMinutes: number;
  isCustom?: boolean;
}

export interface RpeScaleOption {
  rpe: string;
  rir: string;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
}

export const RPE_RIR_SCALE: RpeScaleOption[] = [
  { rpe: '10', rir: '0', label: 'RPE 10 · RIR 0 (Falha Máxima)', shortLabel: 'RPE 10 · RIR 0', description: '0 repetições restantes na reserva (falha concêntrica)', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { rpe: '9', rir: '1', label: 'RPE 9 · RIR 1 (Muito Pesado)', shortLabel: 'RPE 9 · RIR 1', description: '1 repetição restante na reserva com boa técnica', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { rpe: '8', rir: '2', label: 'RPE 8 · RIR 2 (Pesado Ótimo)', shortLabel: 'RPE 8 · RIR 2', description: '2 repetições restantes na reserva (estímulo ideal para hipertrofia)', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { rpe: '7', rir: '3', label: 'RPE 7 · RIR 3 (Moderado)', shortLabel: 'RPE 7 · RIR 3', description: '3 repetições restantes na reserva', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { rpe: '6', rir: '4', label: 'RPE 6 · RIR 4 (Leve / Aquecimento)', shortLabel: 'RPE 6 · RIR 4', description: '4 repetições restantes na reserva', badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600/40' },
];

export const rpeToRir = (rpe?: string): string => {
  if (!rpe) return '';
  const val = parseFloat(rpe);
  if (isNaN(val)) return '';
  const rir = Math.max(0, 10 - val);
  return rir.toString();
};

export const rirToRpe = (rir?: string): string => {
  if (!rir) return '';
  const val = parseFloat(rir);
  if (isNaN(val)) return '';
  const rpe = Math.max(6, Math.min(10, 10 - val));
  return rpe.toString();
};

export const getRpeScaleInfo = (rpeValue?: string): RpeScaleOption | undefined => {
  if (!rpeValue) return undefined;
  return RPE_RIR_SCALE.find((item) => item.rpe === rpeValue);
};

export interface SetData {
  weight: string;
  reps: string;
  rpe?: string;
  rir?: string;
  done: boolean;
  timestamp?: number;
}

export type WorkoutLogs = Record<string, SetData>;

export interface WorkoutSessionSummary {
  id: string;
  date: string;
  splitName: string;
  totalSets: number;
  totalVolumeLoadKg: number;
  notes?: string;
  completedExercises: {
    name: string;
    muscleGroup: string;
    sets: { weight: number; reps: number; rpe?: string; rir?: string }[];
  }[];
}

export interface CardioSession {
  id: string;
  date: string;
  durationSeconds: number;
  type: 'esteira' | 'bike' | 'escada' | 'eliptico' | 'corrida_rua' | 'caminhada';
  distanceKm?: number;
  calories?: number;
  avgHeartRate?: number;
  intensity?: 'leve' | 'moderado' | 'intenso' | 'hiit';
  notes?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  password: string;
  weightKg: number;
  heightM: number;
  gender?: GenderOption;
  level?: LevelOption;
  focus?: FocusOption;
  frequency?: number; // 2, 3, 4, 5, 6 days per week
  preferredSplit?: SplitOption;
  exercisesPerMuscle?: 1 | 2; // 1 = 1 exercício por músculo, 2 = Base + Complementar
  weeklyBudget: number; // e.g. 80, 96, 120, 144, 160, 192 sets
  muscleBudgets: Record<MuscleGroup, number>; // sets allocated per muscle group
  isVisitor?: boolean; // Se o atleta entrou como visitante
  createdAt: string;
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
  photoFront?: string; // base64
  photoBack?: string;  // base64
  photoSide?: string;  // base64
  notes?: string;
}

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  suggestedReps: string;
  suggestedRpe: string;
  suggestedRir: string;
  suggestedRestSeconds: number;
  status: 'progress' | 'maintain' | 'deload' | 'baseline';
  reason: string;
  actionText: string;
}
