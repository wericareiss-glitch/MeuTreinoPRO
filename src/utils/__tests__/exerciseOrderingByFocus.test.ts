import { describe, it, expect } from 'vitest';
import {
  sortWorkoutItemsByFocusAndAnatomy,
  generateWeeklyRoutines,
  MUSCLE_TO_ZONE,
  getSplitDisplayName,
} from '../routineGenerator';
import { MuscleGroup, WorkoutItem, UserProfile } from '../../types/workout';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';

describe('Exercise Ordering by Focus & Anatomical Gym Zones', () => {
  const createMockItem = (muscleKey: MuscleGroup, exerciseName: string): WorkoutItem => {
    const list = EXERCISE_DATABASE[muscleKey] || [];
    const exercise = list.find((e: { name: string }) => e.name.includes(exerciseName)) || list[0] || {
      id: `${muscleKey}_mock`,
      name: exerciseName,
      category: 'Geral',
      muscle: muscleKey,
      equip: 'full_gym',
      profile: 'Alongamento',
    };
    return {
      id: `item_${muscleKey}_${Math.random()}`,
      muscleKey,
      exercise: exercise as any,
      sets: 3,
      reps: '8 a 12',
      rest: 60,
    };
  };

  it('keeps all leg exercises completely contiguous without walking back and forth', () => {
    // Scrambled items simulating the old behavior (perna, peito, costa, ombro, posterior, bracos, panturrilha)
    const scrambledItems: WorkoutItem[] = [
      createMockItem('quadriceps', 'Agachamento Hack'),
      createMockItem('chest', 'Supino Reto com Barra'),
      createMockItem('back', 'Remada Curvada'),
      createMockItem('shoulders', 'Desenvolvimento'),
      createMockItem('hamstrings', 'Mesa Flexora'),
      createMockItem('biceps', 'Rosca Direta'),
      createMockItem('triceps', 'Tríceps Corda'),
      createMockItem('glutes', 'Elevação Pélvica'),
      createMockItem('calves', 'Panturrilha em Pé'),
    ];

    const sorted = sortWorkoutItemsByFocusAndAnatomy(scrambledItems, 'balanced');

    // Extract the sequence of zones
    const zoneSequence = sorted.map((item) => MUSCLE_TO_ZONE[item.muscleKey]);

    // Verify all 'legs' exercises appear in one uninterrupted block
    const firstLegIdx = zoneSequence.indexOf('legs');
    const lastLegIdx = zoneSequence.lastIndexOf('legs');
    const legCount = zoneSequence.filter((z) => z === 'legs').length;

    // The length of the slice from first to last leg index must equal the count of leg items
    expect(lastLegIdx - firstLegIdx + 1).toBe(legCount);

    // Specifically: quadriceps, hamstrings, glutes, calves are all together
    const legItems = sorted.slice(firstLegIdx, lastLegIdx + 1);
    const legMuscles = legItems.map((i) => i.muscleKey);
    expect(legMuscles).toContain('quadriceps');
    expect(legMuscles).toContain('hamstrings');
    expect(legMuscles).toContain('glutes');
    expect(legMuscles).toContain('calves');
  });

  it('starts with glutes and all leg muscles when focus is glutes', () => {
    const items: WorkoutItem[] = [
      createMockItem('chest', 'Supino'),
      createMockItem('glutes', 'Elevação Pélvica'),
      createMockItem('back', 'Puxada Alta'),
      createMockItem('hamstrings', 'Stiff'),
      createMockItem('quadriceps', 'Leg Press'),
      createMockItem('calves', 'Panturrilha'),
    ];

    const sorted = sortWorkoutItemsByFocusAndAnatomy(items, 'glutes');

    // First muscle must be glutes
    expect(sorted[0].muscleKey).toBe('glutes');
    // Followed by hamstrings, quadriceps, calves
    expect(sorted[1].muscleKey).toBe('hamstrings');
    expect(sorted[2].muscleKey).toBe('quadriceps');
    expect(sorted[3].muscleKey).toBe('calves');

    // Only after all legs are finished, upper body exercises appear
    expect(['back', 'chest']).toContain(sorted[4].muscleKey);
    expect(['back', 'chest']).toContain(sorted[5].muscleKey);
  });

  it('starts with back and shoulders when focus is v_taper and finishes with legs', () => {
    const items: WorkoutItem[] = [
      createMockItem('quadriceps', 'Agachamento'),
      createMockItem('chest', 'Supino'),
      createMockItem('back', 'Puxada Alta'),
      createMockItem('shoulders', 'Elevação Lateral'),
      createMockItem('calves', 'Panturrilha'),
    ];

    const sorted = sortWorkoutItemsByFocusAndAnatomy(items, 'v_taper');

    // Upper body (back/shoulders) comes first
    expect(sorted[0].muscleKey).toBe('back');
    expect(sorted[1].muscleKey).toBe('shoulders');
    expect(sorted[2].muscleKey).toBe('chest');

    // Legs come together at the end
    expect(sorted[3].muscleKey).toBe('quadriceps');
    expect(sorted[4].muscleKey).toBe('calves');
  });

  it('generateWeeklyRoutines produces contiguous leg and upper body blocks in Full Body', () => {
    const mockUser: UserProfile = {
      id: 'test_u',
      username: 'test',
      password: '',
      name: 'Atleta Teste',
      weightKg: 75,
      heightM: 1.75,
      gender: 'male',
      level: 'intermediate',
      focus: 'balanced',
      frequency: 3,
      preferredSplit: 'fullbody',
      weeklyBudget: 60,
      muscleBudgets: {} as any,
      createdAt: new Date().toISOString(),
    };

    const routines = generateWeeklyRoutines({
      user: mockUser,
      split: 'fullbody',
    });

    expect(routines.length).toBe(3);

    routines.forEach((routine) => {
      const zones = routine.items.map((it) => MUSCLE_TO_ZONE[it.muscleKey]);
      const firstLegIdx = zones.indexOf('legs');
      const lastLegIdx = zones.lastIndexOf('legs');
      const legCount = zones.filter((z) => z === 'legs').length;

      if (legCount > 0) {
        // Legs must be 100% contiguous with zero intervening upper body exercises
        expect(lastLegIdx - firstLegIdx + 1).toBe(legCount);
      }
    });

    // Validates new routine naming format: "Treino [Nome do Split] [Letra]"
    expect(routines[0].name).toBe('Treino Fullbody A');
    expect(routines[1].name).toBe('Treino Fullbody B');
    expect(routines[2].name).toBe('Treino Fullbody C');
  });

  it('correctly names ABCDE routines as Treino ABCDE [Letra]', () => {
    const mockUser: UserProfile = {
      id: 'test_u_abcde',
      username: 'atleta_abcde',
      password: 'password123',
      name: 'Atleta ABCDE',
      gender: 'male',
      weightKg: 75,
      heightM: 1.75,
      level: 'intermediate',
      focus: 'balanced',
      frequency: 5,
      preferredSplit: 'abcde',
      weeklyBudget: 80,
      muscleBudgets: {} as any,
      createdAt: new Date().toISOString(),
    };

    const routines = generateWeeklyRoutines({
      user: mockUser,
      split: 'abcde',
    });

    expect(routines.length).toBe(5);
    expect(routines[0].name).toBe('Treino A');
    expect(routines[1].name).toBe('Treino B');
    expect(routines[2].name).toBe('Treino C');
    expect(routines[3].name).toBe('Treino D');
    expect(routines[4].name).toBe('Treino E');
  });
});
