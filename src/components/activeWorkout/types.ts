/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  GeneratedWorkoutRoutine,
  WorkoutItem,
  WorkoutLogs,
  WorkoutSessionSummary,
  PeriodizationStrategy,
  FocusOption,
} from '../../types/workout';
import { areExerciseLogsEqualForCard } from '../ExerciseCard';

export interface WorkoutItemRowProps {
  item: WorkoutItem;
  index: number;
  totalItems: number;
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions: WorkoutSessionSummary[];
  isDragging: boolean;
  dragOffsetY?: number;
  isHoldingDrag: boolean;
  isDropTarget: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  onDragStartCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOverCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDropCard: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndCard: () => void;
  onPointerDownDragHandle: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
}

export function areWorkoutItemRowEqual(prev: WorkoutItemRowProps, next: WorkoutItemRowProps): boolean {
  if (
    prev.index !== next.index ||
    prev.totalItems !== next.totalItems ||
    prev.isDragging !== next.isDragging ||
    prev.dragOffsetY !== next.dragOffsetY ||
    prev.isHoldingDrag !== next.isHoldingDrag ||
    prev.isDropTarget !== next.isDropTarget ||
    prev.sessions !== next.sessions
  ) {
    return false;
  }

  if (prev.item !== next.item) {
    if (
      prev.item.id !== next.item.id ||
      prev.item.sets !== next.item.sets ||
      prev.item.reps !== next.item.reps ||
      prev.item.rest !== next.item.rest ||
      prev.item.muscleKey !== next.item.muscleKey ||
      prev.item.exercise.id !== next.item.exercise.id ||
      prev.item.exercise.name !== next.item.exercise.name
    ) {
      return false;
    }
  }

  const exId = next.item.exercise.id;
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.logs, next.logs)) {
    return false;
  }
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.history, next.history)) {
    return false;
  }

  return true;
}

export interface ActiveWorkoutViewProps {
  routine: GeneratedWorkoutRoutine;
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  startedAt: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
  periodizationStrategy?: PeriodizationStrategy;
  userFocus?: FocusOption;
  onSelectPeriodizationStrategy?: (phase: PeriodizationStrategy) => void;

  onOpenAddExercise: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onReorderExercises?: (fromIndex: number, toIndex: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;

  onFinishSession: () => void;
  onDiscardSession: () => void;
  onBackToList: () => void;
}
