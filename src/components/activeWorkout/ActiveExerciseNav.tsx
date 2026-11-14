/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Focus, List } from 'lucide-react';
import { WorkoutItem, WorkoutLogs } from '../../types/workout';

export type ActiveWorkoutViewMode = 'focus' | 'list';

export interface ActiveExerciseNavProps {
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  focusedIndex: number;
  viewMode: ActiveWorkoutViewMode;
  onSelectExercise: (index: number) => void;
  onChangeViewMode: (mode: ActiveWorkoutViewMode) => void;
}

export function getExerciseCompletionStats(
  item: WorkoutItem,
  logs: WorkoutLogs
): { doneSets: number; totalSets: number; isComplete: boolean } {
  let doneSets = 0;
  for (let s = 1; s <= item.sets; s++) {
    if (logs[`${item.exercise.id}_${s}`]?.done) {
      doneSets++;
    }
  }
  return {
    doneSets,
    totalSets: item.sets,
    isComplete: item.sets > 0 && doneSets >= item.sets,
  };
}

export function findNextIncompleteExerciseIndex(
  workoutItems: WorkoutItem[],
  logs: WorkoutLogs,
  fromIndex: number
): number {
  if (workoutItems.length === 0) return -1;

  for (let i = fromIndex + 1; i < workoutItems.length; i++) {
    if (!getExerciseCompletionStats(workoutItems[i], logs).isComplete) {
      return i;
    }
  }
  for (let i = 0; i < fromIndex; i++) {
    if (!getExerciseCompletionStats(workoutItems[i], logs).isComplete) {
      return i;
    }
  }
  return -1;
}

export function findFirstIncompleteExerciseIndex(
  workoutItems: WorkoutItem[],
  logs: WorkoutLogs
): number {
  const idx = workoutItems.findIndex(
    (item) => !getExerciseCompletionStats(item, logs).isComplete
  );
  return idx >= 0 ? idx : 0;
}

export const ActiveExerciseNav: React.FC<ActiveExerciseNavProps> = ({
  workoutItems,
  logs,
  focusedIndex,
  viewMode,
  onSelectExercise,
  onChangeViewMode,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeChip = chipRefs.current[focusedIndex];
    if (!container || !activeChip) return;

    const targetLeft =
      activeChip.offsetLeft - container.clientWidth / 2 + activeChip.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [focusedIndex, workoutItems.length]);

  if (workoutItems.length === 0) return null;

  const safeFocused = Math.max(0, Math.min(focusedIndex, workoutItems.length - 1));

  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 shadow-md space-y-2">
      {/* Linha superior: Contador + Seletor de Modo (1 por vez | Lista) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 tabular-nums whitespace-nowrap">
            Exercício {safeFocused + 1} de {workoutItems.length}
          </span>
          <span className="text-slate-700 hidden sm:inline">·</span>
          <span className="text-xs font-bold text-slate-200 truncate hidden sm:inline">
            {workoutItems[safeFocused]?.exercise.name}
          </span>
        </div>

        <div
          className="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0"
          role="group"
          aria-label="Modo de exibição dos exercícios"
        >
          <button
            type="button"
            onClick={() => onChangeViewMode('focus')}
            className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'focus'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mostrar 1 exercício por vez para evitar rolagem"
          >
            <Focus className="w-3.5 h-3.5 shrink-0" />
            <span>1 por vez</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('list')}
            className={`min-h-[36px] px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'list'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mostrar todos os exercícios em lista contínua"
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Barra horizontal de acesso rápido aos exercícios */}
      <div
        ref={scrollContainerRef}
        role="tablist"
        aria-label="Navegação rápida entre exercícios"
        className="flex items-center gap-1.5 overflow-x-auto theme-scrollbar pb-0.5 scroll-smooth"
      >
        {workoutItems.map((item, idx) => {
          const { doneSets, totalSets, isComplete } = getExerciseCompletionStats(item, logs);
          const isActive = idx === safeFocused;

          return (
            <button
              key={item.id}
              ref={(el) => {
                chipRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectExercise(idx)}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-left inline-flex items-center gap-2 transition-all cursor-pointer shrink-0 active:scale-[0.98] ${
                isActive
                  ? isComplete
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-sm'
                    : 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                  : isComplete
                  ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-300/90 hover:border-emerald-500/60'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums ${
                  isComplete
                    ? 'bg-emerald-500 text-slate-950'
                    : isActive
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </span>

              <span className="text-xs font-bold whitespace-nowrap max-w-[140px] truncate">
                {item.exercise.name}
              </span>

              <span
                className={`text-[11px] font-mono tabular-nums whitespace-nowrap shrink-0 ${
                  isComplete
                    ? 'text-emerald-300 font-bold'
                    : isActive
                    ? 'text-sky-300 font-bold'
                    : 'text-slate-500'
                }`}
              >
                {doneSets}/{totalSets}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export interface FocusExercisePagerProps {
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  focusedIndex: number;
  onSelectExercise: (index: number) => void;
}

export const FocusExercisePager: React.FC<FocusExercisePagerProps> = ({
  workoutItems,
  logs,
  focusedIndex,
  onSelectExercise,
}) => {
  if (workoutItems.length <= 1) return null;

  const hasPrev = focusedIndex > 0;
  const hasNext = focusedIndex < workoutItems.length - 1;
  const prevItem = hasPrev ? workoutItems[focusedIndex - 1] : null;
  const nextItem = hasNext ? workoutItems[focusedIndex + 1] : null;
  const nextDone = nextItem ? getExerciseCompletionStats(nextItem, logs).isComplete : false;

  return (
    <div className="grid grid-cols-2 gap-2.5 pt-1">
      <button
        type="button"
        disabled={!hasPrev}
        onClick={() => hasPrev && onSelectExercise(focusedIndex - 1)}
        className={`min-h-[48px] px-3 py-2 rounded-2xl border flex items-center gap-2 transition-all text-left ${
          hasPrev
            ? 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200 cursor-pointer active:scale-[0.98]'
            : 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
        }`}
      >
        <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Anterior
          </span>
          <span className="block text-xs font-bold truncate">
            {prevItem ? `${focusedIndex}. ${prevItem.exercise.name}` : 'Início do treino'}
          </span>
        </div>
      </button>

      <button
        type="button"
        disabled={!hasNext}
        onClick={() => hasNext && onSelectExercise(focusedIndex + 1)}
        className={`min-h-[48px] px-3 py-2 rounded-2xl border flex items-center justify-end gap-2 transition-all text-right ${
          hasNext
            ? nextDone
              ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-500/35 text-emerald-200 cursor-pointer active:scale-[0.98]'
              : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-white cursor-pointer active:scale-[0.98]'
            : 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Próximo
          </span>
          <span className="block text-xs font-bold truncate">
            {nextItem ? `${focusedIndex + 2}. ${nextItem.exercise.name}` : 'Último exercício'}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 text-sky-400" />
      </button>
    </div>
  );
};
