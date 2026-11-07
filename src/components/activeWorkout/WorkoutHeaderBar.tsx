/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowLeft, 
  Clock, 
  FileEdit, 
  Check, 
  Flame, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { GeneratedWorkoutRoutine } from '../../types/workout';

export interface WorkoutHeaderBarProps {
  routine: GeneratedWorkoutRoutine;
  onBackToList: () => void;
  elapsedSecs: number;
  completedSets: number;
  totalSets: number;
  progressPercent: number;
  formatElapsed: (totalSecs: number) => string;
  localNotes: string;
  notesSaveStatus: 'idle' | 'saving' | 'saved';
  onNotesChange: (val: string) => void;
  onNotesBlur: () => void;
  beatenSetsCount: number;
  onOpenMobility: () => void;
  mobilityTotalExercises: number;
  mobilityTotalMinutes: number;
  onFinishSession: () => void;
}

export const WorkoutHeaderBar: React.FC<WorkoutHeaderBarProps> = ({
  routine,
  onBackToList,
  elapsedSecs,
  completedSets,
  totalSets,
  progressPercent,
  formatElapsed,
  localNotes,
  notesSaveStatus,
  onNotesChange,
  onNotesBlur,
  beatenSetsCount,
  onOpenMobility,
  mobilityTotalExercises,
  mobilityTotalMinutes,
  onFinishSession,
}) => {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 sm:p-4 landscape:p-3 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBackToList}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            title="Voltar à lista de treinos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                {routine.letter}
              </span>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {routine.name}
              </h1>
              <span className="text-[11px] text-slate-400 hidden xs:inline truncate">
                · {routine.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Duração & Progresso */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          <div className="px-2.5 py-1 rounded-xl bg-[#080d19] border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white text-xs">{formatElapsed(elapsedSecs)}</span>
          </div>

          <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-bold flex items-center gap-1">
            <span>{completedSets}/{totalSets}</span>
            <span className="text-[10px] text-emerald-400/80">({progressPercent}%)</span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso Fina */}
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Anotações do Treino no Topo com Auto-Save Debounced */}
      <div className="mt-2.5 bg-[#090e1a] border border-slate-800/90 rounded-2xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <FileEdit className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Anotações do Treino
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {notesSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Salvando...</span>
              </span>
            )}
            {notesSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Salvo</span>
              </span>
            )}
            {notesSaveStatus === 'idle' && localNotes.trim().length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">
                Auto-salvo
              </span>
            )}
          </div>
        </div>
        <textarea
          value={localNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={onNotesBlur}
          placeholder="Observações rápidas: carga subiu fácil, dor articular zero, sensação geral..."
          rows={2}
          className="w-full bg-[#060a14] border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors resize-none font-medium leading-relaxed"
        />
      </div>

      {/* Alertas de Recordes Batidos e Aquecimento Articular */}
      {(beatenSetsCount > 0 || completedSets === 0) && (
        <div className="mt-2.5 grid grid-cols-1 landscape:grid-cols-2 gap-2">
          {beatenSetsCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                <span>{beatenSetsCount} {beatenSetsCount === 1 ? 'série bateu' : 'séries bateram'} o histórico anterior!</span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                +2.5% a 5% próx.
              </span>
            </div>
          )}

          {completedSets === 0 && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 min-w-0 flex-1">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="leading-snug break-words flex-1">
                  Aquecimento articular ({mobilityTotalExercises} etapas · ~{mobilityTotalMinutes} min)
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenMobility}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
              >
                Iniciar Aquecimento
              </button>
            </div>
          )}
        </div>
      )}

      {/* Banner de Treino 100% Concluído */}
      {totalSets > 0 && completedSets === totalSets && (
        <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-400/50 flex flex-col sm:flex-row landscape:flex-row items-center justify-between gap-2.5 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-extrabold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>🎉 Parabéns! Todas as {totalSets} séries de hoje foram concluídas!</span>
          </div>
          <button
            type="button"
            onClick={onFinishSession}
            className="w-full sm:w-auto landscape:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95 shrink-0"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Concluir & Salvar Treino Agora</span>
          </button>
        </div>
      )}
    </div>
  );
};
