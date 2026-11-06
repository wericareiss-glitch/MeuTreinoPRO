import { describe, it, expect } from 'vitest';
import { analyzeFatigueAndDeload } from '../deloadEngine';
import { UserProfile, WorkoutSessionSummary } from '../../types/workout';

describe('deloadEngine', () => {
  const baseUser: UserProfile = {
    id: 'user-1',
    username: 'atleta_teste',
    name: 'Atleta Teste',
    password: '',
    level: 'intermediate',
    frequency: 4,
    preferredSplit: 'ppl',
    focus: 'balanced',
    weeklyBudget: 80,
    muscleBudgets: {
      quadriceps: 16,
      hamstrings: 12,
      glutes: 12,
      chest: 14,
      back: 16,
      shoulders: 14,
      rear_delts: 10,
      triceps: 10,
      biceps: 10,
      calves: 10,
      abs: 8,
    },
    gender: 'male',
    age: 26,
    weightKg: 80,
    heightM: 1.80,
    createdAt: '2026-01-01T00:00:00Z',
  };

  describe('analyzeFatigueAndDeload', () => {
    it('returns low fatigue score and no deload recommendation for fresh sessions within volume limits', () => {
      const weeklySets = {
        chest: 12,
        back: 14,
        quadriceps: 14,
      };

      const result = analyzeFatigueAndDeload(baseUser, [], weeklySets);

      expect(result.recommendDeload).toBe(false);
      expect(result.mrvExceededMuscles).toHaveLength(0);
      expect(result.fatigueScore).toBeLessThan(65);
    });

    it('identifies muscles exceeding MRV and adds fatigue score', () => {
      // Intermediate chest MRV is 20, intermediate quadriceps MRV is 22
      const weeklySets = {
        chest: 24, // Exceeds 20
        quadriceps: 26, // Exceeds 22
      };

      const result = analyzeFatigueAndDeload(baseUser, [], weeklySets);

      expect(result.mrvExceededMuscles).toContain('chest');
      expect(result.mrvExceededMuscles).toContain('quadriceps');
      // 2 muscles exceeding MRV immediately triggers deload recommendation
      expect(result.recommendDeload).toBe(true);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('detects high RPE 9-10 density (> 45% of sets) in recent sessions', () => {
      const heavySession: WorkoutSessionSummary = {
        id: 's-heavy',
        splitName: 'Treino Intenso',
        date: new Date().toISOString(),
        totalVolumeLoadKg: 8000,
        totalSets: 5,
        completedExercises: [
          {
            name: 'Supino',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [
              { weight: 100, reps: 6, rpe: '10' },
              { weight: 100, reps: 6, rpe: '9' },
              { weight: 100, reps: 5, rpe: '9' },
              { weight: 90, reps: 6, rpe: '9' },
              { weight: 90, reps: 6, rpe: '8' },
            ],
          },
        ],
      };

      const result = analyzeFatigueAndDeload(baseUser, [heavySession], {});

      expect(result.highRpeSetsCount).toBe(4); // 4 out of 5 sets with RPE >= 9 (80%)
      expect(result.fatigueScore).toBeGreaterThanOrEqual(45); // baseline 20 + 25
      expect(result.reasons.some((r) => r.includes('RPE 9-10'))).toBe(true);
    });
  });
});
