/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  FileEdit, 
  Clock, 
  ArrowLeft,
  Flame,
  Plus,
  Activity,
  Disc,
  Check,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import { GeneratedWorkoutRoutine, WorkoutItem, WorkoutLogs, WorkoutSessionSummary, MuscleGroup } from '../types/workout';
import { ExerciseCard } from './ExerciseCard';
import { wakeLockManager } from '../utils/wakeLock';
import { JointMobilityModal } from './JointMobilityModal';
import { generateJointWarmupRoutine } from '../utils/jointMobilityEngine';

interface ActiveWorkoutViewProps {
  routine: GeneratedWorkoutRoutine;
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  startedAt: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
  muscleTargetRir?: Partial<Record<MuscleGroup, number>>;

  onOpenAddExercise: () => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDeleteExercise: (index: number) => void;
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onUpdateRest: (index: number, newRest: number) => void;
  onOpenWarmup: (name: string, weight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  onOpenCadence?: () => void;
  onOpenPlateCalc?: (initialWeight?: number) => void;

  onFinishSession: () => void;
  onDiscardSession: () => void;
  onBackToList: () => void;
}

export const ActiveWorkoutView: React.FC<ActiveWorkoutViewProps> = ({
  routine,
  workoutItems,
  logs,
  history,
  sessions = [],
  startedAt,
  workoutNotes,
  onUpdateWorkoutNotes,
  muscleTargetRir,
  onOpenAddExercise,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  onUpdateLog,
  onToggleSet,
  onUpdateRest,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onOpenAnalytics,
  onOpenCadence,
  onOpenPlateCalc,
  onFinishSession,
  onDiscardSession,
  onBackToList,
}) => {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isMobilityOpen, setIsMobilityOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Gera rotina de aquecimento articular dinâmica baseada nos exercícios do treino ativo
  const mobilityRoutine = React.useMemo(() => {
    return generateJointWarmupRoutine(workoutItems, routine.name);
  }, [workoutItems, routine.name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    if (showToolsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showToolsMenu]);

  // Debounced auto-save para as anotações do treino
  const [localNotes, setLocalNotes] = useState(workoutNotes);
  const [notesSaveStatus, setNotesSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const notesDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNotesRef = useRef(workoutNotes);

  useEffect(() => {
    latestNotesRef.current = localNotes;
  }, [localNotes]);

  // Sincroniza se o prop workoutNotes mudar externamente sem sobrescrever digitação
  useEffect(() => {
    if (notesSaveStatus !== 'saving') {
      setLocalNotes(workoutNotes);
      latestNotesRef.current = workoutNotes;
    }
  }, [workoutNotes, notesSaveStatus]);

  // Garante salvar imediatamente no unmount para prevenir qualquer perda de anotações
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

  // Cronômetro do treino ativo (em segundos)
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

  // Screen Wake Lock API & Keep-Alive: impede que a tela apague e mantém timers ativos
  useEffect(() => {
    wakeLockManager.request().catch(() => {});
    const unbind = wakeLockManager.bindVisibilityListener();
    return () => {
      unbind();
      wakeLockManager.release().catch(() => {});
    };
  }, []);

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Contagem de séries que superaram carga/volume da sessão anterior
  const beatenSetsCount = React.useMemo(() => {
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
    <div className="space-y-4 animate-fadeIn pb-24 max-w-4xl mx-auto">
      {/* 1. Header do Treino Ativo (Compacto & Minimalista) */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl">
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
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Alerta Discreto de Recordes Batidos */}
        {beatenSetsCount > 0 && (
          <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
              <span>{beatenSetsCount} {beatenSetsCount === 1 ? 'série bateu' : 'séries bateram'} o histórico anterior!</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
              +2.5% a 5% próx.
            </span>
          </div>
        )}
        {/* Sugestão de Aquecimento Articular antes da 1ª série */}
        {completedSets === 0 && (
          <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                Aquecimento articular sugerido ({mobilityRoutine.totalExercises} etapas · ~{mobilityRoutine.totalDurationMinutes} min)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobilityOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shrink-0 cursor-pointer shadow-sm transition-all active:scale-95"
            >
              Iniciar Aquecimento
            </button>
          </div>
        )}
      </div>

      {/* 2. Barra de Controle e Adição (Layout Espaçoso e Otimizado para Mobile) */}
      <div className="flex items-center justify-between px-1 gap-2">
        <span className="text-xs text-slate-400 font-medium truncate">
          {workoutItems.length} {workoutItems.length === 1 ? 'exercício' : 'exercícios'} programados
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão de Aquecimento Articular Específico */}
          <button
            type="button"
            onClick={() => setIsMobilityOpen(true)}
            className="hidden sm:flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Rotina de Aquecimento Articular Específica (3-5 min)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mobilidade (3-5 min)</span>
          </button>

          {/* Desktop Direct Tool Shortcuts */}
          {onOpenCadence && (
            <button
              type="button"
              onClick={onOpenCadence}
              className="hidden sm:flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Metrônomo de Cadência & TUT (3-0-1-0)"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Metrônomo</span>
            </button>
          )}

          {onOpenPlateCalc && (
            <button
              type="button"
              onClick={() => onOpenPlateCalc()}
              className="hidden sm:flex py-1.5 px-2.5 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Calculadora de Anilhas na Barra"
            >
              <Disc className="w-3.5 h-3.5 text-sky-400" />
              <span>Anilhas</span>
            </button>
          )}

          {/* Primary Action: Add Exercise */}
          <button
            type="button"
            onClick={onOpenAddExercise}
            className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adicionar Exercício</span>
          </button>

          {/* Mobile 3-Dots Menu for Active Workout Tools */}
          <div className="relative sm:hidden" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => setShowToolsMenu((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              title="Ferramentas do treino"
              aria-label="Ferramentas do treino"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 top-9 w-56 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-30 animate-fadeIn space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setIsMobilityOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 text-left transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Aquecimento Articular</span>
                    <span className="block text-[10px] text-slate-400">3-5 min de mobilidade específica</span>
                  </div>
                </button>

                {onOpenCadence && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenCadence();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-950/40 text-left transition-colors cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Metrônomo</span>
                      <span className="block text-[10px] text-slate-400">Cadência & TUT</span>
                    </div>
                  </button>
                )}
                {onOpenPlateCalc && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenPlateCalc();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 text-left transition-colors cursor-pointer"
                  >
                    <Disc className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="block font-bold">Anilhas</span>
                      <span className="block text-[10px] text-slate-400">Calculadora de barra</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Lista de Exercícios Ativos */}
      <div className="space-y-3">
        {workoutItems.map((item, index) => (
          <ExerciseCard
            key={item.id}
            item={item}
            index={index}
            logs={logs}
            history={history}
            sessions={sessions}
            canMoveUp={index > 0}
            canMoveDown={index < workoutItems.length - 1}
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
            onOpenPlateCalc={onOpenPlateCalc}
            targetMuscleRir={muscleTargetRir?.[item.muscleKey as MuscleGroup]}
          />
        ))}
      </div>

      {/* 4. Anotações do Treino com Auto-Save Debounced */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-slate-300">
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
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Observações rápidas: carga subiu fácil, dor zero, etc."
          rows={3}
          className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors resize-none font-medium leading-relaxed"
        />
      </div>

      {/* 5. Ações Finais de Conclusão / Cancelamento */}
      <div className="p-3.5 rounded-2xl bg-[#090d19] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
        <button
          type="button"
          onClick={onFinishSession}
          className="w-full sm:w-auto flex-1 py-3.5 px-5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Concluir & Salvar Treino</span>
        </button>

        {isConfirmingCancel ? (
          <div className="w-full sm:w-auto flex items-center gap-2 bg-slate-900 border border-rose-500/40 p-1.5 rounded-xl animate-fadeIn">
            <span className="text-xs text-rose-300 font-bold px-1.5">Descartar treino?</span>
            <button
              type="button"
              onClick={() => {
                setIsConfirmingCancel(false);
                onDiscardSession();
              }}
              className="py-2 px-3 rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white cursor-pointer transition-all shadow-md active:scale-95"
            >
              Sim, Cancelar
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingCancel(false)}
              className="py-2 px-2.5 rounded-lg font-bold text-xs bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Voltar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingCancel(true)}
            className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancelar Treino</span>
          </button>
        )}
      </div>

      {/* Modal de Aquecimento Articular Guiado */}
      <JointMobilityModal
        isOpen={isMobilityOpen}
        onClose={() => setIsMobilityOpen(false)}
        routine={mobilityRoutine}
        routineTitle={routine.name}
      />
    </div>
  );
};
