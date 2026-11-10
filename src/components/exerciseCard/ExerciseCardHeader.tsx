/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Clock,
  Minus,
  Plus,
  MoreVertical,
  TrendingUp,
} from 'lucide-react';
import { Exercise, ProgressionSuggestion } from '../../types/workout';
import { ExerciseCardMenu } from './ExerciseCardMenu';

interface ExerciseCardHeaderProps {
  index: number;
  exercise: Exercise;
  muscleName: string;
  setsCount: number;
  completedSetsCount: number;
  isAllSetsDone: boolean;
  restSeconds: number;
  onAdjustRest: (delta: number) => void;
  isCardCollapsed: boolean;
  onToggleCardCollapsed: () => void;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  isDragging?: boolean;
  isHoldingDrag?: boolean;
  onPointerDownDragHandle?: (index: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  firstSetWeight: string;
  progression: ProgressionSuggestion | null;
  onApplySuggestedWeight: (weight: number) => void;
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

export const ExerciseCardHeader: React.FC<ExerciseCardHeaderProps> = ({
  index,
  exercise,
  muscleName,
  setsCount,
  completedSetsCount,
  isAllSetsDone,
  restSeconds,
  onAdjustRest,
  isCardCollapsed,
  onToggleCardCollapsed,
  autoSaveStatus,
  isDragging = false,
  isHoldingDrag = false,
  onPointerDownDragHandle,
  firstSetWeight,
  progression,
  onApplySuggestedWeight,
  onAddSet,
  onRemoveSet,
  onOpenSwap,
  onOpenWarmup,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  onOpenAnalytics,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="p-3 sm:p-4 landscape:p-3 bg-slate-900/90 border-b border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Lado Esquerdo do Cabeçalho */}
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          {/* Alça de Segurar e Arrastar (Pointer Long Press Reorder) */}
          <button
            type="button"
            onPointerDown={(e) => onPointerDownDragHandle?.(index, e)}
            className={`drag-handle-touch touch-none select-none p-1.5 -ml-1 rounded-xl border cursor-grab active:cursor-grabbing shrink-0 flex items-center gap-1 transition-all ${
              isDragging
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 ring-2 ring-emerald-500/30 scale-105'
                : isHoldingDrag
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/70 ring-2 ring-amber-400/30 animate-pulse'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 border-slate-700/80 shadow-xs'
            }`}
            title="Segure e arraste para trocar a ordem deste exercício"
            aria-label={`Segure e arraste para trocar a ordem de ${exercise.name}`}
          >
            <GripVertical className="w-4 h-4" />
            <span className="text-[10px] font-mono font-black text-slate-300 pr-0.5">
              #{index + 1}
            </span>
          </button>

          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 shrink-0">
            {muscleName}
          </span>

          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-full">
            {exercise.name}
          </h3>

          {/* Badge de Progresso de Séries do Exercício */}
          <button
            type="button"
            onClick={onToggleCardCollapsed}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border transition-all cursor-pointer shrink-0 active:scale-95 ${
              isAllSetsDone
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                : completedSetsCount > 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                : 'bg-slate-800/90 text-slate-300 border-slate-700'
            }`}
            title={isCardCollapsed ? 'Expandir séries deste exercício' : 'Recolher séries deste exercício'}
          >
            <span>
              {isAllSetsDone ? '✓ Concluído' : `${completedSetsCount}/${setsCount} séries`}
            </span>
            {isCardCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {autoSaveStatus === 'saving' && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>salvando</span>
            </span>
          )}
        </div>

        {/* Lado Direito do Cabeçalho: Menu de 3 Pontos */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Menu de 3 Pontos */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-9 h-9 rounded-xl bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-heading flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Opções do exercício"
              aria-label="Opções do exercício"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <ExerciseCardMenu
                index={index}
                exercise={exercise}
                setsCount={setsCount}
                firstSetWeight={firstSetWeight}
                onCloseMenu={() => setShowMenu(false)}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onOpenSwap={onOpenSwap}
                onOpenWarmup={onOpenWarmup}
                onDeleteExercise={onDeleteExercise}
                onOpenAnalytics={onOpenAnalytics}
              />
            )}
          </div>
        </div>
      </div>

      {/* Temporizador de Descanso Discreto e Compacto */}
      <div className="flex items-center justify-center pt-0.5">
        <div className="inline-flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-slate-800 text-[11px] shadow-xs">
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[10px] font-medium text-slate-400">Descanso:</span>
          <button
            type="button"
            onClick={() => onAdjustRest(-15)}
            className="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold active:scale-90 transition-all touch-manipulation"
            title="-15s descanso"
            aria-label="Diminuir 15 segundos de descanso"
          >
            <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
          </button>
          <span
            className="text-slate-200 font-mono font-bold text-[11px] min-w-[24px] text-center"
            title="Tempo de descanso configurado para este exercício"
          >
            {restSeconds}s
          </span>
          <button
            type="button"
            onClick={() => onAdjustRest(15)}
            className="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer font-bold active:scale-90 transition-all touch-manipulation"
            title="+15s descanso"
            aria-label="Aumentar 15 segundos de descanso"
          >
            <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Banner Preditivo de Sobrecarga Progressiva */}
      {progression && progression.status === 'progress' && (
        <div className="w-full bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fadeIn">
          <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-white text-xs">
                  ⚡ Sobrecarga Preditiva: <strong className="text-emerald-400 font-mono">{progression.suggestedWeight}kg</strong>
                </span>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                  +{progression.suggestedWeight - (progression.currentWeight || 0)}kg
                </span>
              </div>
              <span className="text-[10.5px] text-slate-300 leading-snug break-words block mt-0.5">
                {progression.reason}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onApplySuggestedWeight(progression.suggestedWeight)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shadow-sm transition-all cursor-pointer shrink-0 active:scale-95 text-center"
          >
            Aplicar Carga
          </button>
        </div>
      )}
    </div>
  );
};
