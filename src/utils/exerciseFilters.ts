/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exercise, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE, MUSCLE_NAMES } from '../data/exerciseDatabase';
import { ALL_MUSCLE_GROUPS } from './auth';

export type EquipmentFilterOption =
  | 'all'
  | 'machine'
  | 'dumbbell'
  | 'barbell'
  | 'cable'
  | 'bodyweight';

export interface EquipmentFilterConfig {
  id: EquipmentFilterOption;
  label: string;
}

export const EQUIPMENT_FILTERS: EquipmentFilterConfig[] = [
  { id: 'all', label: 'Todos' },
  { id: 'machine', label: 'Máquinas' },
  { id: 'dumbbell', label: 'Halteres' },
  { id: 'barbell', label: 'Barras' },
  { id: 'cable', label: 'Cabos / Polia' },
  { id: 'bodyweight', label: 'Peso do Corpo' },
];

export function matchesEquipmentFilter(
  exercise: Exercise,
  filter: EquipmentFilterOption
): boolean {
  if (filter === 'all') return true;

  const cat = (exercise.category || '').toLowerCase();
  const name = (exercise.name || '').toLowerCase();

  switch (filter) {
    case 'machine':
      return cat.includes('máquina') || cat.includes('maquina') || cat.includes('smith');
    case 'dumbbell':
      return cat.includes('halter');
    case 'barbell':
      return cat.includes('barra');
    case 'cable':
      return cat.includes('cabo') || cat.includes('polia');
    case 'bodyweight':
      return (
        cat.includes('livre') ||
        name.includes('barra fixa') ||
        name.includes('chin-up') ||
        name.includes('paralelas') ||
        name.includes('flexão') ||
        name.includes('prancha') ||
        name.includes('roda abdominal')
      );
    default:
      return true;
  }
}

export function filterExercisesCatalog(params: {
  muscle: MuscleGroup | 'all';
  equipment: EquipmentFilterOption;
  searchQuery: string;
}): Exercise[] {
  const { muscle, equipment, searchQuery } = params;
  const query = searchQuery.trim().toLowerCase();

  const pool: Exercise[] =
    muscle === 'all'
      ? ALL_MUSCLE_GROUPS.flatMap((m) => EXERCISE_DATABASE[m] || [])
      : EXERCISE_DATABASE[muscle] || [];

  return pool.filter((ex) => {
    if (!matchesEquipmentFilter(ex, equipment)) return false;

    if (!query) return true;

    const muscleLabel = (MUSCLE_NAMES[ex.muscleKey] || '').toLowerCase();
    return (
      ex.name.toLowerCase().includes(query) ||
      ex.category.toLowerCase().includes(query) ||
      ex.target.toLowerCase().includes(query) ||
      ex.profile.toLowerCase().includes(query) ||
      muscleLabel.includes(query)
    );
  });
}
