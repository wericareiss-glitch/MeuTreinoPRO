/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { areExerciseLogsEqualForCard } from '../../components/ExerciseCard';
import { areRoutineCardPropsEqual, RoutineCardProps } from '../../components/workoutList';
import { areWorkoutItemRowEqual, WorkoutItemRowProps } from '../../components/activeWorkout';
import { WorkoutItem, GeneratedWorkoutRoutine } from '../../types/workout';

describe('Component Comparators & Memoization Audit', () => {
  describe('areExerciseLogsEqualForCard', () => {
    it('returns true when logs references are identical', () => {
      const logs = { 'ex1_1': { weight: '80', reps: '10', done: true } };
      expect(areExerciseLogsEqualForCard('ex1', 3, logs, logs)).toBe(true);
    });

    it('returns true when log values match for the target exercise', () => {
      const prev = { 'ex1_1': { weight: '80', reps: '10', done: true } };
      const next = { 'ex1_1': { weight: '80', reps: '10', done: true } };
      expect(areExerciseLogsEqualForCard('ex1', 3, prev, next)).toBe(true);
    });

    it('returns false when weight changes on target exercise', () => {
      const prev = { 'ex1_1': { weight: '80', reps: '10', done: true } };
      const next = { 'ex1_1': { weight: '85', reps: '10', done: true } };
      expect(areExerciseLogsEqualForCard('ex1', 3, prev, next)).toBe(false);
    });

    it('returns false when completion status changes', () => {
      const prev = { 'ex1_1': { weight: '80', reps: '10', done: false } };
      const next = { 'ex1_1': { weight: '80', reps: '10', done: true } };
      expect(areExerciseLogsEqualForCard('ex1', 3, prev, next)).toBe(false);
    });

    it('ignores log changes from other exercises to prevent unnecessary re-renders', () => {
      const prev = { 
        'ex1_1': { weight: '80', reps: '10', done: true },
        'ex2_1': { weight: '50', reps: '12', done: false }
      };
      const next = { 
        'ex1_1': { weight: '80', reps: '10', done: true },
        'ex2_1': { weight: '55', reps: '12', done: true } // Changed ex2
      };
      expect(areExerciseLogsEqualForCard('ex1', 3, prev, next)).toBe(true);
    });
  });

  describe('areRoutineCardPropsEqual', () => {
    const mockRoutine: GeneratedWorkoutRoutine = {
      id: 'routine-1',
      name: 'Treino A - Peitoral e Tríceps',
      subtitle: 'Foco Hipertrofia',
      letter: 'A',
      split: 'ppl',
      estimatedMinutes: 50,
      totalSets: 16,
      muscleGroups: ['chest', 'triceps'],
      items: [],
      createdAt: new Date().toISOString(),
    };

    const baseProps: RoutineCardProps = {
      entry: { routine: mockRoutine, visualIdx: 0 },
      isActive: false,
      isMenuOpen: false,
      isConfirmingDelete: false,
      isDraggingThis: false,
      isHoldingThis: false,
      isDropTargetThis: false,
      canReorder: true,
      hasEditHandler: true,
      hasDeleteHandler: true,
      onToggleMenu: () => {},
      onCloseMenu: () => {},
      onRequestDeleteConfirm: () => {},
      onConfirmDelete: () => {},
      onStartWorkout: () => {},
      onShareRoutineClick: () => {},
      onPointerDownGrip: () => {},
      onCardDragStart: () => {},
      onCardDragOver: () => {},
      onCardDrop: () => {},
      onCardDragEnd: () => {},
    };

    it('returns true when all relevant state props match', () => {
      expect(areRoutineCardPropsEqual(baseProps, { ...baseProps })).toBe(true);
    });

    it('returns false when isActive status changes', () => {
      expect(areRoutineCardPropsEqual(baseProps, { ...baseProps, isActive: true })).toBe(false);
    });

    it('returns false when menu is opened', () => {
      expect(areRoutineCardPropsEqual(baseProps, { ...baseProps, isMenuOpen: true })).toBe(false);
    });

    it('returns false when drag or drop target status changes', () => {
      expect(areRoutineCardPropsEqual(baseProps, { ...baseProps, isDraggingThis: true })).toBe(false);
      expect(areRoutineCardPropsEqual(baseProps, { ...baseProps, isDropTargetThis: true })).toBe(false);
    });
  });

  describe('areWorkoutItemRowEqual', () => {
    const mockItem: WorkoutItem = {
      id: 'item-1',
      exercise: {
        id: 'bench-press',
        name: 'Supino Reto com Barra',
        category: 'chest',
        muscleKey: 'chest',
        equip: ['full_gym'],
        profile: 'Encurtamento',
        stability: 'Alta',
        target: 'Peitoral Maior',
        bio: 'Feixe esternocostal',
        cue: 'Adução escapular',
      },
      sets: 4,
      reps: '8-10',
      rest: 90,
      muscleKey: 'chest',
    };

    const baseRowProps: WorkoutItemRowProps = {
      item: mockItem,
      index: 0,
      totalItems: 5,
      logs: {},
      history: {},
      sessions: [],
      isDragging: false,
      isHoldingDrag: false,
      isDropTarget: false,
      onMoveUp: () => {},
      onMoveDown: () => {},
      onDeleteExercise: () => {},
      onUpdateLog: () => {},
      onToggleSet: () => {},
      onUpdateRest: () => {},
      onOpenWarmup: () => {},
      onOpenSwap: () => {},
      onAddSet: () => {},
      onRemoveSet: () => {},
      onDragStartCard: () => {},
      onDragOverCard: () => {},
      onDropCard: () => {},
      onDragEndCard: () => {},
      onPointerDownDragHandle: () => {},
    };

    it('returns true when row properties match', () => {
      expect(areWorkoutItemRowEqual(baseRowProps, { ...baseRowProps })).toBe(true);
    });

    it('returns false when item sets count changes', () => {
      const updatedItem = { ...mockItem, sets: 5 };
      expect(areWorkoutItemRowEqual(baseRowProps, { ...baseRowProps, item: updatedItem })).toBe(false);
    });

    it('returns false when drag status changes', () => {
      expect(areWorkoutItemRowEqual(baseRowProps, { ...baseRowProps, isDragging: true })).toBe(false);
    });

    it('returns false when target log for this exercise changes', () => {
      const nextLogs = {
        'bench-press_1': { weight: '100', reps: '8', done: true }
      };
      expect(areWorkoutItemRowEqual(baseRowProps, { ...baseRowProps, logs: nextLogs })).toBe(false);
    });
  });
});
