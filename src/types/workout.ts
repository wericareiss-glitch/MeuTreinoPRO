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
export type PeriodizationStrategy = 'hypertrophy' | 'strength' | 'metabolic';
export type LevelOption = 'beginner' | 'intermediate' | 'advanced';
export type GenderOption = 'male' | 'female';
export type FocusOption = 'glutes' | 'strength' | 'v_taper' | 'balanced';

export interface PeriodizationPhaseConfig {
  id: PeriodizationStrategy;
  label: string;
  shortLabel: string;
  repRange: string;
  repBadge: string;
  restRecommended: number;
  intensityPct: string;
  stimulus: string;
}

export const PERIODIZATION_PHASES: Record<PeriodizationStrategy, PeriodizationPhaseConfig> = {
  strength: {
    id: 'strength',
    label: 'Fase de Força Pura',
    shortLabel: 'Força',
    repRange: '3-5',
    repBadge: '3-5 reps',
    restRecommended: 120,
    intensityPct: '85–92% 1RM',
    stimulus: 'Tensão Neural & Recrutamento Miofibrilar Máximo',
  },
  hypertrophy: {
    id: 'hypertrophy',
    label: 'Fase de Hipertrofia',
    shortLabel: 'Hipertrofia',
    repRange: '8-12',
    repBadge: '8-12 reps',
    restRecommended: 75,
    intensityPct: '70–80% 1RM',
    stimulus: 'Tensão Mecânica Ótima & Volume Efetivo',
  },
  metabolic: {
    id: 'metabolic',
    label: 'Fase Metabólica',
    shortLabel: 'Metabólico',
    repRange: '15+',
    repBadge: '15+ reps',
    restRecommended: 45,
    intensityPct: '55–65% 1RM',
    stimulus: 'Estresse Metabólico, Pump & Densidade Sarcoplasmática',
  },
};

export type SetIntensityType = 'W' | 'T' | 'F' | 'D' | 'RP';

export interface SetIntensityOption {
  code: SetIntensityType;
  shortLabel: string;
  label: string;
  description: string;
  badgeClass: string;
}

export const SET_INTENSITY_TYPES: SetIntensityOption[] = [
  {
    code: 'W',
    shortLabel: 'W',
    label: 'Aquecimento (W)',
    description: 'Série preparatória de ativação articular/neural (não contabiliza como série de trabalho até a falha)',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  },
  {
    code: 'T',
    shortLabel: 'T',
    label: 'Série de Trabalho (T)',
    description: 'Série principal de trabalho dentro da faixa alvo de repetições',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  {
    code: 'F',
    shortLabel: 'F',
    label: 'Falha Concêntrica (F)',
    description: 'Série levada até a falha muscular momentânea concêntrica',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  {
    code: 'D',
    shortLabel: 'D',
    label: 'Drop-set (D)',
    description: 'Redução imediata de 20-30% da carga sem descanso para prolongar o tempo sob tensão',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  {
    code: 'RP',
    shortLabel: 'RP',
    label: 'Rest-Pause / Myo-Reps (RP)',
    description: 'Pausa curta de 10-20s após a falha seguida de mini-séries extras com a mesma carga',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
];

export interface WorkoutItem {
  id: string;
  muscleKey: MuscleGroup;
  exercise: Exercise;
  sets: number;
  reps: string;
  rir?: string;
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
  periodizationStrategy?: PeriodizationStrategy;
  version?: number;
  createdAt?: string;
}

export interface SetData {
  weight: string;
  reps: string;
  setType?: SetIntensityType;
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
    muscleKey?: MuscleGroup;
    muscleGroup: string;
    sets: { weight: number; reps: number }[];
  }[];
  updatedAt?: string;
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

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
export type NutritionGoal = 'cutting' | 'cutting_aggressive' | 'maintenance' | 'bulking_clean' | 'bulking_aggressive';

export interface NutritionPlan {
  tmb: number; // Taxa Metabólica Basal
  tdee: number; // Gasto Energético Total
  targetCalories: number;
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  age: number;
  bodyFatPercent?: number;
  proteinGrams: number;
  proteinPerKg: number;
  carbsGrams: number;
  fatsGrams: number;
  fatsPerKg: number;
  waterMl: number;
  calculatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email?: string;
  password: string;
  weightKg: number;
  heightM: number;
  age?: number;
  bodyFatPercent?: number;
  gender?: GenderOption;
  level?: LevelOption;
  focus?: FocusOption;
  periodizationStrategy?: PeriodizationStrategy;
  frequency?: number; // 2, 3, 4, 5, 6 days per week
  preferredSplit?: SplitOption;
  exercisesPerMuscle?: 1 | 2; // 1 = 1 exercício por músculo, 2 = Base + Complementar
  weeklyBudget: number; // e.g. 80, 96, 120, 144, 160, 192 sets
  muscleBudgets: Record<MuscleGroup, number>; // sets allocated per muscle group
  nutritionPlan?: NutritionPlan;
  isVisitor?: boolean; // Se o atleta entrou como visitante
  createdAt: string;
  updatedAt?: string;
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
  bodyFatPercent?: number;
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
  suggestedRestSeconds: number;
  status: 'progress' | 'maintain' | 'deload' | 'baseline';
  reason: string;
  actionText: string;
}
