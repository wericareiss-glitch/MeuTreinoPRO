import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, FileEdit, Clock, ArrowLeft, Flame, Plus } from 'lucide-react';
import { GeneratedWorkoutRoutine, WorkoutItem, WorkoutLogs, WorkoutSessionSummary } from '../types/workout';
import { ExerciseCard } from './ExerciseCard';
import { wakeLockManager } from '../utils/wakeLock';

interface ActiveWorkoutViewProps {
  routine: GeneratedWorkoutRoutine;
  workoutItems: WorkoutItem[];
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  startedAt: number;
  workoutNotes: string;
  onUpdateWorkoutNotes: (notes: string) => void;
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
  onFinishSession,
  onDiscardSession,
  onBackToList,
}) => {
  const [elapsedSecs, setElapsedSecs] = useState<number>(() => {
    return Math.floor((Date.now() - (startedAt || Date.now())) / 1000);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - (startedAt || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

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

  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBackToList}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
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
              </div>
            </div>
          </div>
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
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-400 font-medium">{workoutItems.length} exercícios programados</span>
        <button
          type="button"
          onClick={onOpenAddExercise}
          className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adicionar Exercício</span>
        </button>
      </div>

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
          />
        ))}
      </div>

      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-3.5 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5 text-slate-300">
          <FileEdit className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Anotações do Treino</span>
        </div>
        <textarea
          value={workoutNotes}
          onChange={(e) => onUpdateWorkoutNotes(e.target.value)}
          placeholder="Observações rápidas: carga subiu fácil, dor zero, etc."
          rows={2}
          className="w-full bg-[#070b14] border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-medium"
        />
      </div>

      <div className="p-3.5 rounded-2xl bg-[#090d19] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
        <button
          type="button"
          onClick={onFinishSession}
          className="w-full sm:w-auto flex-1 py-3.5 px-5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Concluir & Salvar Treino</span>
        </button>
        <button
          type="button"
          onClick={onDiscardSession}
          className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Cancelar</span>
        </button>
      </div>
    </div>
  );
};
