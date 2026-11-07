/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface FocusModeNavBarProps {
  focusedExerciseIdx: number;
  workoutItemsCount: number;
  currentExerciseName?: string;
  onPrev: () => void;
  onNext: () => void;
}

export const FocusModeNavBar: React.FC<FocusModeNavBarProps> = ({
  focusedExerciseIdx,
  workoutItemsCount,
  currentExerciseName,
  onPrev,
  onNext,
}) => {
  if (workoutItemsCount === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#0c1629] via-[#0f1d33] to-[#0c1629] border border-emerald-500/40 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
      <button
        type="button"
        disabled={focusedExerciseIdx <= 0}
        onClick={onPrev}
        className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer active:scale-95 transition-all"
      >
        <ChevronLeft className="w-4 h-4 text-emerald-400" />
        <span>Anterior</span>
      </button>

      <div className="text-center min-w-0 flex-1 px-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-black block">
          Modo Foco 1-Mão · Exercício {focusedExerciseIdx + 1} de {workoutItemsCount}
        </span>
        <span className="text-xs sm:text-sm font-black text-white truncate block">
          {currentExerciseName}
        </span>
      </div>

      <button
        type="button"
        disabled={focusedExerciseIdx >= workoutItemsCount - 1}
        onClick={onNext}
        className="min-h-[42px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-35 disabled:cursor-not-allowed text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-md"
      >
        <span>Próximo</span>
        <ChevronRight className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
