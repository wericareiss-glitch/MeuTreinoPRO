import React, { useState } from 'react';
import { Flame, RefreshCw, Check, CheckCircle2, AlertCircle, Plus, Trash2, TrendingUp, Clock, ArrowUp, ArrowDown, X, Pencil, Zap } from 'lucide-react';
import { WorkoutItem, WorkoutLogs, WorkoutSessionSummary } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM } from '../utils/storage';

interface ExerciseCardProps {
  item: WorkoutItem;
  index: number;
  logs: WorkoutLogs;
  history: WorkoutLogs;
  sessions?: WorkoutSessionSummary[];
  onUpdateLog: (key: string, field: 'weight' | 'reps' | 'rpe' | 'rir', val: string) => void;
  onToggleSet: (key: string, restSec: number) => void;
  onOpenWarmup: (name: string, targetWeight: string) => void;
  onOpenSwap: (index: number) => void;
  onAddSet: (index: number) => void;
  onRemoveSet: (index: number) => void;
  onUpdateRest?: (index: number, newRest: number) => void;
  onOpenAnalytics?: (exerciseName: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDeleteExercise?: (index: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  index,
  logs,
  onUpdateLog,
  onToggleSet,
  onOpenWarmup,
  onOpenSwap,
  onAddSet,
  onRemoveSet,
  onUpdateRest,
  onOpenAnalytics,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
}) => {
  const ex = item.exercise;
  const muscleName = MUSCLE_NAMES[item.muscleKey] || item.muscleKey;

  const handleAdjustRest = (delta: number) => {
    if (onUpdateRest) {
      onUpdateRest(index, Math.max(15, item.rest + delta));
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800/90 rounded-xl overflow-hidden shadow-md">
      <div className="px-3 py-2 bg-[#0c1322] border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-extrabold uppercase text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
            {muscleName}
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">{ex.name}</h3>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            ({item.sets}s • {item.reps} • {item.rir})
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onOpenSwap(index)}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span className="hidden xs:inline">Trocar</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenWarmup(ex.name, '60')}
            className="p-1 rounded-md text-amber-300 bg-amber-500/10 border border-amber-500/25 cursor-pointer"
            title="Aquecimento"
          >
            <Flame className="w-3 h-3" />
          </button>
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={() => onOpenAnalytics(ex.name)}
              className="p-1 rounded-md text-slate-400 hover:text-white bg-slate-800 border border-slate-700 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3 text-sky-400" />
            </button>
          )}
          {onDeleteExercise && (
            <button
              type="button"
              onClick={() => onDeleteExercise(index)}
              className="p-1 rounded-md text-rose-400 hover:bg-rose-950/40 bg-rose-950/20 border border-rose-900/30 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="p-2 space-y-1.5">
        {Array.from({ length: item.sets }).map((_, sIdx) => {
          const setNum = sIdx + 1;
          const logKey = `${ex.id}_${setNum}`;
          const setLog = logs[logKey] || { weight: '', reps: '', rpe: '', rir: '', done: false };
          const est1RM = calculate1RM(setLog.weight, setLog.reps);

          return (
            <div key={logKey} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#0a0f1d] border border-slate-800">
              <div className="flex items-center gap-2 flex-1">
                <span className="font-mono font-bold text-xs text-sky-400">#{setNum}</span>
                <input
                  type="number"
                  placeholder="kg"
                  value={setLog.weight}
                  onChange={(e) => onUpdateLog(logKey, 'weight', e.target.value)}
                  className="w-16 bg-[#070b14] border border-slate-700 rounded-lg p-1 text-center font-mono text-xs font-bold text-white"
                />
                <input
                  type="number"
                  placeholder="reps"
                  value={setLog.reps}
                  onChange={(e) => onUpdateLog(logKey, 'reps', e.target.value)}
                  className="w-16 bg-[#070b14] border border-slate-700 rounded-lg p-1 text-center font-mono text-xs font-bold text-white"
                />
                {est1RM && <span className="text-[10px] font-mono text-slate-500">~{est1RM}k</span>}
              </div>
              <button
                type="button"
                onClick={() => onToggleSet(logKey, item.rest)}
                className={`px-3 py-1 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                  setLog.done ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {setLog.done ? '✓ OK' : 'Concluir'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-1.5 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddSet(index)}
            className="px-2 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Série</span>
          </button>
          {item.sets > 1 && (
            <button
              type="button"
              onClick={() => onRemoveSet(index)}
              className="p-1 text-rose-400 bg-rose-950/20 rounded border border-rose-900/40 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-sky-400" />
          <button type="button" onClick={() => handleAdjustRest(-15)} className="px-1 bg-slate-800 rounded">-</button>
          <span className="text-white font-bold">{item.rest}s</span>
          <button type="button" onClick={() => handleAdjustRest(15)} className="px-1 bg-slate-800 rounded">+</button>
        </div>
      </div>
    </div>
  );
};
