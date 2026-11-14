/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratedWorkoutRoutine, WorkoutItem } from '../types/workout';

function generateSafeId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

export function buildDuplicatedRoutineName(
  sourceName: string,
  existingRoutines: GeneratedWorkoutRoutine[]
): string {
  const trimmed = (sourceName || 'Treino').trim();
  const baseName = trimmed.replace(/\s*\(Cópia(?:\s+\d+)?\)\s*$/i, '').trim() || 'Treino';
  const existingLower = new Set(
    existingRoutines.map((r) => (r.name || '').trim().toLowerCase())
  );

  const firstCandidate = `${baseName} (Cópia)`;
  if (!existingLower.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  let copyNumber = 2;
  while (existingLower.has(`${baseName} (Cópia ${copyNumber})`.toLowerCase())) {
    copyNumber += 1;
  }
  return `${baseName} (Cópia ${copyNumber})`;
}

export function duplicateWorkoutRoutine(
  source: GeneratedWorkoutRoutine,
  existingRoutines: GeneratedWorkoutRoutine[]
): GeneratedWorkoutRoutine {
  const now = Date.now();
  const nextVersion =
    existingRoutines.reduce((maxV, r) => Math.max(maxV, r.version || 1), 0) + 1;

  const clonedItems: WorkoutItem[] = source.items.map((item, idx) => ({
    ...item,
    id: `${generateSafeId('item')}_${idx}`,
    exercise: {
      ...item.exercise,
      equip: [...item.exercise.equip],
    },
  }));

  const totalSets =
    clonedItems.length > 0
      ? clonedItems.reduce((sum, item) => sum + (Number(item.sets) || 0), 0)
      : source.totalSets;

  return {
    ...source,
    id: generateSafeId('custom_routine'),
    name: buildDuplicatedRoutineName(source.name, existingRoutines),
    muscleGroups: [...source.muscleGroups],
    items: clonedItems,
    totalSets,
    isCustom: true,
    version: nextVersion,
    createdAt: new Date(now).toISOString(),
  };
}

export function insertDuplicatedRoutine(
  routines: GeneratedWorkoutRoutine[],
  sourceId: string,
  duplicated: GeneratedWorkoutRoutine
): GeneratedWorkoutRoutine[] {
  const sourceIdx = routines.findIndex((r) => r.id === sourceId);
  if (sourceIdx < 0) {
    return [...routines, duplicated];
  }
  return [
    ...routines.slice(0, sourceIdx + 1),
    duplicated,
    ...routines.slice(sourceIdx + 1),
  ];
}
