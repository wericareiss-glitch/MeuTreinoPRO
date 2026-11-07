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
import { SetIntensityType, SET_INTENSITY_TYPES } from '../../types/workout';
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
  onUpdateSetType: (logKey: string, type: SetIntensityType) => void;
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
  onUpdateSetType,
  onCompleteSet,
  onReplicateSet,
  onDeleteSet,
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const currWeightVal = localLog.weight !== undefined ? localLog.weight : setLog.weight;
  const currRepsVal = localLog.reps !== undefined ? localLog.reps : setLog.reps;
  const currentSetType: SetIntensityType = setLog.setType || 'T';
  const setTypeMeta = SET_INTENSITY_TYPES.find((t) => t.code === currentSetType) || SET_INTENSITY_TYPES[1];

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

  const cycleSetType = () => {
    const types: SetIntensityType[] = ['T', 'W', 'F', 'D', 'RP'];
    const curIdx = types.indexOf(currentSetType);
    const nextType = types[(curIdx + 1) % types.length];
    onUpdateSetType(logKey, nextType);
    soundManager.vibrate(15);
  };

  const handleFinishSetClick = () => {
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
              {/* 1. # Série */}
              <div className="col-span-1 flex items-center justify-center">
                <span className="w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center bg-emerald-500 text-slate-950 shadow-sm">
                  {setNum}
                </span>
              </div>

              {/* 2. Tipo */}
              <div className="col-span-1 flex items-center justify-center">
                <span className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black border ${setTypeMeta.badgeClass}`}>
                  {currentSetType}
                </span>
              </div>

              {/* 3. Anterior */}
              <div className="hidden sm:flex sm:col-span-2 items-center justify-center text-center font-mono text-[11px] text-slate-500 truncate">
                {prevSetRecord ? `${prevSetRecord.weight}k×${prevSetRecord.reps}` : '-'}
              </div>

              {/* 4. Carga */}
              <div className="col-span-5 sm:col-span-4 text-center">
                <span className="font-mono font-black text-emerald-300 text-sm sm:base">
                  {currWeightVal || '0'} kg
                </span>
              </div>

              {/* 5. Reps */}
              <div className="col-span-3 sm:col-span-2 text-center">
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {currRepsVal || '0'} reps
                </span>
              </div>

              {/* 6. Ações */}
              <div className="col-span-2 flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onToggleExpand(logKey, true)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Editar série"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFinishSetClick}
                  className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center cursor-pointer shadow-sm active:scale-90 transition-transform"
                  title="Desmarcar série"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
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
              {/* 1. # Série */}
              <div className="col-span-1 flex items-center justify-center">
                <span
                  className={`w-6 h-6 rounded-md font-mono font-black text-xs flex items-center justify-center ${
                    setLog.done
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}
                >
                  {setNum}
                </span>
              </div>

              {/* 2. Tipo */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={cycleSetType}
                  title={`${setTypeMeta.label}: ${setTypeMeta.description}. Toque para alternar.`}
                  className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black border transition-all cursor-pointer ${setTypeMeta.badgeClass}`}
                >
                  {currentSetType}
                </button>
              </div>

              {/* 3. Anterior */}
              <div className="hidden sm:flex sm:col-span-2 items-center justify-center text-center">
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
                    {prevSetRecord.weight}k×{prevSetRecord.reps}
                  </button>
                ) : (
                  <span className="font-mono text-[11px] text-slate-600">-</span>
                )}
              </div>

              {/* 4. Carga (kg) */}
              <div className="col-span-5 sm:col-span-4 flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustWeightByStep(-2.5)}
                  className="w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <div className="relative flex items-center justify-center">
                  <input
                    type="number"
                    step="0.5"
                    placeholder={smartFallbackWeight || '0'}
                    value={currWeightVal}
                    onChange={(e) => onInputChange(logKey, 'weight', e.target.value)}
                    className="w-16 sm:w-20 bg-[#060a12] border border-slate-700 focus:border-emerald-500 rounded-lg px-1.5 py-1 text-center font-mono font-black text-xs sm:text-sm text-white focus:outline-none"
                  />
                  <span className="absolute right-1 text-[9px] text-slate-500 pointer-events-none font-mono">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustWeightByStep(2.5)}
                  className="w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* 5. Repetições */}
              <div className="col-span-3 sm:col-span-2 flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustRepsByStep(-1)}
                  className="w-6 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  step="1"
                  placeholder={smartFallbackReps || targetMaxReps.toString()}
                  value={currRepsVal}
                  onChange={(e) => onInputChange(logKey, 'reps', e.target.value)}
                  className="w-10 sm:w-12 bg-[#060a12] border border-slate-700 focus:border-emerald-500 rounded-lg px-1 py-1 text-center font-mono font-bold text-xs sm:text-sm text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => adjustRepsByStep(1)}
                  className="w-6 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* 6. Concluir / Desmarcar */}
              <div className="col-span-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleFinishSetClick}
                  className={`w-9 h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
                    setLog.done
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25'
                  }`}
                  title={setLog.done ? 'Desmarcar série' : 'Concluir série'}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
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
                    <span>Copiar #{setNum - 1} ({prevSessionSet.weight}kg×{prevSessionSet.reps || '0'})</span>
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
