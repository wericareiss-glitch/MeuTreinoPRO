/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExerciseCard } from '../ExerciseCard';
import { WorkoutItemRowProps, areWorkoutItemRowEqual } from './types';

export const MemoizedWorkoutItemRow: React.FC<WorkoutItemRowProps> = React.memo(
  ({
    item,
    index,
    totalItems,
    logs,
    history,
    sessions,
    isDragging,
    dragOffsetY,
    isHoldingDrag,
    isDropTarget,
    onMoveUp,
    onMoveDown,
    onDeleteExercise,
    onUpdateLog,
    onToggleSet,
    onUpdateRest,
    onOpenWarmup,
    onOpenSwap,
    onAddSet,
    onRemoveSet,
    onOpenAnalytics,
    onDragStartCard,
    onDragOverCard,
    onDropCard,
    onDragEndCard,
    onPointerDownDragHandle,
  }) => {
    return (
      <ExerciseCard
        item={item}
        index={index}
        logs={logs}
        history={history}
        sessions={sessions}
        canMoveUp={index > 0}
        canMoveDown={index < totalItems - 1}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDeleteExercise={onDeleteExercise}
        onUpdateLog={onUpdateLog}
        onToggleSet={onToggleSet}
        onUpdateRest={onUpdateRest}
        onOpenWarmup={onOpenWarmup}
        onOpenSwap={onOpenSwap}
        onAddSet={onAddSet}
        onRemoveSet={onRemoveSet}
        onOpenAnalytics={onOpenAnalytics}
        isDragging={isDragging}
        dragOffsetY={dragOffsetY}
        isHoldingDrag={isHoldingDrag}
        isDropTarget={isDropTarget}
        onDragStartCard={onDragStartCard}
        onDragOverCard={onDragOverCard}
        onDropCard={onDropCard}
        onDragEndCard={onDragEndCard}
        onPointerDownDragHandle={onPointerDownDragHandle}
      />
    );
  },
  areWorkoutItemRowEqual
);

MemoizedWorkoutItemRow.displayName = 'MemoizedWorkoutItemRow';
