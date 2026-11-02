/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Flame, 
  RefreshCw, 
  Check, 
  CheckCircle2,
  AlertCircle,
  Plus, 
  Trash2, 
  TrendingUp, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Pencil, 
  Zap,
  Save,
  Target,
  Dumbbell,
  Minus,
  MoreVertical,
  Disc,
  HelpCircle,
  BookOpen,
  Sparkles,
  Copy,
  Trophy
} from 'lucide-react';
import { WorkoutItem, WorkoutLogs, WorkoutSessionSummary } from '../types/workout';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { calculate1RM, calculate6RM, estimateNextSetWeight, safeStorage } from '../utils/storage';
import { authStorage } from '../utils/auth';
import { getOptimalProgressionSuggestion } from '../utils/progressiveOverload';
import { soundManager } from '../utils/audio';
import { getExerciseHistoricalPR, checkSetPR, PRCheckResult } from '../utils/prEngine';

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
  onOpenPlateCalc?: (weight?: number) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDeleteExercise?: (index: number) => void;
  targetMuscleRir?: number;
}

// RPE de 6 a 10 com cálculo automático de RIR (RIR = 10 - RPE)
const RPE_PRESETS = [
  { rpe: 6,  rir: 4, label: 'RPE 6', rirDesc: 'RIR 4 (4 reps sobram)', color: 'text-slate-300' },
  { rpe: 7,  rir: 3, label: 'RPE 7', rirDesc: 'RIR 3 (3 reps sobram)', color: 'text-sky-300' },
  { rpe: 8,  rir: 2, label: 'RPE 8', rirDesc: 'RIR 2 (2 reps sobram · Hipertrofia ideal)', color: 'text-emerald-300' },
  { rpe: 9,  rir: 1, label: 'RPE 9', rirDesc: 'RIR 1 (1 rep sobra · Muito pesado)', color: 'text-amber-300' },
  { rpe: 10, rir: 0, label: 'RPE 10', rirDesc: 'RIR 0 (Falha concêntrica total)', color: 'text-rose-300' },
];

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
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
  onUpdateRest,
  onOpenAnalytics,
  onOpenPlateCalc,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDeleteExercise,
  targetMuscleRir,
}) => {
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Estado da Dica de Execução (Popover biomecânico)
  const [showExecutionTip, setShowExecutionTip] = useState(false);
  const executionTipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (executionTipRef.current && !executionTipRef.current.contains(e.target as Node)) {
        setShowExecutionTip(false);
      }
    };
    if (showExecutionTip) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExecutionTip]);

  const ex = item.exercise;
  const muscleName = MUSCLE_NAMES[item.muscleKey] || item.muscleKey;

  // 1. Estado local para inputs com mecanismo de auto-save debounced contínuo
  // Padrão de RPE é 6 (o que entrega RIR 4: 10 - 6 = 4)
  const [localLogs, setLocalLogs] = useState<Record<string, { weight: string; reps: string; rpe: string; rir: string }>>(() => {
    const initial: Record<string, { weight: string; reps: string; rpe: string; rir: string }> = {};
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      const log = logs[k];
      const initialRpe = log?.rpe || (log?.rir ? (10 - parseInt(log.rir, 10)).toString() : '6');
      const rpeNum = parseInt(initialRpe, 10) || 6;
      const initialRir = (10 - rpeNum).toString();

      initial[k] = {
        weight: log?.weight || '',
        reps: log?.reps || '',
        rpe: initialRpe,
        rir: log?.rir || initialRir,
      };
    }
    return initial;
  });

  // Estado visual do auto-salvamento: 'idle' | 'saving' | 'saved'
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 2. Toggle de ativação do Smart Rest automático para RPE 9 ou 10 (RIR 1 ou 0)
  const [isSmartRestEnabled, setIsSmartRestEnabled] = useState<boolean>(() => {
    return safeStorage.get(`smart_rest_enabled_${ex.id}`, true);
  });
  const autoRestAppliedSetsRef = useRef<Set<string>>(new Set());

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
          const rpeVal = ext.rpe || (ext.rir ? (10 - parseInt(ext.rir, 10)).toString() : next[k]?.rpe || '6');
          const rirVal = ext.rir || (10 - (parseInt(rpeVal, 10) || 6)).toString();

          if (
            (ext.weight !== undefined && ext.weight !== next[k]?.weight) ||
            (ext.reps !== undefined && ext.reps !== next[k]?.reps) ||
            (ext.rpe !== undefined && ext.rpe !== next[k]?.rpe) ||
            (ext.rir !== undefined && ext.rir !== next[k]?.rir)
          ) {
            next[k] = {
              weight: ext.weight || '',
              reps: ext.reps || '',
              rpe: rpeVal,
              rir: rirVal,
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [logs, item.sets, ex.id, autoSaveStatus]);

  // Limpa debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Helper de persistência imediata no storage isolado
  const persistLogsToStorageDirectly = (
    logKey: string,
    partial: Partial<{ weight: string; reps: string; rpe: string; rir: string; done: boolean }>
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
  };

  // Digitação de peso / reps
  const handleInputChange = (logKey: string, field: 'weight' | 'reps', value: string) => {
    setLocalLogs((prev) => ({
      ...prev,
      [logKey]: {
        ...(prev[logKey] || { weight: '', reps: '', rpe: '6', rir: '4' }),
        [field]: value,
      },
    }));

    setAutoSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onUpdateLog(logKey, field, value);
      persistLogsToStorageDirectly(logKey, { [field]: value });
      setAutoSaveStatus('saved');
      setTimeout(() => {
        setAutoSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
      }, 1500);
    }, 350);
  };

  // Analisador Inteligente de Sobrecarga Progressiva
  const progression = getOptimalProgressionSuggestion(ex, item.reps, history, logs, sessions);

  // Busca a última sessão que continha este exercício para histórico de 6RM
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

  // Recorde Pessoal Histórico (PR) deste exercício
  const historicalPR = useMemo(() => {
    return getExerciseHistoricalPR(ex.name, sessions, history);
  }, [ex.name, sessions, history]);

  // Função para replicar a série anterior imediatamente acima com 1 toque
  const handleReplicateSet = (targetSetNum: number, sourceSetNum: number) => {
    const sourceKey = `${ex.id}_${sourceSetNum}`;
    const targetKey = `${ex.id}_${targetSetNum}`;
    const src = localLogs[sourceKey] || logs[sourceKey];
    if (!src || !src.weight) return;

    handleInputChange(targetKey, 'weight', src.weight);
    if (src.reps) {
      handleInputChange(targetKey, 'reps', src.reps);
    }
    if (src.rpe) {
      handleUpdateRpe(targetKey, parseInt(src.rpe, 10) || 6);
    }
    soundManager.vibrate(30);
  };

  // Função para preencher todas as séries pendentes com os dados da Série #1
  const handleReplicateFirstSetToAll = () => {
    const firstKey = `${ex.id}_1`;
    const first = localLogs[firstKey] || logs[firstKey];
    if (!first || !first.weight) return;

    for (let s = 2; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      if (!logs[k]?.done) {
        handleInputChange(k, 'weight', first.weight);
        if (first.reps) handleInputChange(k, 'reps', first.reps);
        if (first.rpe) handleUpdateRpe(k, parseInt(first.rpe, 10) || 6);
      }
    }
    soundManager.vibrate([40, 30, 40]);
  };

  // CÁLCULO HISTÓRICO DE 6RM DA ÚLTIMA VEZ QUE O EXERCÍCIO FOI REALIZADO
  const historical6RMSuggestion = useMemo(() => {
    // 1. Procura na última sessão concluída
    if (prevSessionExercise && prevSessionExercise.sets.length > 0) {
      let bestW = 0;
      let bestR = 0;
      let bestRpe: string | undefined = undefined;

      for (const s of prevSessionExercise.sets) {
        if (s.weight > 0 && s.reps > 0) {
          if (s.weight > bestW) {
            bestW = s.weight;
            bestR = s.reps;
            bestRpe = s.rpe || (s.rir ? (10 - parseInt(s.rir, 10)).toString() : undefined);
          }
        }
      }

      if (bestW > 0 && bestR > 0) {
        const val6 = calculate6RM(bestW.toString(), bestR.toString(), bestRpe);
        if (val6 && val6 > 0) {
          return {
            weight: val6,
            source: `Último treino (${bestW}kg × ${bestR} reps${bestRpe ? ` @RPE ${bestRpe}` : ''})`,
            rawWeight: bestW,
            rawReps: bestR,
          };
        }
      }
    }

    // 2. Fallback no histórico isolado
    const histKey = `${ex.id}_1`;
    if (history[histKey]?.weight && history[histKey]?.reps) {
      const hw = parseFloat(history[histKey].weight);
      const hr = parseInt(history[histKey].reps, 10);
      const hrpe = history[histKey].rpe;
      if (hw > 0 && hr > 0) {
        const val6 = calculate6RM(hw.toString(), hr.toString(), hrpe);
        if (val6 && val6 > 0) {
          return {
            weight: val6,
            source: `Histórico anterior (${hw}kg × ${hr} reps)`,
            rawWeight: hw,
            rawReps: hr,
          };
        }
      }
    }

    return null;
  }, [ex.id, prevSessionExercise, history]);

  // Atualização de RPE com botões +/- ou seleção direta (Range: 6 a 10)
  // RPE 6 = RIR 4, RPE 7 = RIR 3, RPE 8 = RIR 2, RPE 9 = RIR 1, RPE 10 = RIR 0
  const handleUpdateRpe = (logKey: string, newRpe: number) => {
    const clampedRpe = Math.max(6, Math.min(10, newRpe));
    const derivedRir = (10 - clampedRpe).toString();
    const rpeStr = clampedRpe.toString();

    setLocalLogs((prev) => ({
      ...prev,
      [logKey]: {
        ...(prev[logKey] || { weight: '', reps: '' }),
        rpe: rpeStr,
        rir: derivedRir,
      },
    }));

    onUpdateLog(logKey, 'rpe', rpeStr);
    onUpdateLog(logKey, 'rir', derivedRir);
    persistLogsToStorageDirectly(logKey, { rpe: rpeStr, rir: derivedRir });

    // Se RPE for 9 ou 10 (RIR 1 ou 0) e Smart Rest estiver ligado, adiciona +30s de descanso
    if (isSmartRestEnabled && (clampedRpe >= 9)) {
      if (!autoRestAppliedSetsRef.current.has(logKey)) {
        autoRestAppliedSetsRef.current.add(logKey);
        if (onUpdateRest) {
          onUpdateRest(index, item.rest + 30);
        }
      }
    }

    setAutoSaveStatus('saved');
    setTimeout(() => {
      setAutoSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr));
    }, 1500);
  };

  const handleAdjustRest = (delta: number) => {
    if (onUpdateRest) {
      onUpdateRest(index, Math.max(15, item.rest + delta));
    }
  };

  const handleToggleSmartRest = () => {
    setIsSmartRestEnabled((prev) => {
      const next = !prev;
      safeStorage.set(`smart_rest_enabled_${ex.id}`, next);
      return next;
    });
  };

  // Aplica o 6RM calculado a todas as séries abertas
  const handleApply6RM = (weightVal: number) => {
    for (let s = 1; s <= item.sets; s++) {
      const k = `${ex.id}_${s}`;
      if (!logs[k]?.done) {
        handleInputChange(k, 'weight', weightVal.toString());
      }
    }
  };

  const firstSetKey = `${ex.id}_1`;
  const firstSetWeight = localLogs[firstSetKey]?.weight || logs[firstSetKey]?.weight || '60';

  return (
    <div className="active-workout-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-slate-700/80">
      {/* 1. Header do Exercício */}
      {/* 1. Header do Exercício (Layout Espaçoso & Otimizado para Mobile) */}
      <div className="p-3 sm:p-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          {/* Título & Músculo */}
          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 shrink-0">
              {muscleName}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {ex.name}
            </h3>

            {/* Badge de 6RM histórico */}
            {historical6RMSuggestion && (
              <button
                type="button"
                onClick={() => handleApply6RM(historical6RMSuggestion.weight)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shrink-0 active:scale-95"
                title={`${historical6RMSuggestion.source}. Clique para aplicar nas séries abertas.`}
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>6RM: ~{historical6RMSuggestion.weight}kg</span>
              </button>
            )}

            {/* Badge de RIR Alvo configurado no perfil */}
            {targetMuscleRir !== undefined && (
              <div 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
                title={`RIR Alvo personalizado para ${MUSCLE_NAMES[item.muscleKey] || ex.name}: ${targetMuscleRir} repetições na reserva (RPE ${10 - targetMuscleRir})`}
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>RIR Alvo: {targetMuscleRir}</span>
              </div>
            )}

            {/* Botão Dica de Execução */}
            <button
              type="button"
              onClick={() => setShowExecutionTip((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer shrink-0 active:scale-95 ${
                showExecutionTip
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-sm'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
              }`}
              title="Dica de execução e biomecânica do movimento"
            >
              <HelpCircle className="w-3 h-3 text-sky-400" />
              <span>Dica de Execução</span>
            </button>
          </div>

          {/* Menu de 3 Pontos para Ações do Exercício */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Opções do exercício"
              aria-label="Opções do exercício"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu de 3 Pontos */}
            {showMenu && (
              <div className="absolute right-0 top-9 w-56 bg-[#0c1424] border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-40 animate-fadeIn space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowExecutionTip(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Dica de Execução</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSwap(index);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-300 hover:bg-sky-950/40 transition-colors text-left cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Trocar Exercício</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSwap(index);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-300 hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Aparelho Ocupado?</span>
                    <span className="block text-[10px] text-slate-400">Trocar por substituto direto</span>
                  </div>
                </button>

                {onOpenPlateCalc && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenPlateCalc(parseFloat(firstSetWeight) || 0);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-300 hover:bg-teal-950/40 transition-colors text-left cursor-pointer"
                  >
                    <Disc className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Calculadora de Anilhas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenWarmup(ex.name, firstSetWeight);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-300 hover:bg-orange-950/40 transition-colors text-left cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Aquecimento Inteligente</span>
                </button>

                {onOpenAnalytics && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenAnalytics(ex.name);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gráficos & Histórico</span>
                  </button>
                )}

                <div className="pt-1 border-t border-slate-800 flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] text-slate-400 font-medium">Ordem:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canMoveUp}
                      onClick={() => {
                        onMoveUp?.(index);
                      }}
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
                      onClick={() => {
                        onMoveDown?.(index);
                      }}
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
                              setShowMenu(false);
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
            )}
          </div>
        </div>

        {/* Sub-header com Smart Rest e Status do Auto-save */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSmartRest}
              className={`h-6 px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isSmartRestEnabled
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Smart Rest: adiciona +30s de descanso quando atingir RPE 9 ou 10"
            >
              <Zap className={`w-3 h-3 ${isSmartRestEnabled ? 'fill-emerald-400 text-emerald-400' : 'text-slate-500'}`} />
              <span>Smart Rest {isSmartRestEnabled ? 'ON (+30s no RPE 9/10)' : 'OFF'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>Salvando...</span>
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>Salvo</span>
              </span>
            )}
          </div>
        </div>

        {/* Banner Preditivo de Sobrecarga Progressiva */}
        {progression && progression.status === 'progress' && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-white text-xs">
                    ⚡ Sobrecarga Preditiva: <strong className="text-emerald-400 font-mono">{progression.suggestedWeight}kg</strong>
                  </span>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    +{progression.suggestedWeight - (progression.currentWeight || 0)}kg
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 truncate block">
                  {progression.reason}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                for (let s = 1; s <= item.sets; s++) {
                  const k = `${ex.id}_${s}`;
                  if (!logs[k]?.done) {
                    handleInputChange(k, 'weight', progression.suggestedWeight.toString());
                  }
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shadow-sm transition-all cursor-pointer shrink-0 active:scale-95"
            >
              Aplicar Carga
            </button>
          </div>
        )}
      </div>

      {/* Popover Biomecânico de Dica de Execução */}
      {showExecutionTip && (
        <div
          ref={executionTipRef}
          className="m-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[#0c1424] via-[#090f1d] to-[#060a14] border border-sky-500/40 shadow-2xl animate-fadeIn space-y-2.5 relative"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white">{ex.name}</h4>
                <span className="text-[10px] text-sky-300 font-mono">Dica de Execução & Biomecânica</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowExecutionTip(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Badges de Anatomia, Estabilidade e Perfil */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-200 border border-slate-700 font-semibold">
              🎯 {ex.target}
            </span>
            {ex.stability && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-semibold">
                Estabilidade: {ex.stability}
              </span>
            )}
            {ex.profile && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/25 font-semibold">
                Perfil: {ex.profile}
              </span>
            )}
          </div>

          {/* Biomecânica do Movimento */}
          {ex.bio && (
            <div className="bg-[#070c18] rounded-xl p-2.5 border border-slate-800/90 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                🔬 Biomecânica & Curva de Tensão:
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                {ex.bio}
              </p>
            </div>
          )}

          {/* Dica de Ouro de Execução (Cue Prática) */}
          {ex.cue && (
            <div className="bg-emerald-950/20 rounded-xl p-2.5 border border-emerald-500/30 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dica de Ouro para Execução Correta:</span>
              </span>
              <p className="text-emerald-200/95 font-medium leading-relaxed text-[11px] sm:text-xs">
                "{ex.cue}"
              </p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowExecutionTip(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 2. Lista de Séries */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Barra Superior da Seção de Séries: Recorde (PR) Histórico & Replicação Rápida */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs flex-wrap pb-1 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {historicalPR.maxWeight > 0 ? (
              <span>
                Recorde Pessoal (PR): <strong className="text-amber-300 font-mono">{historicalPR.maxWeight}kg</strong>
                {historicalPR.best1RM > 0 && <span> (1RM ~{historicalPR.best1RM}kg)</span>}
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

        {Array.from({ length: item.sets }).map((_, sIdx) => {
          const setNum = sIdx + 1;
          const logKey = `${ex.id}_${setNum}`;
          const setLog = logs[logKey] || { weight: '', reps: '', rpe: '6', rir: '4', done: false };
          const localLog = localLogs[logKey] || { 
            weight: setLog.weight || '', 
            reps: setLog.reps || '', 
            rpe: setLog.rpe || '6', 
            rir: setLog.rir || '4' 
          };

          const currWeightVal = localLog.weight !== undefined ? localLog.weight : setLog.weight;
          const currRepsVal = localLog.reps !== undefined ? localLog.reps : setLog.reps;
          const currentRpeNum = parseInt(localLog.rpe || setLog.rpe || '6', 10) || 6;
          const currentRirNum = 10 - currentRpeNum;

          // Histórico comparativo da série específica no treino anterior
          const prevSetRecord = prevSessionExercise?.sets?.[sIdx]
            ? {
                weight: prevSessionExercise.sets[sIdx].weight.toString(),
                reps: prevSessionExercise.sets[sIdx].reps.toString(),
                rpe: prevSessionExercise.sets[sIdx].rpe?.toString(),
              }
            : (history[logKey]?.weight && history[logKey]?.reps)
            ? {
                weight: history[logKey].weight,
                reps: history[logKey].reps,
                rpe: history[logKey].rpe,
              }
            : null;

          // CÁLCULO DE 1RM E 6RM COM O RPE/RIR DA SÉRIE
          const est1RM = calculate1RM(currWeightVal, currRepsVal, currentRpeNum.toString());
          const est6RM = calculate6RM(currWeightVal, currRepsVal, currentRpeNum.toString());

          // DETECÇÃO DE RECORDE PESSOAL (PR) NA SÉRIE
          const setWeightNum = parseFloat(currWeightVal) || 0;
          const setRepsNum = parseInt(currRepsVal, 10) || 0;
          const prResult = checkSetPR(ex.name, setWeightNum, setRepsNum, historicalPR);

          // CÁLCULO DE CARGA ESTIMADA PARA A PRÓXIMA SÉRIE
          const prevW = parseFloat(currWeightVal) || 0;
          const prevR = parseInt(currRepsVal, 10) || 0;
          const nextSetSuggestedWeight = (prevW > 0 && prevR > 0)
            ? estimateNextSetWeight(prevW, prevR, currentRpeNum, prevR, 8)
            : null;

          const isExpanded = !!expandedSets[logKey];

          // A) SÉRIE CONCLUÍDA
          if (setLog.done && !isExpanded) {
            return (
              <div
                key={logKey}
                className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-3 transition-all hover:border-emerald-500/60 shadow-sm space-y-2"
              >
                {/* Badge de PR batido nesta série */}
                {prResult && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] animate-pulse">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span>
                      🔥 NOVO RECORDE PESSOAL (PR)!{' '}
                      {prResult.isWeightPR
                        ? `+${prResult.diffWeight}kg na carga máxima!`
                        : `+${prResult.diff1RM}kg no 1RM estimado!`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-emerald-500/20">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs sm:text-sm">Série #{setNum}</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-sm sm:text-base">{currWeightVal || '0'} kg</span>
                        <span className="font-mono text-slate-300 text-xs sm:text-sm">× {currRepsVal || '0'} reps</span>
                        <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                          @RPE {currentRpeNum} (RIR {currentRirNum})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                        {est1RM && <span>1RM ~{est1RM}kg</span>}
                        {est6RM && <span>· 6RM ~{est6RM}kg</span>}
                        {nextSetSuggestedWeight && sIdx < item.sets - 1 && (
                          <span className="text-emerald-400 font-medium">
                            · Próx. série estimada: ~{nextSetSuggestedWeight}kg
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações da Série Concluída */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedSets((prev) => ({ ...prev, [logKey]: true }))}
                      className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar peso, repetições ou RPE"
                    >
                      <Pencil className="w-3 h-3 text-sky-400" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSet(logKey, item.rest)}
                      className="h-8 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                      title="Desmarcar conclusão"
                    >
                      Refazer
                    </button>
                  </div>
                </div>

                {/* Seletor RPE 6 a 10 com botões + e - */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">Esforço (RPE):</span>
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateRpe(logKey, currentRpeNum - 1)}
                        disabled={currentRpeNum <= 6}
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 font-mono font-bold text-xs text-white">
                        RPE {currentRpeNum}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateRpe(logKey, currentRpeNum + 1)}
                        disabled={currentRpeNum >= 10}
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    RIR {currentRirNum} ({currentRirNum === 0 ? 'falha total' : `${currentRirNum} reps na reserva`})
                  </span>
                </div>
              </div>
            );
          }

          // B) SÉRIE PENDENTE / EXPANDIDA
          return (
            <div
              key={logKey}
              className={`rounded-xl p-3 border transition-all ${
                setLog.done
                  ? 'bg-slate-950/90 border-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Linha Principal de Entrada */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-mono font-bold text-sky-400 text-sm shrink-0">
                    #{setNum}
                  </div>

                  {/* Input Carga */}
                  <div className="flex-1 sm:w-36 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      placeholder="0"
                      value={currWeightVal}
                      onChange={(e) => handleInputChange(logKey, 'weight', e.target.value)}
                      className="w-full bg-transparent font-mono font-black text-white text-base focus:outline-none"
                    />
                    {onOpenPlateCalc ? (
                      <button
                        type="button"
                        onClick={() => onOpenPlateCalc(parseFloat(currWeightVal) || (prevSetRecord ? parseFloat(prevSetRecord.weight) : 0) || 0)}
                        className="text-xs font-bold text-sky-400 hover:text-sky-300 font-mono ml-1 px-1.5 py-0.5 rounded hover:bg-sky-500/20 transition-colors cursor-pointer shrink-0"
                        title="Calcular anilhas para esta carga"
                      >
                        kg ⟳
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 font-mono ml-1">kg</span>
                    )}
                  </div>

                  {/* Input Repetições */}
                  <div className="flex-1 sm:w-32 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center justify-between focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={currRepsVal}
                      onChange={(e) => handleInputChange(logKey, 'reps', e.target.value)}
                      className="w-full bg-transparent font-mono font-black text-white text-base focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-400 font-mono ml-1">reps</span>
                  </div>
                </div>

                {/* Botão de Conclusão */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = null;
                      }
                      onUpdateLog(logKey, 'weight', currWeightVal);
                      onUpdateLog(logKey, 'reps', currRepsVal);
                      onUpdateLog(logKey, 'rpe', currentRpeNum.toString());
                      onUpdateLog(logKey, 'rir', currentRirNum.toString());
                      persistLogsToStorageDirectly(logKey, { 
                        weight: currWeightVal, 
                        reps: currRepsVal, 
                        rpe: currentRpeNum.toString(),
                        rir: currentRirNum.toString(),
                        done: !setLog.done 
                      });

                      if (isSmartRestEnabled && currentRpeNum >= 9) {
                        if (!autoRestAppliedSetsRef.current.has(logKey)) {
                          autoRestAppliedSetsRef.current.add(logKey);
                          if (onUpdateRest) {
                            onUpdateRest(index, item.rest + 30);
                          }
                        }
                      }

                      // Comemoração especial se for Novo Recorde Pessoal (PR)
                      if (prResult) {
                        soundManager.playPRCelebration();
                      } else {
                        soundManager.vibrateSetComplete();
                      }

                      onToggleSet(logKey, item.rest);
                      setExpandedSets((prev) => ({ ...prev, [logKey]: false }));
                    }}
                    className={`flex-1 sm:flex-initial h-11 px-5 rounded-xl flex items-center justify-center font-bold text-sm tracking-wide transition-all cursor-pointer gap-2 touch-manipulation shadow-md ${
                      setLog.done
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Concluir Série</span>
                  </button>
                </div>
              </div>

              {/* Badge de Novo Recorde Pessoal em Tempo Real */}
              {prResult && (
                <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] flex items-center justify-between gap-2 animate-pulse shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    <span>
                      🔥 NOVO RECORDE PESSOAL (PR)!{' '}
                      {prResult.isWeightPR
                        ? `+${prResult.diffWeight}kg na carga máxima!`
                        : `+${prResult.diff1RM}kg no 1RM estimado!`}
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    Histórico Superado
                  </span>
                </div>
              )}

              {/* Botões Rápidos de 1-Toque: Copiar Série Anterior da Sessão ou Repetir do Treino Anterior */}
              <div className="flex items-center gap-1.5 mt-2 px-1 text-[11px] text-slate-400 flex-wrap">
                {/* 1-Tap: Replicar Série Anterior desta mesma sessão */}
                {sIdx > 0 && (() => {
                  const prevSetInSession = localLogs[`${ex.id}_${setNum - 1}`] || logs[`${ex.id}_${setNum - 1}`];
                  const hasPrevWeight = prevSetInSession && (parseFloat(prevSetInSession.weight) || 0) > 0;
                  if (!hasPrevWeight) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => handleReplicateSet(setNum, setNum - 1)}
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-1 rounded-lg border border-emerald-500/30 transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="Copiar carga e repetições da série imediatamente anterior"
                    >
                      <Copy className="w-3 h-3 text-emerald-400" />
                      <span>Copiar Série #{setNum - 1} ({prevSetInSession.weight}kg × {prevSetInSession.reps || '0'})</span>
                    </button>
                  );
                })()}

                {/* Marca d'água comparativa da série no treino anterior (1-toque para repetir) */}
                {prevSetRecord && (
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Anterior:</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange(logKey, 'weight', prevSetRecord.weight);
                        handleInputChange(logKey, 'reps', prevSetRecord.reps);
                        if (prevSetRecord.rpe) {
                          handleUpdateRpe(logKey, parseInt(prevSetRecord.rpe, 10) || 6);
                        }
                      }}
                      className="inline-flex items-center gap-1 font-mono font-semibold text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/20 transition-colors cursor-pointer"
                      title="Toque para preencher com a carga e repetições do treino anterior"
                    >
                      <span>{prevSetRecord.weight}kg × {prevSetRecord.reps} reps</span>
                      {prevSetRecord.rpe && <span className="text-amber-400 font-bold">@{prevSetRecord.rpe}</span>}
                      <span className="text-[10px] text-sky-400 font-sans ml-0.5 font-bold">(repetir)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Informações de 1RM e Carga Sugerida */}
              <div className="flex items-center justify-between gap-2 mt-2 px-1 text-xs text-slate-400 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {est1RM && (
                    <span className="text-sky-400 font-mono font-medium">
                      1RM est.: <strong>~{est1RM}kg</strong>
                    </span>
                  )}
                  {est6RM && (
                    <span className="text-amber-400 font-mono font-medium">
                      · 6RM: <strong>~{est6RM}kg</strong>
                    </span>
                  )}
                  {nextSetSuggestedWeight && sIdx < item.sets - 1 && (
                    <span className="text-emerald-400 font-medium">
                      · Sugerido próx. série: <strong>~{nextSetSuggestedWeight}kg</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Controle de RPE de 6 a 10 com + e - e cálculo automático de RIR */}
              <div className="mt-3 pt-2.5 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">Intensidade (RPE de 6 a 10):</span>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    RPE {currentRpeNum} ➔ RIR {currentRirNum} {currentRirNum === 0 ? '(falha)' : `(${currentRirNum} sobram)`}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Botões - e + para ajuste do RPE com botões maiores e acessíveis */}
                  <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateRpe(logKey, currentRpeNum - 1)}
                      disabled={currentRpeNum <= 6}
                      className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                      title="Diminuir RPE"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-extrabold text-sm text-white px-3 min-w-[70px] text-center">
                      RPE {currentRpeNum}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateRpe(logKey, currentRpeNum + 1)}
                      disabled={currentRpeNum >= 10}
                      className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95"
                      title="Aumentar RPE"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                    {/* Seletor direto RPE 6 a 10 */}
                    <div className="flex items-center gap-1.5 flex-1 max-w-xs justify-end">
                      {RPE_PRESETS.map((p) => {
                        const isSelected = currentRpeNum === p.rpe;
                        const isTarget = targetMuscleRir !== undefined && p.rir === targetMuscleRir;
                        return (
                          <button
                            key={p.rpe}
                            type="button"
                            onClick={() => handleUpdateRpe(logKey, p.rpe)}
                            className={`flex-1 py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300 scale-105'
                                : isTarget
                                ? 'bg-amber-500/15 border-2 border-amber-500/60 text-amber-300 hover:bg-amber-500/25'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title={`RPE ${p.rpe} = RIR ${p.rir}${isTarget ? ' (Meta configurada para este músculo)' : ''}`}
                          >
                            <span>{p.rpe}</span>
                            {isTarget && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Rodapé do Card — Controles de Série e Descanso */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddSet(index)}
            className="h-9 px-3 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adicionar Série</span>
          </button>

          {item.sets > 1 && (
            <button
              type="button"
              onClick={() => onRemoveSet(index)}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 transition-colors cursor-pointer touch-manipulation"
              title="Remover série"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {progression.status === 'progress' && (
            <button
              type="button"
              onClick={() => {
                for (let s = 1; s <= item.sets; s++) {
                  const k = `${ex.id}_${s}`;
                  if (!logs[k]?.done) {
                    handleInputChange(k, 'weight', progression.suggestedWeight.toString());
                  }
                }
              }}
              className="h-9 px-3 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer touch-manipulation"
              title="Aplicar carga recomendada de sobrecarga progressiva"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span>+{progression.suggestedWeight}kg</span>
            </button>
          )}
        </div>

        {/* Ajuste Rápido de Descanso */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-4 h-4 text-sky-400 shrink-0" />
          <button
            type="button"
            onClick={() => handleAdjustRest(-15)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer font-bold text-sm touch-manipulation"
            title="-15s"
          >
            -
          </button>
          <span className="text-white font-mono font-bold text-sm min-w-[36px] text-center">
            {item.rest}s
          </span>
          <button
            type="button"
            onClick={() => handleAdjustRest(15)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer font-bold text-sm touch-manipulation"
            title="+15s"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};
