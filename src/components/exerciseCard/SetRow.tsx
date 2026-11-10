/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Pencil,
  Check,
  Minus,
  Plus,
  Flame,
  Copy,
  Zap,
  Trash2,
} from 'lucide-react';
import { calculate1RM } from '../../utils/storage';
import { checkSetPR, ExercisePRData } from '../../utils/prEngine';
import { soundManager } from '../../utils/audio';
import { SetLogData, LocalSetLog } from './types';

interface SetRowProps {
  setNum: number;
  sIdx: number;
  exerciseId: string;
  exerciseName: string;
  logKey: string;
  setLog: SetLogData;
  localLog: LocalSetLog;
  isExpanded: boolean;
  onToggleExpand: (logKey: string, expanded: boolean) => void;
  prevSetRecord: { weight: string; reps: string } | null;
  setAutoProgression: { suggestedKg: number; incrementKg: number } | null;
  historicalPR: ExercisePRData;
  targetMaxReps: number;
  prevSessionSet: { weight?: string; reps?: string } | null;
  onInputChange: (logKey: string, field: 'weight' | 'reps', val: string) => void;
  onCompleteSet: (logKey: string, finalWeight: string, finalReps: string) => void;
  onReplicateSet?: (targetSetNum: number, sourceSetNum: number) => void;
  onDeleteSet?: (setNum: number) => void;
}

export const SetRow: React.FC<SetRowProps> = React.memo(({
  setNum,
  sIdx,
  exerciseName,
  logKey,
  setLog,
  localLog,
  isExpanded,
  onToggleExpand,
  prevSetRecord,
  setAutoProgression,
  historicalPR,
  targetMaxReps,
  prevSessionSet,
  onInputChange,
  onCompleteSet,
  onReplicateSet,
  onDeleteSet,
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const currWeightVal = localLog.weight !== undefined ? localLog.weight : setLog.weight;
  const currRepsVal = localLog.reps !== undefined ? localLog.reps : setLog.reps;

  // 1RM Estimado puro
  const est1RM = calculate1RM(currWeightVal, currRepsVal);

  // Detecção de PR na série
  const setWeightNum = parseFloat(currWeightVal) || 0;
  const setRepsNum = parseInt(currRepsVal, 10) || 0;
  const prResult = checkSetPR(exerciseName, setWeightNum, setRepsNum, historicalPR);

  // Valores de fallback inteligentes
  const smartFallbackWeight =
    (prevSessionSet?.weight && parseFloat(prevSessionSet.weight) > 0 ? prevSessionSet.weight : '') ||
    (prevSetRecord?.weight && parseFloat(prevSetRecord.weight) > 0 ? prevSetRecord.weight : '') ||
    (setAutoProgression?.suggestedKg ? setAutoProgression.suggestedKg.toString() : '');

  const smartFallbackReps =
    (prevSessionSet?.reps && parseInt(prevSessionSet.reps, 10) > 0 ? prevSessionSet.reps : '') ||
    (prevSetRecord?.reps && parseInt(prevSetRecord.reps, 10) > 0 ? prevSetRecord.reps : '') ||
    targetMaxReps.toString();

  const adjustWeightByStep = (delta: number) => {
    const baseW = parseFloat(currWeightVal) || parseFloat(smartFallbackWeight) || 20;
    const nextW = Math.max(0, Math.round((baseW + delta) * 10) / 10);
    onInputChange(logKey, 'weight', nextW.toString());
    soundManager.vibrate(15);
  };

  const adjustRepsByStep = (delta: number) => {
    const baseR = parseInt(currRepsVal, 10) || parseInt(smartFallbackReps, 10) || targetMaxReps;
    const nextR = Math.max(1, baseR + delta);
    onInputChange(logKey, 'reps', nextR.toString());
    soundManager.vibrate(15);
  };

  const handleFinishSetClick = () => {
    // Feedback tátil discreto e imediato via Vibration API no celular
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(setLog.done ? 20 : [35, 25, 45]);
      } catch {}
    } else {
      soundManager.vibrate(setLog.done ? 20 : [35, 25, 45]);
    }

    const finalWeight =
      currWeightVal && parseFloat(currWeightVal) > 0
        ? currWeightVal
        : smartFallbackWeight || currWeightVal;
    const finalReps =
      currRepsVal && parseInt(currRepsVal, 10) > 0
        ? currRepsVal
        : smartFallbackReps || currRepsVal;

    onCompleteSet(logKey, finalWeight, finalReps);
  };

  // Segurar e arrastar pro lado esquerdo para excluir a série individualmente
  // Isolamento estrito de eventos com stopPropagation para nunca mover o card pai
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, button, select, a')) {
      return;
    }
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsSwiping(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    e.stopPropagation();
    const diffX = e.clientX - pointerStartRef.current.x;
    const diffY = e.clientY - pointerStartRef.current.y;

    // Exige intenção horizontal nítida e movimento mínimo para não ativar ao rolar verticalmente
    if (diffX < -25 && Math.abs(diffX) > Math.abs(diffY) * 1.8) {
      setIsSwiping(true);
      setSwipeOffset(Math.max(-100, Math.min(0, diffX)));
    } else if (!isSwiping && Math.abs(diffY) > 15) {
      pointerStartRef.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (pointerStartRef.current && isSwiping) {
      if (swipeOffset <= -75 && onDeleteSet) {
        soundManager.vibrate(30);
        onDeleteSet(setNum);
      }
    }
    pointerStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    pointerStartRef.current = null;
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  return (
    <div
      data-set-row="true"
      className="relative overflow-hidden border-b border-slate-800/60 last:border-b-0 touch-pan-y"
    >
      {/* Camada vermelha revelada ao arrastar para a esquerda */}
      <div
        className="absolute inset-y-0 right-0 w-24 bg-rose-600 flex items-center justify-center gap-1.5 text-white font-black text-xs px-2 select-none cursor-pointer z-0"
        onClick={(e) => {
          e.stopPropagation();
          if (onDeleteSet) {
            soundManager.vibrate(30);
            onDeleteSet(setNum);
          }
        }}
      >
        <Trash2 className="w-4 h-4 stroke-[2.5]" />
        <span>Excluir</span>
      </div>

      {/* Conteúdo da linha deslocável */}
      <div
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className={`relative z-10 bg-[#080d19] transition-transform ${isSwiping ? 'duration-0' : 'duration-200'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* ==========================================
            MODO A: SÉRIE CONCLUÍDA (Compacta)
            ========================================== */}
        {setLog.done && !isExpanded ? (
          <div className="p-2 sm:p-2.5 bg-emerald-950/15 transition-colors">
            <div className="grid grid-cols-12 gap-1 items-center">
              {/* 1. Anterior */}
              <div className="hidden sm:flex sm:col-span-3 items-center justify-center text-center font-mono text-[11px] text-slate-500 truncate">
                {prevSetRecord ? `${prevSetRecord.weight}k × ${prevSetRecord.reps}` : '-'}
              </div>

              {/* 2. Carga */}
              <div className="col-span-6 sm:col-span-4 text-center">
                <span className="font-mono font-black text-emerald-300 text-sm sm:text-base">
                  {currWeightVal || '0'} kg
                </span>
              </div>

              {/* 3. Reps */}
              <div className="col-span-4 sm:col-span-3 text-center">
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {currRepsVal || '0'} reps
                </span>
              </div>

              {/* 4. Ações */}
              <div className="col-span-2 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleExpand(logKey, true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
                  title="Editar série"
                  aria-label="Editar série"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleFinishSetClick}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center cursor-pointer shadow-sm active:scale-90 transition-transform touch-manipulation"
                  title="Desmarcar série"
                  aria-label="Desmarcar série"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Detalhes extras se houver PR */}
            {prResult && (
              <div className="mt-1 flex items-center justify-center">
                <span className="text-amber-300 font-bold text-[10px] flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                  <Flame className="w-3 h-3 text-amber-400 fill-current" />
                  <span>NOVO RECORDE PESSOAL (PR)!</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          /* ==========================================
              MODO B: SÉRIE PENDENTE / EXPANDIDA
              ========================================== */
          <div
            className={`p-2.5 sm:p-3 transition-colors ${
              setLog.done ? 'bg-emerald-950/20' : 'bg-transparent hover:bg-slate-900/30'
            }`}
          >
            <div className="grid grid-cols-12 gap-1 items-center">
              {/* 1. Anterior */}
              <div className="hidden sm:flex sm:col-span-3 items-center justify-center text-center">
                {prevSetRecord ? (
                  <button
                    type="button"
                    onClick={() => {
                      onInputChange(logKey, 'weight', prevSetRecord.weight);
                      onInputChange(logKey, 'reps', prevSetRecord.reps);
                      soundManager.vibrate(15);
                    }}
                    className="font-mono text-[11px] text-slate-400 hover:text-sky-300 transition-colors cursor-pointer truncate"
                    title="Toque para preencher com o treino anterior"
                  >
                    {prevSetRecord.weight}k × {prevSetRecord.reps}
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-slate-600">-</span>
                )}
              </div>

              {/* 2. Carga (kg) */}
              <div className="col-span-6 sm:col-span-4 flex items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustWeightByStep(-2.5)}
                  className="w-8 sm:w-9 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-90 touch-manipulation shadow-sm shrink-0"
                  title="Diminuir carga (-2.5 kg)"
                  aria-label="Diminuir carga em 2.5 kg"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <div className="relative flex items-center justify-center flex-1 max-w-[76px] sm:max-w-[88px]">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder={smartFallbackWeight || '0'}
                    value={currWeightVal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/,/g, '.');
                      onInputChange(logKey, 'weight', sanitized);
                    }}
                    className="w-full h-10 bg-[#060a12] border border-slate-700 focus:border-emerald-500 rounded-xl px-1 text-center font-mono font-black text-sm sm:text-base text-white focus:outline-none transition-colors"
                  />
                  <span className="absolute right-1 text-[9px] text-slate-500 pointer-events-none font-mono">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustWeightByStep(2.5)}
                  className="w-8 sm:w-9 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-90 touch-manipulation shadow-sm shrink-0"
                  title="Aumentar carga (+2.5 kg)"
                  aria-label="Aumentar carga em 2.5 kg"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* 3. Repetições */}
              <div className="col-span-4 sm:col-span-3 flex items-center justify-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustRepsByStep(-1)}
                  className="w-7 sm:w-8 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-90 touch-manipulation shadow-sm shrink-0"
                  title="Diminuir 1 repetição"
                  aria-label="Diminuir 1 repetição"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <div className="relative flex items-center justify-center flex-1 max-w-[50px] sm:max-w-[58px]">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder={smartFallbackReps || targetMaxReps.toString()}
                    value={currRepsVal}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^0-9]/g, '');
                      onInputChange(logKey, 'reps', sanitized);
                    }}
                    className="w-full h-10 bg-[#060a12] border border-slate-700 focus:border-emerald-500 rounded-xl px-1 text-center font-mono font-bold text-sm sm:text-base text-white focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustRepsByStep(1)}
                  className="w-7 sm:w-8 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-90 touch-manipulation shadow-sm shrink-0"
                  title="Aumentar 1 repetição"
                  aria-label="Aumentar 1 repetição"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* 4. Concluir / Desmarcar */}
              <div className="col-span-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleFinishSetClick}
                  className={`w-10 h-10 sm:w-11 sm:h-10 min-w-[40px] min-h-[40px] rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90 touch-manipulation ${
                    setLog.done
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 active:bg-emerald-500/35'
                  }`}
                  title={setLog.done ? 'Desmarcar série' : 'Concluir série'}
                  aria-label={setLog.done ? 'Desmarcar série' : 'Concluir série'}
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Sugestão de Carga Inteligente */}
            {setAutoProgression && !setLog.done && (
              <div className="mt-2 p-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Sugestão: <strong className="font-mono text-white">{setAutoProgression.suggestedKg} kg</strong> (+{setAutoProgression.incrementKg} kg)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onInputChange(logKey, 'weight', setAutoProgression.suggestedKg.toString());
                    if (!currRepsVal) {
                      onInputChange(logKey, 'reps', targetMaxReps.toString());
                    }
                    soundManager.vibrate(20);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Badge de Novo Recorde Pessoal */}
            {prResult && (
              <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-between gap-2 animate-pulse shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span>
                    🔥 NOVO PR!{' '}
                    {prResult.isWeightPR
                      ? `+${prResult.diffWeight}kg carga máx.!`
                      : `+${prResult.diff1RM}kg 1RM!`}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                  Recorde
                </span>
              </div>
            )}

            {/* Botões Rápidos de Replicação da Série Anterior */}
            <div className="flex items-center justify-between gap-1.5 mt-2 px-0.5 text-[11px] text-slate-400 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {sIdx > 0 && prevSessionSet && (parseFloat(prevSessionSet.weight || '0') > 0) && (
                  <button
                    type="button"
                    onClick={() => onReplicateSet?.(setNum, setNum - 1)}
                    className="inline-flex items-center gap-1 font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
                    title="Copiar carga e repetições da série imediatamente anterior"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>Copiar anterior ({prevSessionSet.weight}kg × {prevSessionSet.reps || '0'})</span>
                  </button>
                )}
                {est1RM && est1RM > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    1RM ~{est1RM}kg
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SetRow.displayName = 'SetRow';
