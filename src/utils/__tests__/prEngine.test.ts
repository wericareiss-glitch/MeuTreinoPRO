import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  getExerciseHistoricalPR,
  checkSetPR,
  extractSessionPRs,
} from '../prEngine';
import { WorkoutSessionSummary } from '../../types/workout';

describe('prEngine', () => {
  describe('estimate1RM', () => {
    it('returns 0 for non-positive weight or reps', () => {
      expect(estimate1RM(0, 10)).toBe(0);
      expect(estimate1RM(100, 0)).toBe(0);
      expect(estimate1RM(-50, 5)).toBe(0);
    });

    it('returns exact weight for 1 rep', () => {
      expect(estimate1RM(100, 1)).toBe(100);
      expect(estimate1RM(82.5, 1)).toBe(82.5);
    });

    it('calculates 1RM using Brzycki formula for multiple reps', () => {
      // 100kg x 10 reps -> 100 * (36 / (37 - 10)) = 100 * 36 / 27 = 133.3
      const oneRM = estimate1RM(100, 10);
      expect(oneRM).toBe(133.3);
    });

    it('caps safe reps at 30 to prevent division by zero or negative values', () => {
      const oneRM = estimate1RM(50, 35);
      // caps at 30: 50 * (36 / 7) = 257.1
      expect(oneRM).toBe(257.1);
    });
  });

  describe('getExerciseHistoricalPR', () => {
    const mockSessions: WorkoutSessionSummary[] = [
      {
        id: 'sess-1',
        splitName: 'Treino A',
        date: '2026-03-01T10:00:00Z',
        totalVolumeLoadKg: 10000,
        totalSets: 15,
        completedExercises: [
          {
            name: 'Supino Reto',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [
              { weight: 80, reps: 10 },
              { weight: 90, reps: 8 },
            ],
          },
        ],
      },
      {
        id: 'sess-2',
        splitName: 'Treino A2',
        date: '2026-03-08T10:00:00Z',
        totalVolumeLoadKg: 11000,
        totalSets: 15,
        completedExercises: [
          {
            name: 'Supino Reto',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [
              { weight: 100, reps: 6 },
            ],
          },
        ],
      },
    ];

    it('extracts maximum weight and best 1RM across sessions', () => {
      const pr = getExerciseHistoricalPR('Supino Reto', mockSessions);
      expect(pr.maxWeight).toBe(100);
      expect(pr.maxWeightReps).toBe(6);
      // 90 * (36 / 29) = 111.7; 100 * (36 / 31) = 116.1 -> best1RM = 116.1
      expect(pr.best1RM).toBe(116.1);
      expect(pr.lastDate).toBe('2026-03-08T10:00:00Z');
    });

    it('is case-insensitive and trims exercise names', () => {
      const pr = getExerciseHistoricalPR('  supino reto  ', mockSessions);
      expect(pr.maxWeight).toBe(100);
    });

    it('returns 0 when exercise was never logged', () => {
      const pr = getExerciseHistoricalPR('Agachamento Búlgaro', mockSessions);
      expect(pr.maxWeight).toBe(0);
      expect(pr.best1RM).toBe(0);
    });
  });

  describe('checkSetPR', () => {
    const historicalPR = {
      maxWeight: 100,
      maxWeightReps: 6,
      best1RM: 116.1,
    };

    it('returns null if weight or reps are zero or negative', () => {
      expect(checkSetPR('Supino Reto', 0, 10, historicalPR)).toBeNull();
      expect(checkSetPR('Supino Reto', 100, 0, historicalPR)).toBeNull();
    });

    it('detects a weight PR when weight exceeds historical maximum', () => {
      const check = checkSetPR('Supino Reto', 105, 5, historicalPR);
      expect(check).not.toBeNull();
      expect(check?.isWeightPR).toBe(true);
      expect(check?.diffWeight).toBe(5);
    });

    it('detects a 1RM PR even with same or lower weight if reps produce higher 1RM', () => {
      // 95kg x 10 reps -> 95 * (36 / 27) = 126.7 (exceeds historical 116.1)
      const check = checkSetPR('Supino Reto', 95, 10, historicalPR);
      expect(check).not.toBeNull();
      expect(check?.isWeightPR).toBe(false);
      expect(check?.is1RMPR).toBe(true);
      expect(check?.current1RM).toBe(126.7);
    });

    it('returns null if neither weight nor 1RM beat the record', () => {
      const check = checkSetPR('Supino Reto', 90, 5, historicalPR);
      expect(check).toBeNull();
    });
  });

  describe('extractSessionPRs', () => {
    const prevSessions: WorkoutSessionSummary[] = [
      {
        id: 's-1',
        splitName: 'Push',
        date: '2026-03-01T10:00:00Z',
        totalVolumeLoadKg: 5000,
        totalSets: 10,
        completedExercises: [
          {
            name: 'Supino Inclinado',
            muscleGroup: 'Peito',
            muscleKey: 'chest',
            sets: [{ weight: 70, reps: 8 }],
          },
        ],
      },
    ];

    const currentSession: WorkoutSessionSummary = {
      id: 's-2',
      splitName: 'Push Atual',
      date: '2026-03-08T10:00:00Z',
      totalVolumeLoadKg: 6000,
      totalSets: 10,
      completedExercises: [
        {
          name: 'Supino Inclinado',
          muscleGroup: 'Peito',
          muscleKey: 'chest',
          sets: [
            { weight: 70, reps: 8 },
            { weight: 75, reps: 8 },
          ],
        },
      ],
    };

    it('extracts PRs broken in the session', () => {
      const prs = extractSessionPRs(currentSession, prevSessions);
      expect(prs).toHaveLength(1);
      expect(prs[0].exerciseName).toBe('Supino Inclinado');
      expect(prs[0].weight).toBe(75);
      expect(prs[0].isWeightPR).toBe(true);
    });
  });
});
