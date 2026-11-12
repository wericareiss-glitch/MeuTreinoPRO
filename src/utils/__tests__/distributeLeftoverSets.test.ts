import { describe, it, expect } from 'vitest';
import { distributeLeftoverSetsByFocus, ALL_MUSCLE_GROUPS } from '../auth';
import { MuscleGroup } from '../../types/workout';

describe('distributeLeftoverSetsByFocus', () => {
  const defaultBudgets: Record<MuscleGroup, number> = {
    chest: 8,
    back: 8,
    quadriceps: 8,
    hamstrings: 8,
    shoulders: 8,
    rear_delts: 8,
    biceps: 8,
    triceps: 8,
    glutes: 8,
    calves: 8,
    abs: 8,
  };
  const totalBudget = 88;

  it('sets the excluded muscle to 0 and redistributes leftover sets among active muscles', () => {
    const result = distributeLeftoverSetsByFocus(defaultBudgets, totalBudget, 'v_taper', 'calves');

    // Calves must be strictly 0
    expect(result.calves).toBe(0);

    // Sum of all active muscles must match totalBudget exactly
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalBudget);

    // With v_taper focus, key muscles (back, shoulders, chest) must receive extra sets
    expect(result.back).toBeGreaterThan(8);
    expect(result.shoulders).toBeGreaterThan(8);
    expect(result.chest).toBeGreaterThan(8);
  });

  it('redistributes preferentially towards glutes and hamstrings when focus is glutes', () => {
    const result = distributeLeftoverSetsByFocus(defaultBudgets, totalBudget, 'glutes', 'abs');

    expect(result.abs).toBe(0);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalBudget);

    // For glutes focus, glutes gets the largest share
    expect(result.glutes).toBeGreaterThanOrEqual(result.chest);
    expect(result.glutes).toBeGreaterThanOrEqual(result.biceps);
  });

  it('returns exact total budget when multiple muscles are excluded', () => {
    const partialBudgets: Record<MuscleGroup, number> = {
      ...defaultBudgets,
      abs: 0,
      calves: 0,
      rear_delts: 0,
    };
    // Exclude shoulders as well
    const result = distributeLeftoverSetsByFocus(partialBudgets, totalBudget, 'strength', 'shoulders');

    expect(result.abs).toBe(0);
    expect(result.calves).toBe(0);
    expect(result.rear_delts).toBe(0);
    expect(result.shoulders).toBe(0);

    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalBudget);
  });

  it('does nothing if no active muscles exist', () => {
    const allZero: Record<MuscleGroup, number> = {} as any;
    ALL_MUSCLE_GROUPS.forEach((m) => {
      allZero[m] = 0;
    });

    const result = distributeLeftoverSetsByFocus(allZero, totalBudget, 'balanced', 'chest');
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });

  it('distributes leftover when called without muscleToExclude if budget has remaining sets', () => {
    const smallAllocated: Record<MuscleGroup, number> = {
      ...defaultBudgets,
      calves: 0, // 8 series missing
    };
    const result = distributeLeftoverSetsByFocus(smallAllocated, totalBudget, 'balanced');

    expect(result.calves).toBe(0);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalBudget);
  });
});
