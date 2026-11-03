import { GeneratedWorkoutRoutine, WorkoutItem, UserProfile, SplitOption, StrategyOption, LevelOption, EquipmentRequirement, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE, SPLIT_MUSCLES } from '../data/exerciseDatabase';

interface GenerateParams {
  user: UserProfile;
  split: SplitOption;
  strategy: StrategyOption;
  exercisesPerMuscle: 1 | 2;
  manualWeeklySets: number;
  level: LevelOption;
  equip: EquipmentRequirement;
  restSeconds: number;
}

export function generateWeeklyRoutines(params: GenerateParams): GeneratedWorkoutRoutine[] {
  const { split, strategy, exercisesPerMuscle, level, equip, restSeconds } = params;
  const muscleKeys = SPLIT_MUSCLES[split] || SPLIT_MUSCLES.upper;

  const routineItems: WorkoutItem[] = [];

  muscleKeys.forEach((mKey) => {
    const pool = (EXERCISE_DATABASE[mKey] || []).filter((ex) => {
      if (equip === 'dumbbells_only') return ex.equip.includes('dumbbells_only');
      if (equip === 'cables_free') return ex.equip.includes('dumbbells_only') || ex.equip.includes('cables_free');
      return true;
    });

    const finalPool = pool.length > 0 ? pool : (EXERCISE_DATABASE[mKey] || []);
    if (finalPool.length === 0) return;

    const setsCount = level === 'beginner' ? 3 : level === 'intermediate' ? 3 : 4;
    const repRange = level === 'advanced' ? '6 a 8' : '8 a 10';
    const rir = level === 'beginner' ? 'RIR 2' : level === 'intermediate' ? 'RIR 1-2' : 'RIR 0-1';

    if (exercisesPerMuscle === 1 || strategy === 'single') {
      const chosen = finalPool[0];
      routineItems.push({
        id: `${mKey}_${chosen.id}_${Date.now()}`,
        muscleKey: mKey,
        exercise: chosen,
        sets: setsCount,
        reps: repRange,
        rir,
        rest: restSeconds || 90,
        tagRole: 'Principal / Base',
      });
    } else {
      let stretchEx = finalPool.find((e) => e.profile.toLowerCase().includes('alongamento')) || finalPool[0];
      let shortEx = finalPool.find((e) => e.id !== stretchEx.id && (e.profile.toLowerCase().includes('encurtamento') || e.profile.toLowerCase().includes('contínua'))) || (finalPool[1] || stretchEx);

      routineItems.push({
        id: `${mKey}_${stretchEx.id}_${Date.now()}_1`,
        muscleKey: mKey,
        exercise: stretchEx,
        sets: 3,
        reps: '8 a 10',
        rir,
        rest: restSeconds || 90,
        tagRole: 'Alongamento / Base',
      });

      if (shortEx.id !== stretchEx.id) {
        routineItems.push({
          id: `${mKey}_${shortEx.id}_${Date.now()}_2`,
          muscleKey: mKey,
          exercise: shortEx,
          sets: 3,
          reps: '10 a 12',
          rir: 'RIR 0-1',
          rest: restSeconds || 75,
          tagRole: 'Encurtamento / Pico',
        });
      }
    }
  });

  const routines: GeneratedWorkoutRoutine[] = [
    {
      id: `routine_a_${Date.now()}`,
      letter: 'A',
      name: `Treino Biomecânico - ${split.toUpperCase()}`,
      subtitle: `Foco em Hipertrofia & Sobrecarga (${exercisesPerMuscle === 1 ? '1 ex/músculo' : 'Base + Complementar'})`,
      split,
      items: routineItems,
    },
  ];

  return routines;
}
