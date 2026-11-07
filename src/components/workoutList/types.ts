/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  GeneratedWorkoutRoutine, 
  UserProfile,
  SplitOption,
  StrategyOption,
  LevelOption,
  EquipmentRequirement,
  PeriodizationStrategy
} from '../../types/workout';

export interface WorkoutListViewProps {
  user: UserProfile;
  routines: GeneratedWorkoutRoutine[];
  activeRoutineId: string | null;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onCreateManualWorkout?: () => void;
  onGenerateQuickWorkout?: () => void;
  onEditRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onDeleteRoutine?: (routineId: string) => void;
  onShareRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onReorderRoutines?: (fromIndex: number, toIndex: number) => void;

  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  strategy: StrategyOption;
  setStrategy: (s: StrategyOption) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  level: LevelOption;
  setLevel: (l: LevelOption) => void;
  equip: EquipmentRequirement;
  setEquip: (e: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (s: number) => void;
  onGenerateRoutines: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  periodizationStrategy?: PeriodizationStrategy;
  setPeriodizationStrategy?: (p: PeriodizationStrategy) => void;
  onOpenVolumeBudget?: () => void;
}

export interface RoutineVisualEntry {
  routine: GeneratedWorkoutRoutine;
  visualIdx: number;
}

export type VersionFilterMode = 'all' | 'latest' | 'custom';

export interface RoutineCardProps {
  entry: RoutineVisualEntry;
  isActive: boolean;
  isMenuOpen: boolean;
  isConfirmingDelete: boolean;
  isDraggingThis: boolean;
  isHoldingThis: boolean;
  isDropTargetThis: boolean;
  canReorder: boolean;
  hasEditHandler: boolean;
  hasDeleteHandler: boolean;
  onToggleMenu: (routineId: string) => void;
  onCloseMenu: () => void;
  onRequestDeleteConfirm: (routineId: string | null) => void;
  onConfirmDelete: (routineId: string) => void;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onEditRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onShareRoutineClick: (routine: GeneratedWorkoutRoutine) => void;
  onPointerDownGrip: (visualIdx: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  onCardDragStart: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragOver: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDrop: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragEnd: () => void;
}

export function areRoutineCardPropsEqual(prev: RoutineCardProps, next: RoutineCardProps): boolean {
  return (
    prev.entry.routine === next.entry.routine &&
    prev.entry.visualIdx === next.entry.visualIdx &&
    prev.isActive === next.isActive &&
    prev.isMenuOpen === next.isMenuOpen &&
    prev.isConfirmingDelete === next.isConfirmingDelete &&
    prev.isDraggingThis === next.isDraggingThis &&
    prev.isHoldingThis === next.isHoldingThis &&
    prev.isDropTargetThis === next.isDropTargetThis &&
    prev.canReorder === next.canReorder &&
    prev.hasEditHandler === next.hasEditHandler &&
    prev.hasDeleteHandler === next.hasDeleteHandler
  );
}

export interface CarouselItemData {
  entries: RoutineVisualEntry[];
  activeRoutineId: string | null;
  openMenuId: string | null;
  confirmDeleteId: string | null;
  holdingIdx: number | null;
  draggingIdx: number | null;
  dropTargetIdx: number | null;
  canReorder: boolean;
  hasEditHandler: boolean;
  hasDeleteHandler: boolean;
  onToggleMenu: (routineId: string) => void;
  onCloseMenu: () => void;
  onRequestDeleteConfirm: (routineId: string | null) => void;
  onConfirmDelete: (routineId: string) => void;
  onStartWorkout: (routine: GeneratedWorkoutRoutine) => void;
  onEditRoutine?: (routine: GeneratedWorkoutRoutine) => void;
  onShareRoutineClick: (routine: GeneratedWorkoutRoutine) => void;
  onPointerDownGrip: (visualIdx: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  onCardDragStart: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragOver: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDrop: (visualIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onCardDragEnd: () => void;
}
