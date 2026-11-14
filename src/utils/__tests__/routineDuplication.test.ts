import { describe, it, expect } from 'vitest';
import {
  buildDuplicatedRoutineName,
  duplicateWorkoutRoutine,
  insertDuplicatedRoutine,
} from '../routineDuplication';
import { GeneratedWorkoutRoutine } from '../../types/workout';

const makeRoutine = (overrides: Partial<GeneratedWorkoutRoutine> = {}): GeneratedWorkoutRoutine => ({
  id: 'routine_a',
  letter: 'A',
  name: 'Treino A - Superior',
  subtitle: 'Peito e Costas',
  split: 'upper_lower',
  muscleGroups: ['chest', 'back'],
  items: [
    {
      id: 'item_1',
      muscleKey: 'chest',
      sets: 4,
      reps: '8-12',
      rest: 90,
      exercise: {
        id: 'supino_reto',
        name: 'Supino Reto',
        category: 'Composto',
        muscleKey: 'chest',
        equip: ['full_gym', 'cables_free'],
        profile: 'Médio',
        stability: 'Média',
        target: 'Peitoral Médio',
        bio: 'Empurrada horizontal',
        cue: 'Escápulas retraídas',
      },
    },
  ],
  totalSets: 4,
  estimatedMinutes: 35,
  isCustom: false,
  version: 1,
  ...overrides,
});

describe('routineDuplication', () => {
  it('generates non-conflicting copy names when duplicating once or multiple times', () => {
    const base = makeRoutine();
    expect(buildDuplicatedRoutineName(base.name, [base])).toBe('Treino A - Superior (Cópia)');

    const copy1 = makeRoutine({ id: 'routine_a_c1', name: 'Treino A - Superior (Cópia)' });
    expect(buildDuplicatedRoutineName(base.name, [base, copy1])).toBe(
      'Treino A - Superior (Cópia 2)'
    );
    expect(buildDuplicatedRoutineName(copy1.name, [base, copy1])).toBe(
      'Treino A - Superior (Cópia 2)'
    );
  });

  it('deep-clones routine items and generates fresh valid IDs', () => {
    const source = makeRoutine();
    const duplicated = duplicateWorkoutRoutine(source, [source]);

    expect(duplicated.id).not.toBe(source.id);
    expect(duplicated.id).toMatch(/^[a-zA-Z0-9_\-.:]+$/);
    expect(duplicated.isCustom).toBe(true);
    expect(duplicated.version).toBe(2);
    expect(duplicated.name).toBe('Treino A - Superior (Cópia)');
    expect(duplicated.items).toHaveLength(1);
    expect(duplicated.items[0].id).not.toBe(source.items[0].id);

    // Mutating clone does not affect source
    duplicated.items[0].sets = 6;
    duplicated.items[0].exercise.equip.push('dumbbells_only');
    duplicated.muscleGroups.push('triceps');
    expect(source.items[0].sets).toBe(4);
    expect(source.items[0].exercise.equip).toHaveLength(2);
    expect(source.muscleGroups).toHaveLength(2);
  });

  it('inserts duplicated routine right after the source routine', () => {
    const a = makeRoutine({ id: 'a' });
    const b = makeRoutine({ id: 'b', letter: 'B', name: 'Treino B' });
    const copyA = duplicateWorkoutRoutine(a, [a, b]);

    const next = insertDuplicatedRoutine([a, b], 'a', copyA);
    expect(next.map((r) => r.id)).toEqual(['a', copyA.id, 'b']);
  });
});
