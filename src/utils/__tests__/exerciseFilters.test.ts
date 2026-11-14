/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { filterExercisesCatalog, matchesEquipmentFilter } from '../exerciseFilters';
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase';

describe('exerciseFilters', () => {
  it('filters machine and smith exercises accurately', () => {
    const hack = EXERCISE_DATABASE.quadriceps.find((e) => e.id === 'quad_hack')!;
    const smith = EXERCISE_DATABASE.quadriceps.find((e) => e.id === 'quad_smith_squat')!;
    const bulgarian = EXERCISE_DATABASE.quadriceps.find((e) => e.id === 'quad_bulgarian')!;

    expect(matchesEquipmentFilter(hack, 'machine')).toBe(true);
    expect(matchesEquipmentFilter(smith, 'machine')).toBe(true);
    expect(matchesEquipmentFilter(bulgarian, 'machine')).toBe(false);
  });

  it('filters dumbbells, barbells, cables, and bodyweight categories', () => {
    const resultsDumbbell = filterExercisesCatalog({
      muscle: 'chest',
      equipment: 'dumbbell',
      searchQuery: '',
    });
    expect(resultsDumbbell.length).toBeGreaterThan(0);
    expect(resultsDumbbell.every((e) => e.category.toLowerCase().includes('halter'))).toBe(true);

    const resultsCable = filterExercisesCatalog({
      muscle: 'triceps',
      equipment: 'cable',
      searchQuery: '',
    });
    expect(resultsCable.length).toBeGreaterThan(0);
    expect(resultsCable.every((e) => e.category.toLowerCase().includes('cabo'))).toBe(true);

    const resultsBodyweight = filterExercisesCatalog({
      muscle: 'all',
      equipment: 'bodyweight',
      searchQuery: '',
    });
    expect(resultsBodyweight.length).toBeGreaterThanOrEqual(7);
  });

  it('combines muscle, equipment, and text search across all muscles', () => {
    const combined = filterExercisesCatalog({
      muscle: 'all',
      equipment: 'barbell',
      searchQuery: 'supino',
    });
    expect(combined.length).toBeGreaterThan(0);
    expect(combined.every((e) => e.name.toLowerCase().includes('supino'))).toBe(true);
  });
});
