import { describe, it, expect } from 'vitest';
import {
  recalculateSessionSummary,
  recomputeWeeklyVolumeFromSessions,
  updateSessionSetValue,
  addSetToSessionExercise,
  removeSetFromSessionExercise,
} from '../sessionEditor';
import { WorkoutSessionSummary } from '../../types/workout';

const makeSession = (overrides: Partial<WorkoutSessionSummary> = {}): WorkoutSessionSummary => ({
  id: 'session_1',
  date: '2026-11-11T12:00:00.000Z',
  splitName: 'A — Treino Superior',
  totalSets: 3,
  totalVolumeLoadKg: 1800,
  notes: 'Bom pump',
  completedExercises: [
    {
      name: 'Supino Reto',
      muscleKey: 'chest',
      muscleGroup: 'Peitoral',
      sets: [
        { weight: 80, reps: 10 },
        { weight: 80, reps: 10 },
      ],
    },
    {
      name: 'Remada Curvada',
      muscleKey: 'back',
      muscleGroup: 'Dorsais / Costas',
      sets: [{ weight: 40, reps: 5 }],
    },
  ],
  ...overrides,
});

describe('sessionEditor', () => {
  it('recalculates totalSets, totalVolumeLoadKg, and cleans notes', () => {
    const raw = makeSession({
      notes: '   ',
      totalSets: 99,
      totalVolumeLoadKg: 0,
      completedExercises: [
        {
          name: 'Supino Reto',
          muscleKey: 'chest',
          muscleGroup: 'Peitoral',
          sets: [
            { weight: 82.5, reps: 8 },
            { weight: -10, reps: 10 },
          ],
        },
        {
          name: 'Vazio',
          muscleKey: 'biceps',
          muscleGroup: 'Bíceps',
          sets: [],
        },
      ],
    });

    const updated = recalculateSessionSummary(raw);
    expect(updated.totalSets).toBe(2);
    expect(updated.totalVolumeLoadKg).toBe(660); // 82.5*8 + 0*10
    expect(updated.notes).toBeUndefined();
    expect(updated.completedExercises).toHaveLength(1);
    expect(updated.updatedAt).toBeTruthy();
  });

  it('updates set weight/reps, adds sets, and prevents deleting the very last set', () => {
    let sess = makeSession();
    sess = updateSessionSetValue(sess, 0, 1, 'weight', 90);
    sess = updateSessionSetValue(sess, 0, 1, 'reps', 12);
    expect(sess.totalVolumeLoadKg).toBe(80 * 10 + 90 * 12 + 40 * 5);
    expect(sess.totalSets).toBe(3);

    sess = addSetToSessionExercise(sess, 1);
    expect(sess.totalSets).toBe(4);
    expect(sess.completedExercises[1].sets).toEqual([
      { weight: 40, reps: 5 },
      { weight: 40, reps: 5 },
    ]);

    sess = removeSetFromSessionExercise(sess, 1, 1);
    sess = removeSetFromSessionExercise(sess, 1, 0);
    expect(sess.completedExercises).toHaveLength(1);
    expect(sess.totalSets).toBe(2);

    // Remove down to 1 set, then attempt to remove the final set (must be blocked)
    sess = removeSetFromSessionExercise(sess, 0, 0);
    expect(sess.totalSets).toBe(1);
    const blocked = removeSetFromSessionExercise(sess, 0, 0);
    expect(blocked.totalSets).toBe(1);
  });

  it('recomputes weekly muscle volume from current week sessions including legacy muscleGroup fallback', () => {
    const reference = new Date('2026-11-12T15:00:00.000Z'); // Thursday
    const thisWeek = makeSession({
      id: 's_curr',
      date: '2026-11-11T10:00:00.000Z',
    });
    const legacyThisWeek = makeSession({
      id: 's_legacy',
      date: '2026-11-10T10:00:00.000Z',
      completedExercises: [
        {
          name: 'Rosca Direta',
          muscleGroup: 'Bíceps',
          sets: [
            { weight: 15, reps: 12 },
            { weight: 15, reps: 10 },
          ],
        },
      ],
    });
    const lastWeek = makeSession({
      id: 's_old',
      date: '2026-11-05T10:00:00.000Z',
    });

    const weekly = recomputeWeeklyVolumeFromSessions(
      [thisWeek, legacyThisWeek, lastWeek],
      reference
    );
    expect(weekly.chest).toBe(2);
    expect(weekly.back).toBe(1);
    expect(weekly.biceps).toBe(2);
  });
});
