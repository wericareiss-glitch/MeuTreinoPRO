/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Minus,
  RefreshCw,
  Flame,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { Exercise } from '../../types/workout';

interface ExerciseCardMenuProps {
  index: number;
  exercise: Exercise;
  setsCount: number;
  firstSetWeight: string;
  onCloseMenu: () => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenSwap: (index: number) => void;
  onOpenWarmup: (name: string, targetWeight: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDeleteExercise?: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
}

export const ExerciseCardMenu: React.FC<ExerciseCardMenuProps> = ({
  index,
  exercise,
  setsCount,
  firstSetWeight,
  onCloseMenu,
  onAddSet,
  onRemoveSet,
  onOpenSwap,
  onOpenWarmup,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  onOpenAnalytics,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="absolute right-0 top-9 w-60 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 animate-fadeIn space-y-1">
      {/* 1. Adicionar Série */}
      <button
        type="button"
        onClick={() => {
          onCloseMenu();
          onAddSet(index);
        }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 transition-colors text-left cursor-pointer active:scale-95"
      >
        <div className="flex items-center gap-2.5">
          <Plus className="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
          <div>
            <span className="block font-bold">Adicionar Série</span>
            <span className="block text-[10px] text-slate-400">Criar série #{setsCount + 1}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/25 px-2 py-0.5 rounded-lg border border-emerald-500/40">
          +{setsCount + 1}
        </span>
      </button>

      {/* 2. Remover Última Série */}
      {setsCount > 1 && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onRemoveSet(index);
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer active:scale-95"
        >
          <div className="flex items-center gap-2.5">
            <Minus className="w-4 h-4 text-rose-400 stroke-[2.5] shrink-0" />
            <div>
              <span className="block font-bold">Remover Série</span>
              <span className="block text-[10px] text-slate-400">Excluir última série (#{setsCount})</span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/30">
            -{setsCount}
          </span>
        </button>
      )}

      {/* 3. Trocar Exercício */}
      <button
        type="button"
        onClick={() => {
          onCloseMenu();
          onOpenSwap(index);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Trocar Exercício</span>
      </button>

      {/* 4. Aquecimento Inteligente */}
      <button
        type="button"
        onClick={() => {
          onCloseMenu();
          onOpenWarmup(exercise.name, firstSetWeight);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-300 hover:bg-orange-950/40 transition-colors text-left cursor-pointer"
      >
        <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <div>
          <span className="block font-bold">Aquecer</span>
          <span className="block text-[10px] text-slate-400">Calcular pirâmide de aquecimento</span>
        </div>
      </button>

      {/* 5. Gráficos & Histórico */}
      {onOpenAnalytics && (
        <button
          type="button"
          onClick={() => {
            onCloseMenu();
            onOpenAnalytics(exercise.name);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Gráficos & Histórico</span>
        </button>
      )}

      {/* 6. Ordem: Subir / Descer */}
      <div className="pt-1 border-t border-slate-800 flex items-center justify-between px-2 py-1">
        <span className="text-[11px] text-slate-400 font-medium">Ordem:</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canMoveUp}
            onClick={() => onMoveUp?.(index)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold ${
              canMoveUp
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Mover para cima"
          >
            <ArrowUp className="w-3 h-3" />
            <span>Subir</span>
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            onClick={() => onMoveDown?.(index)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold ${
              canMoveDown
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Mover para baixo"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Descer</span>
          </button>
        </div>
      </div>

      {/* 7. Remover do Treino */}
      {onDeleteExercise && (
        <div className="pt-1 border-t border-slate-800">
          {isDeleting ? (
            <div className="p-2 bg-rose-950/40 rounded-xl border border-rose-900/50 space-y-1.5">
              <span className="text-[11px] font-bold text-rose-300 block">Excluir este exercício?</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleting(false);
                    onCloseMenu();
                    onDeleteExercise(index);
                  }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer text-center"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer text-center"
                >
                  Não
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsDeleting(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Remover do Treino</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
