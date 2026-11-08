/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { GeneratedWorkoutRoutine } from '../../../types/workout';

describe('Workout Routine Ordering & Filtering Logic', () => {
  const createMockRoutine = (
    letter: string,
    name: string,
    version = 1,
    id = `r_${letter}_v${version}`
  ): GeneratedWorkoutRoutine => ({
    id,
    name,
    letter,
    subtitle: `Sub ${letter}`,
    split: 'ppl',
    estimatedMinutes: 50,
    totalSets: 15,
    muscleGroups: ['chest'],
    items: [],
    version,
    createdAt: new Date().toISOString(),
  });

  it('keeps routines in natural sequence A -> B -> C -> D instead of reversing', () => {
    const rawRoutines = [
      createMockRoutine('A', 'Treino A - Peitoral e Tríceps'),
      createMockRoutine('B', 'Treino B - Costas e Bíceps'),
      createMockRoutine('C', 'Treino C - Pernas Completo'),
      createMockRoutine('D', 'Treino D - Ombros e Braços'),
    ];

    const mapped = rawRoutines.map((routine, idx) => ({
      routine,
      visualIdx: idx,
    }));

    expect(mapped[0].routine.letter).toBe('A');
    expect(mapped[1].routine.letter).toBe('B');
    expect(mapped[2].routine.letter).toBe('C');
    expect(mapped[3].routine.letter).toBe('D');
  });

  it('filters latest versions by grouping highest version per routine letter', () => {
    const routinesWithVersions = [
      createMockRoutine('A', 'Treino A • v1', 1, 'r_a_1'),
      createMockRoutine('B', 'Treino B • v1', 1, 'r_b_1'),
      createMockRoutine('C', 'Treino C • v1', 1, 'r_c_1'),
      // Subsequent generation creates v2:
      createMockRoutine('A', 'Treino A • v2', 2, 'r_a_2'),
      createMockRoutine('B', 'Treino B • v2', 2, 'r_b_2'),
      createMockRoutine('C', 'Treino C • v2', 2, 'r_c_2'),
    ];

    const latestVersionByLetter = new Map<string, number>();
    routinesWithVersions.forEach((r) => {
      const letterKey = (r.letter || 'A').toUpperCase();
      const curMax = latestVersionByLetter.get(letterKey) || 0;
      const v = r.version || 1;
      if (v > curMax) {
        latestVersionByLetter.set(letterKey, v);
      }
    });

    const latestIds = new Set<string>();
    routinesWithVersions.forEach((r) => {
      const letterKey = (r.letter || 'A').toUpperCase();
      const maxV = latestVersionByLetter.get(letterKey) || 1;
      if ((r.version || 1) === maxV) {
        latestIds.add(r.id);
      }
    });

    const filtered = routinesWithVersions.filter((r) => latestIds.has(r.id));

    expect(filtered).toHaveLength(3);
    expect(filtered.map((r) => r.id)).toEqual(['r_a_2', 'r_b_2', 'r_c_2']);
  });

  it('correctly maps reordering by routine ID regardless of visual filters', () => {
    const routines = [
      createMockRoutine('A', 'Treino A'),
      createMockRoutine('B', 'Treino B'),
      createMockRoutine('C', 'Treino C'),
    ];

    const fromRoutine = routines[2]; // Treino C
    const toRoutine = routines[0];   // Treino A

    const fromOriginalIdx = routines.findIndex((r) => r.id === fromRoutine.id);
    const toOriginalIdx = routines.findIndex((r) => r.id === toRoutine.id);

    expect(fromOriginalIdx).toBe(2);
    expect(toOriginalIdx).toBe(0);

    const reordered = [...routines];
    const [moved] = reordered.splice(fromOriginalIdx, 1);
    reordered.splice(toOriginalIdx, 0, moved);

    expect(reordered.map((r) => r.letter)).toEqual(['C', 'A', 'B']);
  });
});
