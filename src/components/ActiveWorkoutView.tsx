/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import {
  PeriodizationStrategy,
  PERIODIZATION_PHASES,
} from '../types/workout';
import { wakeLockManager } from '../utils/wakeLock';
import { generateJointWarmupRoutine } from '../utils/jointMobilityEngine';
import { safeStorage } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  ActiveWorkoutViewProps,
  MemoizedWorkoutItemRow,
  WorkoutHeaderBar,
  WorkoutToolbar,
  WorkoutFooterActions
} from './activeWorkout';

import { JointMobilityModal } from './JointMobilityModal';

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  routine,
  workoutItems,
  logs,
  history,
  sessions = [],
  startedAt,
  workoutNotes,
  onUpdateWorkoutNotes,
  periodizationStrategy,
  userFocus,
  onSelectPeriodizationStrategy,
  deepWorkMode = false,
  onToggleDeepWork,
  onOpenAddExercise,
  onMoveUp,
  onMoveDown,
  onReorderExercises,
  onDeleteExercise,
  onUpdateLog,
  onToggleSet,
  onUpdateRest,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onOpenAnalytics,
  onFinishSession,
  onDiscardSession,
  onBackToList,
}) => {
  const [isMobilityOpen, setIsMobilityOpen] = useState(false);
  const [holdingIdx, setHoldingIdx] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const performReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
      if (onReorderExercises) {
        onReorderExercises(fromIdx, toIdx);
      } else if (toIdx < fromIdx) {
        for (let i = fromIdx; i > toIdx; i--) onMoveUp(i);
      } else {
        for (let i = fromIdx; i < toIdx; i++) onMoveDown(i);
      }
      soundManager.vibrate(25);
    },
    [onReorderExercises, onMoveUp, onMoveDown]
  );

  // HTML5 Drag & Drop Handlers
  const handleDragStartCard = useCallback((idx: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggingIdx(idx);
    setDragOffsetY(0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }, []);

  const handleDragOverCard = useCallback((idx: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIdx(idx);
  }, []);

  const handleDropCard = useCallback(
    (targetIdx: number, e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIdx = draggingIdx !== null ? draggingIdx : parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIdx) && fromIdx !== targetIdx) {
        performReorder(fromIdx, targetIdx);
      }
      setHoldingIdx(null);
      setDraggingIdx(null);
      setDragOffsetY(0);
      setDropTargetIdx(null);
    },
    [draggingIdx, performReorder]
  );

  const handleDragEndCard = useCallback(() => {
    setHoldingIdx(null);
    setDraggingIdx(null);
    setDragOffsetY(0);
    setDropTargetIdx(null);
  }, []);

  // Pointer Long Press on Drag Handle (180ms hold delay para resposta ágil, imediata e suave)
  const HOLD_TO_DRAG_DELAY_MS = 180;
  const HOLD_MOVE_TOLERANCE_PX = 16;

  const handlePointerDownDragHandle = useCallback(
    (startIdx: number, e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      let dragUnlocked = false;
      let latestTarget = startIdx;

      soundManager.vibrate(15);
      setHoldingIdx(startIdx);
      setDragOffsetY(0);

      const holdTimer = window.setTimeout(() => {
        dragUnlocked = true;
        setHoldingIdx(null);
        setDraggingIdx(startIdx);
        setDropTargetIdx(startIdx);
        soundManager.vibrate([25, 35]);
      }, HOLD_TO_DRAG_DELAY_MS);

      const cleanupListeners = () => {
        window.clearTimeout(holdTimer);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      const handlePointerMove = (moveEvt: PointerEvent) => {
        if (!dragUnlocked) {
          const dist = Math.hypot(moveEvt.clientX - startX, moveEvt.clientY - startY);
          if (dist > HOLD_MOVE_TOLERANCE_PX) {
            cleanupListeners();
            setHoldingIdx(null);
            setDragOffsetY(0);
          }
          return;
        }

        if (moveEvt.cancelable) {
          moveEvt.preventDefault();
        }

        // Calcula deslocamento Y dinâmico para mover visualmente o card com o ponteiro
        const deltaY = moveEvt.clientY - startY;
        setDragOffsetY(deltaY);

        const viewportH = window.innerHeight;
        if (moveEvt.clientY < 90) {
          window.scrollBy({ top: -14, behavior: 'auto' });
        } else if (moveEvt.clientY > viewportH - 90) {
          window.scrollBy({ top: 14, behavior: 'auto' });
        }

        const elUnder = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY);
        const cardEl = elUnder?.closest('[data-exercise-card-index]') as HTMLElement | null;
        if (cardEl) {
          const overIdx = parseInt(cardEl.getAttribute('data-exercise-card-index') || '', 10);
          if (!isNaN(overIdx) && overIdx !== latestTarget) {
            latestTarget = overIdx;
            setDropTargetIdx(overIdx);
            soundManager.vibrate(10);
          }
        }
      };

      const handlePointerUp = () => {
        cleanupListeners();
        setHoldingIdx(null);
        setDragOffsetY(0);
        if (dragUnlocked && latestTarget !== startIdx) {
          performReorder(startIdx, latestTarget);
        }
        setDraggingIdx(null);
        setDropTargetIdx(null);
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: false });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [performReorder]
  );

  // Periodização ativa
  const inferPhaseFromWorkout = useCallback((): PeriodizationStrategy => {
    if (periodizationStrategy) return periodizationStrategy;
    if (routine.periodizationStrategy) return routine.periodizationStrategy;

    const storedPhase = safeStorage.get<PeriodizationStrategy | null>(
      `meutreino_periodization_${routine.id}`,
      null
    );
    if (storedPhase && PERIODIZATION_PHASES[storedPhase]) {
      return storedPhase;
    }

    if (workoutItems.length > 0) {
      let totalAvgReps = 0;
      let validCount = 0;
      workoutItems.forEach((it) => {
        const matches = (it.reps || '').match(/\d+/g);
        if (matches && matches.length > 0) {
          const nums = matches.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
          if (nums.length > 0) {
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            totalAvgReps += avg;
            validCount++;
          }
        }
      });
      if (validCount > 0) {
        const meanReps = totalAvgReps / validCount;
        if (meanReps <= 6) return 'strength';
        if (meanReps >= 14.5) return 'metabolic';
        return 'hypertrophy';
      }
    }

    if (userFocus === 'strength') return 'strength';
    return 'hypertrophy';
  }, [periodizationStrategy, routine.id, routine.periodizationStrategy, workoutItems, userFocus]);

  const [activePhase, setActivePhase] = useState<PeriodizationStrategy>(() => inferPhaseFromWorkout());

  useEffect(() => {
    if (periodizationStrategy && periodizationStrategy !== activePhase) {
      setActivePhase(periodizationStrategy);
    }
  }, [periodizationStrategy, activePhase]);

  // Rotina de aquecimento articular dinâmica
  const mobilityRoutine = useMemo(() => {
    return generateJointWarmupRoutine(workoutItems, routine.name);
  }, [workoutItems, routine.name]);

  // Debounced auto-save para as anotações do treino
  const [localNotes, setLocalNotes] = useState(workoutNotes);
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef(workoutNotes);

  useEffect(() => {
    latestNotesRef.current = localNotes;
  }, [localNotes]);

  useEffect(() => {
    if (notesSaveStatus !== 'saving') {
      setLocalNotes(workoutNotes);
      latestNotesRef.current = workoutNotes;
    }
  }, [workoutNotes, notesSaveStatus]);

  useEffect(() => {
    return () => {
      if (notesDebounceTimerRef.current) {
        clearTimeout(notesDebounceTimerRef.current);
        onUpdateWorkoutNotes(latestNotesRef.current);
      }
    };
  }, [onUpdateWorkoutNotes]);

  const handleNotesChange = (val: string) => {
    setLocalNotes(val);
    latestNotesRef.current = val;
    setNotesSaveStatus('saving');

    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
    }

    notesDebounceTimerRef.current = setTimeout(() => {
      onUpdateWorkoutNotes(val);
      setNotesSaveStatus('saved');
      notesDebounceTimerRef.current = null;
      setTimeout(() => {
        setNotesSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }, 450);
  };

  const handleNotesBlur = () => {
    if (notesDebounceTimerRef.current) {
      clearTimeout(notesDebounceTimerRef.current);
      notesDebounceTimerRef.current = null;
      onUpdateWorkoutNotes(localNotes);
      setNotesSaveStatus('saved');
      setTimeout(() => {
        setNotesSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }
  };

  // Cronômetro do treino ativo
  const [elapsedSecs, setElapsedSecs] = useState<number>(() => {
    return Math.floor((Date.now() - (startedAt || Date.now())) / 1000);
  });

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSecs(Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    };

    const interval = setInterval(updateElapsed, 1000);
    document.addEventListener('visibilitychange', updateElapsed);
    window.addEventListener('focus', updateElapsed);
    window.addEventListener('pageshow', updateElapsed);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', updateElapsed);
      window.removeEventListener('focus', updateElapsed);
      window.removeEventListener('pageshow', updateElapsed);
    };
  }, [startedAt]);

  // Screen Wake Lock API & Keep-Alive
  useEffect(() => {
    wakeLockManager.request().catch(() => {});
    const unbind = wakeLockManager.bindVisibilityListener();
    return () => {
      unbind();
      wakeLockManager.release().catch(() => {});
    };
  }, []);

  const formatElapsed = useCallback((totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Contagem de séries totais e concluídas
  let totalSets = 0;
  let completedSets = 0;

  workoutItems.forEach((item) => {
    totalSets += item.sets;
    for (let s = 1; s <= item.sets; s++) {
      const logKey = `${item.exercise.id}_${s}`;
      if (logs[logKey]?.done) {
        completedSets++;
      }
    }
  });

  // Contagem de séries que superaram carga/volume anterior
  const beatenSetsCount = useMemo(() => {
    let count = 0;
    workoutItems.forEach((item) => {
      let prevEx: { sets: { weight: number; reps: number }[] } | undefined;
      for (const sess of sessions) {
        const found = sess.completedExercises.find(
          (ce) => ce.name.toLowerCase() === item.exercise.name.toLowerCase()
        );
        if (found && found.sets.length > 0) {
          prevEx = found;
          break;
        }
      }

      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        const log = logs[key];
        const hist = history[key];

        const currW = parseFloat(log?.weight || '0') || 0;
        const currR = parseInt(log?.reps || '0', 10) || 0;
        const currVol = currW * currR;

        let histW = 0;
        let histR = 0;
        if (prevEx && prevEx.sets[s - 1]) {
          histW = prevEx.sets[s - 1].weight || 0;
          histR = prevEx.sets[s - 1].reps || 0;
        } else if (hist) {
          histW = parseFloat(hist.weight || '0') || 0;
          histR = parseInt(hist.reps || '0', 10) || 0;
        }
        const histVol = histW * histR;

        if (histW > 0 && histR > 0 && (log?.done || (currW > 0 && currR > 0))) {
          if (currW > histW || currVol > histVol || (currW === histW && currR > histR)) {
            count++;
          }
        }
      }
    });
    return count;
  }, [workoutItems, logs, history, sessions]);

  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="space-y-4 animate-fadeIn pb-[max(8rem,calc(6.5rem+env(safe-area-inset-bottom)))] sm:pb-32 w-full max-w-4xl mx-auto min-w-0 touch-pan-y">
      {/* 1. Header do Treino Ativo */}
      <WorkoutHeaderBar
        routine={routine}
        onBackToList={onBackToList}
        elapsedSecs={elapsedSecs}
        completedSets={completedSets}
        totalSets={totalSets}
        progressPercent={progressPercent}
        formatElapsed={formatElapsed}
        localNotes={localNotes}
        notesSaveStatus={notesSaveStatus}
        onNotesChange={handleNotesChange}
        onNotesBlur={handleNotesBlur}
        beatenSetsCount={beatenSetsCount}
        onOpenMobility={() => setIsMobilityOpen(true)}
        mobilityTotalExercises={mobilityRoutine.totalExercises}
        mobilityTotalMinutes={mobilityRoutine.totalDurationMinutes}
        onFinishSession={onFinishSession}
        deepWorkMode={deepWorkMode}
        onToggleDeepWork={onToggleDeepWork}
      />

      {/* 2. Barra de Ações Rápidas (Oculta temporariamente no Modo Deep Work) */}
      {!deepWorkMode && (
        <WorkoutToolbar
          workoutItemsCount={workoutItems.length}
          onOpenMobility={() => setIsMobilityOpen(true)}
          onOpenAddExercise={onOpenAddExercise}
        />
      )}

      {/* 3. Lista de Exercícios Ativos */}
      <div className="space-y-3">
        {workoutItems.map((item, index) => (
          <MemoizedWorkoutItemRow
            key={item.id}
            item={item}
            index={index}
            totalItems={workoutItems.length}
            logs={logs}
            history={history}
            sessions={sessions}
            isDragging={draggingIdx === index}
            dragOffsetY={draggingIdx === index ? dragOffsetY : 0}
            isHoldingDrag={holdingIdx === index}
            isDropTarget={dropTargetIdx === index && draggingIdx !== index}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDeleteExercise={onDeleteExercise}
            onUpdateLog={onUpdateLog}
            onToggleSet={onToggleSet}
            onUpdateRest={onUpdateRest}
            onOpenWarmup={onOpenWarmup}
            onOpenSwap={onOpenSwap}
            onAddSet={onAddSet}
            onRemoveSet={onRemoveSet}
            onOpenAnalytics={onOpenAnalytics}
            onDragStartCard={handleDragStartCard}
            onDragOverCard={handleDragOverCard}
            onDropCard={handleDropCard}
            onDragEndCard={handleDragEndCard}
            onPointerDownDragHandle={handlePointerDownDragHandle}
            deepWorkMode={deepWorkMode}
          />
        ))}
      </div>

      {/* 4. Ações Finais: Concluir / Descartar */}
      <WorkoutFooterActions
        onFinishSession={onFinishSession}
        onDiscardSession={onDiscardSession}
      />

      {/* 5. Modal de Aquecimento Articular Guiado (Lazy Loaded) */}
      {isMobilityOpen && (
        <Suspense fallback={null}>
          <JointMobilityModal
            isOpen={isMobilityOpen}
            onClose={() => setIsMobilityOpen(false)}
            routine={mobilityRoutine}
            routineTitle={routine.name}
          />
        </Suspense>
      )}
    </div>
  );
};
