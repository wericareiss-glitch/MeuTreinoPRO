/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  WorkoutItem, 
  WorkoutLogs, 
  WorkoutSessionSummary 
} from '../../types/workout';

export interface ExerciseCardProps {
  item: WorkoutItem;
  index: number;
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  onUpdateLog: (key: string, field: 'weight' | 'reps', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onOpenWarmup: (name: string, targetWeight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onDeleteSet?: (setNum: number) => void;
  onUpdateRest?: (index: number, newRest: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDeleteExercise?: (index: number) => void;
  isDragging?: boolean;
  dragOffsetY?: number;
  isHoldingDrag?: boolean;
  isDropTarget?: boolean;
  onDragStartCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragOverCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDropCard?: (index: number, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndCard?: () => void;
  onPointerDownDragHandle?: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  deepWorkMode?: boolean;
}

export interface SetLogData {
  weight: string;
  reps: string;
  done: boolean;
}

export interface LocalSetLog {
  weight: string;
  reps: string;
}
