/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dumbbell, Zap, PlusCircle, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audio';

export interface RoutineEmptyStateProps {
  totalRoutinesCount: number;
  filteredCount: number;
  searchQuery: string;
  hasFilterActive: boolean;
  onClearFilters: () => void;
  onOpenGenerator: () => void;
  onGenerateQuickWorkout?: () => void;
  onCreateManualWorkout?: () => void;
}

export const RoutineEmptyState: React.FC<RoutineEmptyStateProps> = ({
  totalRoutinesCount,
  filteredCount,
  hasFilterActive,
  onClearFilters,
  onOpenGenerator,
  onGenerateQuickWorkout,
  onCreateManualWorkout,
}) => {
  if (totalRoutinesCount === 0) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-3xl bg-[#101828] border border-slate-800">
        <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">
          Nenhum treino gerado ainda
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
          Você pode gerar automaticamente com base nos seus parâmetros científicos, criar um treino rápido agora ou montar do zero.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {onGenerateQuickWorkout && (
            <button
              type="button"
              onClick={onGenerateQuickWorkout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Gerar Treino Rápido (Full Body)</span>
            </button>
          )}
          {onCreateManualWorkout && (
            <button
              type="button"
              onClick={onCreateManualWorkout}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Criar Treino Manual</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onOpenGenerator();
              soundManager.vibrate(10);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Personalizar & Gerar Treinos</span>
          </button>
        </div>
      </div>
    );
  }

  if (filteredCount === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-[#101828] border border-slate-800 text-xs text-slate-400 space-y-3">
        <p>Nenhuma rotina encontrada para os filtros selecionados.</p>
        {hasFilterActive && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs cursor-pointer transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  }

  return null;
};
