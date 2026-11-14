/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  getExerciseCompletionStats,
  findNextIncompleteExerciseIndex,
  findFirstIncompleteExerciseIndex,
} from '../../components/activeWorkout/ActiveExerciseNav';
import { WorkoutItem, WorkoutLogs } from '../../types/workout';

const makeItem = (id: string, exerciseId: string, sets = 3): WorkoutItem => ({
  id,
  exercise: {
    id: exerciseId,
    name: `Exercicio ${exerciseId}`,
    category: 'chest',
    muscleKey: 'chest',
    equip: ['full_gym'],
    profile: 'Encurtamento',
    stability: 'Alta',
    target: 'Peitoral',
    bio: 'Bio',
    cue: 'Cue',
  },
  sets,
  reps: '8-12',
  rest: 90,
  muscleKey: 'chest',
});

describe('ActiveExerciseNav helpers', () => {
  it('computes exercise completion stats accurately', () => {
    const item = makeItem('item-1', 'bench_press', 3);
    const logs: WorkoutLogs = {
      bench_press_1: { weight: '80', reps: '10', done: true },
      bench_press_2: { weight: '80', reps: '10', done: true },
      bench_press_3: { weight: '80', reps: '9', done: false },
    };

    expect(getExerciseCompletionStats(item, logs)).toEqual({
      doneSets: 2,
      totalSets: 3,
      isComplete: false,
    });

    const allDoneLogs: WorkoutLogs = {
      ...logs,
      bench_press_3: { weight: '80', reps: '9', done: true },
    };

    expect(getExerciseCompletionStats(item, allDoneLogs)).toEqual({
      doneSets: 3,
      totalSets: 3,
      isComplete: true,
    });
  });

  it('finds the first incomplete exercise on workout resume', () => {
    const items = [
      makeItem('1', 'ex_a', 2),
      makeItem('2', 'ex_b', 2),
      makeItem('3', 'ex_c', 2),
    ];
    const logs: WorkoutLogs = {
      ex_a_1: { weight: '50', reps: '10', done: true },
      ex_a_2: { weight: '50', reps: '10', done: true },
      ex_b_1: { weight: '40', reps: '12', done: true },
    };

    expect(findFirstIncompleteExerciseIndex(items, logs)).toBe(1);
  });

  it('finds next incomplete exercise forward and wraps around if needed', () => {
    const items = [
      makeItem('1', 'ex_a', 2),
      makeItem('2', 'ex_b', 2),
      makeItem('3', 'ex_c', 2),
    ];
    const logs: WorkoutLogs = {
      ex_b_1: { weight: '40', reps: '10', done: true },
      ex_b_2: { weight: '40', reps: '10', done: true },
      ex_c_1: { weight: '30', reps: '12', done: true },
      ex_c_2: { weight: '30', reps: '12', done: true },
    };

    // Starting from index 1 (ex_b done), ex_c is done so it wraps to ex_a (index 0)
    expect(findNextIncompleteExerciseIndex(items, logs, 1)).toBe(0);

    // When all exercises are done, returns -1
    const allDone: WorkoutLogs = {
      ...logs,
      ex_a_1: { weight: '50', reps: '10', done: true },
      ex_a_2: { weight: '50', reps: '10', done: true },
    };
    expect(findNextIncompleteExerciseIndex(items, allDone, 0)).toBe(-1);
  });
});
