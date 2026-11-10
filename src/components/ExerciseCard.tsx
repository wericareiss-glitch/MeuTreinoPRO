/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Trophy, Copy, Trash2 } from 'lucide-react';
import { WorkoutItem, WorkoutLogs, WorkoutSessionSummary } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { safeStorage } from '../utils/storage';
import { authStorage } from '../utils/auth';
import { getOptimalProgressionSuggestion } from '../utils/progressiveOverload';
import { soundManager } from '../utils/audio';
import { getExerciseHistoricalPR, checkSetPR } from '../utils/prEngine';
import { SmartTermTooltip } from './SmartTermTooltip';

import { ExerciseCardProps, LocalSetLog } from './exerciseCard/types';
import { ExerciseCardHeader } from './exerciseCard/ExerciseCardHeader';
import { SetRow } from './exerciseCard/SetRow';

export type { ExerciseCardProps };

export function areExerciseLogsEqualForCard(
  exerciseId: string,
  setsCount: number,
  prevLogs: WorkoutLogs,
  nextLogs: WorkoutLogs
): boolean {
  if (prevLogs === nextLogs) return true;
  const maxSets = Math.max(setsCount, 10);
  for (let s = 1; s <= maxSets; s++) {
    const key = `${exerciseId}_${s}`;
    const a = prevLogs[key];
    const b = nextLogs[key];
    if (a === b) continue;
    if (!a || !b) return false;
    if (
      a.weight !== b.weight ||
      a.reps !== b.reps ||
      a.done !== b.done
    ) {
      return false;
    }
  }
  return true;
}

export function areExerciseCardPropsEqual(
  prev: ExerciseCardProps,
  next: ExerciseCardProps
): boolean {
  if (
    prev.index !== next.index ||
    prev.canMoveUp !== next.canMoveUp ||
    prev.canMoveDown !== next.canMoveDown ||
    prev.isDragging !== next.isDragging ||
    prev.dragOffsetY !== next.dragOffsetY ||
    prev.isHoldingDrag !== next.isHoldingDrag ||
    prev.isDropTarget !== next.isDropTarget ||
    prev.sessions !== next.sessions
  ) {
    return false;
  }

  if (prev.item !== next.item) {
    if (
      prev.item.id !== next.item.id ||
      prev.item.sets !== next.item.sets ||
      prev.item.reps !== next.item.reps ||
      prev.item.rest !== next.item.rest ||
      prev.item.muscleKey !== next.item.muscleKey ||
      prev.item.exercise.id !== next.item.exercise.id ||
      prev.item.exercise.name !== next.item.exercise.name
    ) {
      return false;
    }
  }

  const exId = next.item.exercise.id;
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.logs, next.logs)) {
    return false;
  }
  if (!areExerciseLogsEqualForCard(exId, next.item.sets, prev.history, next.history)) {
    return false;
  }

  return true;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  item,
  index,
  logs,
  history,
  sessions = [],
  onUpdateLog,
  onToggleSet,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onDeleteSet,
  onUpdateRest,
  onOpenAnalytics,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  isDragging = false,
  dragOffsetY = 0,
  isHoldingDrag = false,
  isDropTarget = false,
  onDragStartCard,
  onDragOverCard,
  onDropCard,
  onDragEndCard,
  onPointerDownDragHandle,
}) => {
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false);

  // Swipe-to-delete horizontal do card de exercício inteiro com animação suave de saída
  const [cardSwipeOffset, setCardSwipeOffset] = useState<number>(0);
  const [isCardSwiping, setIsCardSwiping] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const cardPointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const ex = item.exercise;
  const muscleName = MUSCLE_NAMES[item.muscleKey] || item.muscleKey;

  // Estado local simplificado sem RPE e sem RIR
  const [localLogs, setLocalLogs] = useState<Record<string, LocalSetLog>>(() => {
    const initial: Record<string, LocalSetLog> = {};
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      const log = logs[k];
      initial[k] = {
        weight: log?.weight || '',
        reps: log?.reps || '',
      };
    }
    return initial;
  });

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincroniza estado local quando as logs dos props mudarem externamente
  useEffect(() => {
    if (autoSaveStatus === 'saving') return;
    setLocalLogs((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let s = 1; s <= item.sets; s++) {
        const k = `${ex.id}_${s}`;
        const ext = logs[k];
        if (ext) {
          if (
            (ext.weight !== undefined && ext.weight !== next[k]?.weight) ||
            (ext.reps !== undefined && ext.reps !== next[k]?.reps)
          ) {
            next[k] = {
              weight: ext.weight || '',
              reps: ext.reps || '',
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [logs, item.sets, ex.id, autoSaveStatus]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const persistLogsToStorageDirectly = useCallback(
    (
      logKey: string,
      partial: Partial<{ weight: string; reps: string; done: boolean }>
    ) => {
      try {
        const activeUser = authStorage.getActiveUser();
        const storageKey = activeUser ? `alex_u_${activeUser.id}_current_logs` : 'alex_guest_current_logs';
        const stored = safeStorage.get<WorkoutLogs>(storageKey, {});
        stored[logKey] = {
          ...(stored[logKey] || { done: false, weight: '', reps: '' }),
          ...partial,
          timestamp: Date.now(),
        };
        safeStorage.set(storageKey, stored);
      } catch {
        // Storage safe fallback
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (logKey: string, field: 'weight' | 'reps', value: string) => {
      setLocalLogs((prev) => ({
        ...prev,
        [logKey]: {
          ...(prev[logKey] || { weight: '', reps: '' }),
          [field]: value,
        },
      }));

      onUpdateLog(logKey, field, value);
      setAutoSaveStatus('saving');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        persistLogsToStorageDirectly(logKey, { [field]: value });
        setAutoSaveStatus('saved');
        setTimeout(() => {
          setAutoSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
        }, 1500);
      }, 300);
    },
    [onUpdateLog, persistLogsToStorageDirectly]
  );

  const progression = useMemo(
    () => getOptimalProgressionSuggestion(ex, item.reps, history, logs, sessions),
    [ex, item.reps, history, logs, sessions]
  );

  const prevSessionExercise = useMemo(() => {
    for (const sess of sessions) {
      const match = sess.completedExercises.find(
        (ce) => ce.name.toLowerCase() === ex.name.toLowerCase()
      );
      if (match && match.sets.length > 0) {
        return match;
      }
    }
    return null;
  }, [sessions, ex.name]);

  const historicalPR = useMemo(() => {
    return getExerciseHistoricalPR(ex.name, sessions, history);
  }, [ex.name, sessions, history]);

  const handleReplicateSet = useCallback(
    (targetSetNum: number, sourceSetNum: number) => {
      const sourceKey = `${ex.id}_${sourceSetNum}`;
      const targetKey = `${ex.id}_${targetSetNum}`;
      const src = localLogs[sourceKey] || logs[sourceKey];
      if (!src || !src.weight) return;

      handleInputChange(targetKey, 'weight', src.weight);
      if (src.reps) {
        handleInputChange(targetKey, 'reps', src.reps);
      }
      soundManager.vibrate(30);
    },
    [ex.id, handleInputChange, localLogs, logs]
  );

  const handleReplicateFirstSetToAll = useCallback(() => {
    const firstKey = `${ex.id}_1`;
    const first = localLogs[firstKey] || logs[firstKey];
    if (!first || !first.weight) return;

    for (let s = 2; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      if (!logs[k]?.done) {
        handleInputChange(k, 'weight', first.weight);
        if (first.reps) handleInputChange(k, 'reps', first.reps);
      }
    }
    soundManager.vibrate([40, 30, 40]);
  }, [ex.id, handleInputChange, item.sets, localLogs, logs]);

  const handleAdjustRest = useCallback(
    (delta: number) => {
      if (onUpdateRest) {
        onUpdateRest(index, Math.max(15, item.rest + delta));
      }
    },
    [index, item.rest, onUpdateRest]
  );

  const firstSetKey = `${ex.id}_1`;
  const firstSetWeight = localLogs[firstSetKey]?.weight || logs[firstSetKey]?.weight || '60';

  const targetMaxReps = useMemo(() => {
    const nums = item.reps.match(/\d+/g)?.map(Number) || [10];
    return Math.max(...nums);
  }, [item.reps]);

  const completedSetsForEx = useMemo(() => {
    let count = 0;
    for (let s = 1; s <= item.sets; s++) {
      if (logs[`${ex.id}_${s}`]?.done) count++;
    }
    return count;
  }, [logs, ex.id, item.sets]);

  const isAllSetsDone = completedSetsForEx === item.sets && item.sets > 0;

  const handleApplySuggestedWeight = useCallback(
    (suggestedWeight: number) => {
      for (let s = 1; s <= item.sets; s++) {
        const k = `${ex.id}_${s}`;
        if (!logs[k]?.done) {
          handleInputChange(k, 'weight', suggestedWeight.toString());
        }
      }
    },
    [ex.id, handleInputChange, item.sets, logs]
  );

  const handleToggleExpandSet = useCallback((logKey: string, expanded: boolean) => {
    setExpandedSets((prev) => ({ ...prev, [logKey]: expanded }));
  }, []);

  const handleCompleteSet = useCallback(
    (logKey: string, finalWeight: string, finalReps: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const currWeight = localLogs[logKey]?.weight;
      const currReps = localLogs[logKey]?.reps;

      if (finalWeight !== currWeight || finalReps !== currReps) {
        setLocalLogs((prev) => ({
          ...prev,
          [logKey]: {
            weight: finalWeight,
            reps: finalReps,
          },
        }));
      }

      onUpdateLog(logKey, 'weight', finalWeight);
      onUpdateLog(logKey, 'reps', finalReps);
      persistLogsToStorageDirectly(logKey, {
        weight: finalWeight,
        reps: finalReps,
        done: !logs[logKey]?.done,
      });

      const checkFinalPR = checkSetPR(
        ex.name,
        parseFloat(finalWeight) || 0,
        parseInt(finalReps, 10) || 0,
        historicalPR
      );
      if (checkFinalPR) {
        soundManager.playPRCelebration();
      } else {
        soundManager.vibrateSetComplete();
      }

      // Descanso automático ativado discretamente com o tempo de descanso do exercício
      onToggleSet(logKey, item.rest);
      setExpandedSets((prev) => ({ ...prev, [logKey]: false }));
    },
    [ex.name, historicalPR, item.rest, localLogs, logs, onToggleSet, onUpdateLog, persistLogsToStorageDirectly]
  );

  // Exclusão individual de uma série com reorganização sequencial
  const handleDeleteIndividualSet = useCallback(
    (targetSetNum: number) => {
      if (onDeleteSet) {
        onDeleteSet(targetSetNum);
        return;
      }

      if (item.sets <= 1) {
        onDeleteExercise?.(index);
        return;
      }

      // Reorganiza estado local deslocando séries posteriores para baixo
      setLocalLogs((prev) => {
        const next: Record<string, LocalSetLog> = {};
        for (let s = 1; s <= item.sets; s++) {
          const currentKey = `${ex.id}_${s}`;
          if (s < targetSetNum) {
            if (prev[currentKey]) next[currentKey] = prev[currentKey];
          } else if (s > targetSetNum) {
            const shiftedKey = `${ex.id}_${s - 1}`;
            if (prev[currentKey]) next[shiftedKey] = prev[currentKey];
          }
        }
        return next;
      });

      try {
        const activeUser = authStorage.getActiveUser();
        const storageKey = activeUser ? `alex_u_${activeUser.id}_current_logs` : 'alex_guest_current_logs';
        const stored = safeStorage.get<WorkoutLogs>(storageKey, {});
        const updatedStored = { ...stored };

        delete updatedStored[`${ex.id}_${targetSetNum}`];

        for (let s = targetSetNum + 1; s <= item.sets; s++) {
          const fromKey = `${ex.id}_${s}`;
          const toKey = `${ex.id}_${s - 1}`;
          if (updatedStored[fromKey]) {
            updatedStored[toKey] = updatedStored[fromKey];
            delete updatedStored[fromKey];
          }

          const shiftedData = logs[fromKey];
          if (shiftedData) {
            onUpdateLog(toKey, 'weight', shiftedData.weight || '');
            onUpdateLog(toKey, 'reps', shiftedData.reps || '');
          }
        }
        delete updatedStored[`${ex.id}_${item.sets}`];
        safeStorage.set(storageKey, updatedStored);
      } catch {
        // Fallback seguro
      }

      soundManager.vibrate(30);
      onRemoveSet(index);
    },
    [ex.id, index, item.sets, logs, onDeleteExercise, onDeleteSet, onRemoveSet, onUpdateLog]
  );

  // Gestos de arrastar para a esquerda para excluir o card inteiro com animação suave
  const triggerSmoothDelete = useCallback(() => {
    if (!onDeleteExercise || isExiting) return;
    setIsExiting(true);
    soundManager.vibrate(35);
    setTimeout(() => {
      onDeleteExercise(index);
    }, 320);
  }, [index, isExiting, onDeleteExercise]);

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, a, [data-set-row], .drag-handle-touch, .set-table-container, .set-row')) {
      return;
    }
    cardPointerStartRef.current = { x: e.clientX, y: e.clientY };
    setIsCardSwiping(false);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardPointerStartRef.current || isExiting) return;
    const diffX = e.clientX - cardPointerStartRef.current.x;
    const diffY = e.clientY - cardPointerStartRef.current.y;

    // Alta precisão para não ativar acidentalmente ao rolar a página verticalmente
    if (diffX < -25 && Math.abs(diffX) > Math.abs(diffY) * 1.8) {
      setIsCardSwiping(true);
      setCardSwipeOffset(Math.max(-140, Math.min(0, diffX)));
    } else if (!isCardSwiping && Math.abs(diffY) > 12) {
      cardPointerStartRef.current = null;
    }
  };

  const handleCardPointerUp = () => {
    if (cardPointerStartRef.current && isCardSwiping && !isExiting) {
      if (cardSwipeOffset <= -85) {
        triggerSmoothDelete();
        return;
      }
    }
    cardPointerStartRef.current = null;
    setIsCardSwiping(false);
    setCardSwipeOffset(0);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl touch-pan-y transition-all duration-300 ${
        isExiting
          ? 'opacity-0 scale-95 -translate-x-full max-h-0 my-0 py-0 overflow-hidden'
          : 'max-h-[1400px] mb-3'
      }`}
    >
      {/* Camada vermelha revelada suavemente ao arrastar o card para a esquerda */}
      <div
        className="absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-rose-600 via-rose-600 to-rose-700/95 flex items-center justify-center gap-2 text-white font-black text-xs px-3 select-none cursor-pointer z-0 rounded-r-2xl transition-all"
        onClick={triggerSmoothDelete}
      >
        <Trash2
          className={`w-5 h-5 stroke-[2.5] transition-transform duration-200 ${
            cardSwipeOffset <= -85 ? 'scale-125 text-white animate-bounce' : 'scale-100 text-rose-200'
          }`}
        />
        <span className={cardSwipeOffset <= -85 ? 'font-black uppercase tracking-wider text-[11px]' : 'font-bold text-[11px]'}>
          {cardSwipeOffset <= -85 ? 'Solte p/ Excluir' : 'Excluir'}
        </span>
      </div>

      {/* Card do Exercício com translação de swipe suave */}
      <div
        id={`exercise-card-${index}`}
        data-exercise-card-index={index}
        draggable={Boolean(isDragging)}
        onDragStart={(e) => onDragStartCard?.(index, e)}
        onDragOver={(e) => onDragOverCard?.(index, e)}
        onDrop={(e) => onDropCard?.(index, e)}
        onDragEnd={() => onDragEndCard?.()}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
        style={{
          transform: isExiting
            ? 'translateX(-120%)'
            : isDragging
            ? `translate3d(0, ${dragOffsetY}px, 0) scale(1.025) rotate(-0.5deg)`
            : `translateX(${cardSwipeOffset}px)`,
          transition: isCardSwiping || isDragging
            ? 'none'
            : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.28s ease',
          opacity: isExiting ? 0 : 1,
          zIndex: isDragging ? 50 : undefined,
        }}
        className={`relative z-10 active-workout-card bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all scroll-mt-20 ${
          isDragging ? 'card-dragging' : ''
        } ${isDropTarget ? 'card-drop-target' : ''} ${
          isHoldingDrag ? 'card-holding' : ''
        } ${
          isAllSetsDone
            ? 'border-emerald-500/45 ring-1 ring-emerald-500/15'
            : 'border-slate-800 hover:border-slate-700/80'
        }`}
      >
        {/* 1. Header do Exercício */}
        <ExerciseCardHeader
          index={index}
          exercise={ex}
          muscleName={muscleName}
          setsCount={item.sets}
          completedSetsCount={completedSetsForEx}
          isAllSetsDone={isAllSetsDone}
          restSeconds={item.rest}
          onAdjustRest={handleAdjustRest}
          isCardCollapsed={isCardCollapsed}
          onToggleCardCollapsed={() => setIsCardCollapsed((prev) => !prev)}
          autoSaveStatus={autoSaveStatus}
          isDragging={isDragging}
          isHoldingDrag={isHoldingDrag}
          onPointerDownDragHandle={onPointerDownDragHandle}
          firstSetWeight={firstSetWeight}
          progression={progression}
          onApplySuggestedWeight={handleApplySuggestedWeight}
          onAddSet={onAddSet}
          onRemoveSet={onRemoveSet}
          onOpenSwap={onOpenSwap}
          onOpenWarmup={onOpenWarmup}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDeleteExercise={onDeleteExercise}
          onOpenAnalytics={onOpenAnalytics}
        />

        {/* 2. Lista de Séries */}
        {isCardCollapsed ? (
          <div className="px-3.5 py-2.5 bg-slate-950/50 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">
              {isAllSetsDone
                ? `✓ Todas as ${item.sets} séries concluídas neste exercício.`
                : `${completedSetsForEx} de ${item.sets} séries concluídas (${item.sets - completedSetsForEx} pendentes).`}
            </span>
            <button
              type="button"
              onClick={() => setIsCardCollapsed(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Expandir Séries</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-2.5 sm:p-4 landscape:p-3 space-y-2.5 sm:space-y-3">
            {/* Barra Superior da Seção de Séries: Recorde (PR) Histórico & Replicação Rápida */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs flex-wrap pb-1.5 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {historicalPR.maxWeight > 0 ? (
                  <span className="inline-flex items-center gap-1 flex-wrap">
                    <SmartTermTooltip term="PR" align="left">
                      <span>Recorde Pessoal (PR):</span>
                    </SmartTermTooltip>{' '}
                    <strong className="text-amber-300 font-mono">{historicalPR.maxWeight}kg</strong>
                    {historicalPR.best1RM > 0 && (
                      <SmartTermTooltip term="1RM" align="left" showIcon={false}>
                        <span className="text-sky-300/90 hover:text-sky-200">(1RM ~{historicalPR.best1RM}kg)</span>
                      </SmartTermTooltip>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Primeiro registro deste exercício</span>
                )}
              </div>

              {item.sets > 1 && (
                <button
                  type="button"
                  onClick={handleReplicateFirstSetToAll}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/25 transition-all cursor-pointer active:scale-95"
                  title="Preenche todas as séries pendentes com o peso e reps da Série #1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Preencher restantes com Série #1</span>
                </button>
              )}
            </div>

            {/* CARD ÚNICO UNIFICADO COM TODAS AS SÉRIES DO EXERCÍCIO */}
            <div className="set-table-container bg-[#080d19] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
              {/* Cabeçalho Único da Tabela de Séries */}
              <div className="grid grid-cols-12 gap-1 px-2.5 sm:px-3 py-2 bg-[#0c1426] border-b border-slate-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 items-center text-center select-none">
                <div className="hidden sm:block sm:col-span-3 text-slate-500">Anterior</div>
                <div className="col-span-6 sm:col-span-4">Carga (kg)</div>
                <div className="col-span-4 sm:col-span-3">Reps</div>
                <div className="col-span-2 sm:col-span-2">Status</div>
              </div>

              {/* Linhas das Séries */}
              <div className="divide-y divide-slate-800/60">
                {Array.from({ length: item.sets }).map((_, sIdx) => {
                  const setNum = sIdx + 1;
                  const logKey = `${ex.id}_${setNum}`;
                  const setLog = logs[logKey] || { weight: '', reps: '', done: false };
                  const localLog = localLogs[logKey] || {
                    weight: setLog.weight || '',
                    reps: setLog.reps || '',
                  };

                  const prevSetRecord = prevSessionExercise?.sets?.[sIdx]
                    ? {
                        weight: prevSessionExercise.sets[sIdx].weight.toString(),
                        reps: prevSessionExercise.sets[sIdx].reps.toString(),
                      }
                    : history[logKey]?.weight && history[logKey]?.reps
                    ? {
                        weight: history[logKey].weight,
                        reps: history[logKey].reps,
                      }
                    : null;

                  const setAutoProgression = (() => {
                    if (progression && progression.status === 'progress' && progression.suggestedWeight > 0) {
                      const inc = Math.round((progression.suggestedWeight - (progression.currentWeight || 0)) * 10) / 10;
                      return {
                        suggestedKg: progression.suggestedWeight,
                        incrementKg: inc > 0 ? inc : 2.5,
                      };
                    }
                    if (prevSetRecord) {
                      const pw = parseFloat(prevSetRecord.weight) || 0;
                      const pr = parseInt(prevSetRecord.reps, 10) || 0;
                      if (pw > 0 && pr >= targetMaxReps) {
                        const inc = pw >= 40 ? 2.5 : 2;
                        return {
                          suggestedKg: Math.round((pw + inc) * 10) / 10,
                          incrementKg: inc,
                        };
                      }
                    }
                    return null;
                  })();

                  const prevSessionSet =
                    sIdx > 0
                      ? localLogs[`${ex.id}_${setNum - 1}`] || logs[`${ex.id}_${setNum - 1}`]
                      : null;

                  return (
                    <SetRow
                      key={logKey}
                      setNum={setNum}
                      sIdx={sIdx}
                      exerciseId={ex.id}
                      exerciseName={ex.name}
                      logKey={logKey}
                      setLog={setLog}
                      localLog={localLog}
                      isExpanded={Boolean(expandedSets[logKey])}
                      onToggleExpand={handleToggleExpandSet}
                      prevSetRecord={prevSetRecord}
                      setAutoProgression={setAutoProgression}
                      historicalPR={historicalPR}
                      targetMaxReps={targetMaxReps}
                      prevSessionSet={prevSessionSet}
                      onInputChange={handleInputChange}
                      onCompleteSet={handleCompleteSet}
                      onReplicateSet={handleReplicateSet}
                      onDeleteSet={handleDeleteIndividualSet}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, areExerciseCardPropsEqual);
