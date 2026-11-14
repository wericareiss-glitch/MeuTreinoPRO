/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { MuscleGroup, WorkoutSessionSummary } from '../types/workout';

const MUSCLE_NAME_TO_KEY: Record<string, MuscleGroup> = Object.entries(MUSCLE_NAMES).reduce(
  (acc, [key, label]) => {
    acc[label.trim().toLowerCase()] = key as MuscleGroup;
    return acc;
  },
  {} as Record<string, MuscleGroup>
);

export function sanitizeWeight(val: number): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.round(val * 100) / 100;
}

export function sanitizeReps(val: number): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return Math.round(val);
}

export function recalculateSessionSummary(
  session: WorkoutSessionSummary
): WorkoutSessionSummary {
  const normalizedExercises = (session.completedExercises || [])
    .map((ex) => ({
      ...ex,
      sets: (ex.sets || []).map((st) => ({
        weight: sanitizeWeight(Number(st.weight)),
        reps: sanitizeReps(Number(st.reps)),
      })),
    }))
    .filter((ex) => ex.sets.length > 0);

  let totalSets = 0;
  let volumeLoad = 0;

  for (const ex of normalizedExercises) {
    for (const st of ex.sets) {
      totalSets += 1;
      volumeLoad += st.weight * st.reps;
    }
  }

  const trimmedNotes = (session.notes ?? '').trim();

  return {
    ...session,
    totalSets,
    totalVolumeLoadKg: Math.round(volumeLoad),
    notes: trimmedNotes ? trimmedNotes : undefined,
    completedExercises: normalizedExercises,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveExerciseMuscleKey(
  ex: WorkoutSessionSummary['completedExercises'][number]
): MuscleGroup | undefined {
  if (ex.muscleKey && ex.muscleKey in MUSCLE_NAMES) {
    return ex.muscleKey;
  }
  const normalizedLabel = (ex.muscleGroup || '').trim().toLowerCase();
  return MUSCLE_NAME_TO_KEY[normalizedLabel];
}

export function recomputeWeeklyVolumeFromSessions(
  sessions: WorkoutSessionSummary[],
  referenceDate: Date = new Date()
): Record<MuscleGroup, number> {
  const day = referenceDate.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const counts = {} as Record<MuscleGroup, number>;

  for (const sess of sessions) {
    if (!sess?.date) continue;
    const sessDate = new Date(sess.date);
    if (Number.isNaN(sessDate.getTime()) || sessDate < monday) continue;

    for (const ex of sess.completedExercises || []) {
      const mKey = resolveExerciseMuscleKey(ex);
      if (mKey) {
        counts[mKey] = (counts[mKey] || 0) + (ex.sets?.length || 0);
      }
    }
  }

  return counts;
}

export function getTotalSessionSetsCount(session: WorkoutSessionSummary): number {
  return (session.completedExercises || []).reduce(
    (sum, ex) => sum + (ex.sets?.length || 0),
    0
  );
}

export function updateSessionSetValue(
  session: WorkoutSessionSummary,
  exerciseIdx: number,
  setIdx: number,
  field: 'weight' | 'reps',
  rawValue: number
): WorkoutSessionSummary {
  const nextExercises = session.completedExercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex;
    return {
      ...ex,
      sets: ex.sets.map((st, sIdx) => {
        if (sIdx !== setIdx) return st;
        return {
          ...st,
          [field]: field === 'weight' ? sanitizeWeight(rawValue) : sanitizeReps(rawValue),
        };
      }),
    };
  });

  return recalculateSessionSummary({
    ...session,
    completedExercises: nextExercises,
  });
}

export function addSetToSessionExercise(
  session: WorkoutSessionSummary,
  exerciseIdx: number
): WorkoutSessionSummary {
  const nextExercises = session.completedExercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex;
    const lastSet = ex.sets[ex.sets.length - 1] || { weight: 0, reps: 10 };
    return {
      ...ex,
      sets: [...ex.sets, { weight: lastSet.weight, reps: lastSet.reps }],
    };
  });

  return recalculateSessionSummary({
    ...session,
    completedExercises: nextExercises,
  });
}

export function removeSetFromSessionExercise(
  session: WorkoutSessionSummary,
  exerciseIdx: number,
  setIdx: number
): WorkoutSessionSummary {
  if (getTotalSessionSetsCount(session) <= 1) {
    return session;
  }

  const nextExercises = session.completedExercises.map((ex, eIdx) => {
    if (eIdx !== exerciseIdx) return ex;
    return {
      ...ex,
      sets: ex.sets.filter((_, sIdx) => sIdx !== setIdx),
    };
  });

  return recalculateSessionSummary({
    ...session,
    completedExercises: nextExercises,
  });
}
