/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Plus, Dumbbell } from 'lucide-react';

export interface WorkoutToolbarProps {
  workoutItemsCount: number;
  onOpenMobility: () => void;
  onOpenAddExercise: () => void;
}

export const WorkoutToolbar: React.FC<WorkoutToolbarProps> = ({
  workoutItemsCount,
  onOpenMobility,
  onOpenAddExercise,
}) => {
  return (
    <div className="bg-[#0b1220] border border-slate-800/90 rounded-2xl px-3 py-2 shadow-md flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
          <Dumbbell className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-extrabold text-white block leading-tight">
            Exercícios ({workoutItemsCount})
          </span>
          <span className="text-[10px] text-slate-400 truncate hidden sm:block">
            Arraste o card para a esquerda para excluir
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenMobility}
          className="min-h-[40px] flex px-2.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
          title="Rotina de Aquecimento Articular Específica (3-5 min)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Mobilidade</span>
        </button>

        <button
          type="button"
          onClick={onOpenAddExercise}
          className="min-h-[40px] flex px-2.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap shrink-0"
          title="Adicionar novo exercício ao treino ativo"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exercício</span>
        </button>
      </div>
    </div>
  );
};
