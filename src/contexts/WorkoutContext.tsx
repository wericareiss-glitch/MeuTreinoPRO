/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SplitOption,
  StrategyOption,
  PeriodizationStrategy,
  PERIODIZATION_PHASES,
  LevelOption,
  EquipmentRequirement,
  WorkoutItem,
  WorkoutLogs,
  MuscleGroup,
  Exercise,
  GeneratedWorkoutRoutine
} from '../types/workout';
import { safeStorage, calculateVolumeLoad } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { generateWeeklyRoutines, generateQuickWorkoutRoutine } from '../utils/routineGenerator';
import { syncRoutinesToCloud } from '../services/firebase';
import { MUSCLE_NAMES } from '../data/exerciseDatabase';
import { useAuth } from './AuthContext';
import { useHistory } from './HistoryContext';

export interface WorkoutContextType {
  // Config
  split: SplitOption;
  setSplit: (s: SplitOption) => void;
  strategy: StrategyOption;
  setStrategy: (s: StrategyOption) => void;
  periodizationStrategy: PeriodizationStrategy;
  setPeriodizationStrategy: (p: PeriodizationStrategy) => void;
  weeklyBudget: number;
  setWeeklyBudget: (b: number) => void;
  level: LevelOption;
  setLevel: (l: LevelOption) => void;
  equip: EquipmentRequirement;
  setEquip: (e: EquipmentRequirement) => void;
  restSeconds: number;
  setRestSeconds: (s: number) => void;
  exercisesPerMuscle: 1;

  // Routines list
  routines: GeneratedWorkoutRoutine[];
  setRoutines: React.Dispatch<React.SetStateAction<GeneratedWorkoutRoutine[]>>;
  editingRoutine: GeneratedWorkoutRoutine | null;
  setEditingRoutine: (r: GeneratedWorkoutRoutine | null) => void;
  isManualWorkoutOpen: boolean;
  setIsManualWorkoutOpen: (open: boolean) => void;

  // Active workout
  activeRoutineId: string | null;
  activeRoutineStartedAt: number | null;
  activeRoutine: GeneratedWorkoutRoutine | null;
  workoutItems: WorkoutItem[];
  setWorkoutItems: React.Dispatch<React.SetStateAction<WorkoutItem[]>>;
  logs: WorkoutLogs;
  workoutNotes: string;
  setWorkoutNotes: (notes: string) => void;
  isAddExerciseOpen: boolean;
  setIsAddExerciseOpen: (open: boolean) => void;
  warmupData: { isOpen: boolean; name: string; weight: string };
  setWarmupData: React.Dispatch<React.SetStateAction<{ isOpen: boolean; name: string; weight: string }>>;
  swapData: { isOpen: boolean; index: number | null; currentExerciseId: string; muscleKey: string };
  setSwapData: React.Dispatch<React.SetStateAction<{ isOpen: boolean; index: number | null; currentExerciseId: string; muscleKey: string }>>;

  // Rest Timer HUD & Audio
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  timerTriggerKey: number;
  timerRestSeconds: number;
  activeExerciseName: string | undefined;

  // KPIs & Counts
  completedSetsByMuscle: Record<MuscleGroup, number>;
  totalSetsInWorkout: number;
  totalCompletedSetsInWorkout: number;
  activeWorkoutMuscles: MuscleGroup[];

  // Handlers
  handleStartWorkout: (routine: GeneratedWorkoutRoutine, onStartNav?: () => void) => void;
  handleDiscardActiveWorkout: (onCancelNav?: () => void) => void;
  finishAndSaveSession: (onFinishedNav?: () => void) => void;
  handleUpdateLog: (key: string, field: 'weight' | 'reps' | 'setType', val: string) => void;
  handleToggleSet: (key: string, restSec: number) => void;
  handleAddSet: (itemIndex: number) => void;
  handleRemoveSet: (itemIndex: number) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
  handleReorderExercises: (fromIndex: number, toIndex: number) => void;
  handleReorderRoutines: (fromIndex: number, toIndex: number) => void;
  handleDeleteExercise: (index: number) => void;
  handleSelectSwapExercise: (index: number, newExercise: Exercise) => void;
  handleAddCustomExercise: (newItem: WorkoutItem) => void;
  handleUpdateRest: (index: number, newRest: number) => void;
  handleSelectPeriodizationStrategy: (phase: PeriodizationStrategy) => void;
  handleGenerateWeeklyRoutines: (forcedSplit?: SplitOption) => void;
  handleGenerateQuickWorkout: () => void;
  handleShareRoutine: (routine: GeneratedWorkoutRoutine) => void;
  handleSaveManualRoutine: (routine: GeneratedWorkoutRoutine) => void;
  handleDeleteRoutine: (routineId: string) => void;
  handleOpenCreateManualRoutine: () => void;
  handleEditRoutine: (routine: GeneratedWorkoutRoutine) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{
  children: React.ReactNode;
  onShowToast: (msg: string) => void;
}> = ({ children, onShowToast }) => {
  const { currentUser } = useAuth();
  const { sessions, history, addCompletedSession } = useHistory();
  const uid = currentUser?.id;
  const loadedUserIdRef = useRef<string | null>(uid || null);

  // Config state
  const [split, setSplit] = useState<SplitOption>(() => {
    if (!uid) return 'upper_lower';
    return safeStorage.get(`alex_u_${uid}_split`, currentUser?.preferredSplit || 'upper_lower');
  });

  const [strategy, setStrategy] = useState<StrategyOption>(() => {
    if (!uid) return 'synergy';
    return safeStorage.get<StrategyOption>(`alex_u_${uid}_strategy`, 'synergy');
  });

  const [periodizationStrategy, setPeriodizationStrategy] = useState<PeriodizationStrategy>(() => {
    if (!uid) return 'hypertrophy';
    return safeStorage.get<PeriodizationStrategy>(
      `alex_u_${uid}_periodization_strategy`,
      currentUser?.periodizationStrategy || (currentUser?.focus === 'strength' ? 'strength' : 'hypertrophy')
    );
  });

  const exercisesPerMuscle: 1 = 1;

  const [weeklyBudget, setWeeklyBudget] = useState<number>(() => {
    if (!uid) return 80;
    return safeStorage.get(`alex_u_${uid}_weekly_budget`, currentUser?.weeklyBudget || 80);
  });

  const [level, setLevel] = useState<LevelOption>(() => currentUser?.level || 'intermediate');
  const [equip, setEquip] = useState<EquipmentRequirement>('full_gym');
  const [restSeconds, setRestSeconds] = useState<number>(30);

  // Routines state
  const [routines, setRoutines] = useState<GeneratedWorkoutRoutine[]>(() => {
    if (!uid) return [];
    return safeStorage.get(`alex_u_${uid}_routines`, []);
  });

  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(() => {
    if (!uid) return null;
    return safeStorage.get(`alex_u_${uid}_active_routine_id`, null);
  });

  const [activeRoutineStartedAt, setActiveRoutineStartedAt] = useState<number | null>(() => {
    if (!uid) return null;
    return safeStorage.get(`alex_u_${uid}_active_routine_started_at`, null);
  });

  // Active workout execution
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>(() => {
    if (!uid) return [];
    return safeStorage.get(`alex_u_${uid}_workout`, []);
  });

  const [logs, setLogs] = useState<WorkoutLogs>(() => {
    if (!uid) return {};
    return safeStorage.get(`alex_u_${uid}_current_logs`, {});
  });

  const [workoutNotes, setWorkoutNotes] = useState<string>(() => {
    if (!uid) return '';
    return safeStorage.get(`alex_u_${uid}_workout_notes`, '');
  });

  // Floating Rest Timer & Audio
  const [isMuted, setIsMuted] = useState<boolean>(() => safeStorage.get('alex_muted', false));
  const [timerTriggerKey, setTimerTriggerKey] = useState(0);
  const [timerRestSeconds, setTimerRestSeconds] = useState(30);

  // Modals inside workout scope
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [warmupData, setWarmupData] = useState<{ isOpen: boolean; name: string; weight: string }>({
    isOpen: false,
    name: '',
    weight: '60',
  });
  const [swapData, setSwapData] = useState<{
    isOpen: boolean;
    index: number | null;
    currentExerciseId: string;
    muscleKey: string;
  }>({
    isOpen: false,
    index: null,
    currentExerciseId: '',
    muscleKey: '',
  });
  const [editingRoutine, setEditingRoutine] = useState<GeneratedWorkoutRoutine | null>(null);
  const [isManualWorkoutOpen, setIsManualWorkoutOpen] = useState(false);

  // Update sound manager mute state
  useEffect(() => {
    soundManager.setMuted(isMuted);
    safeStorage.set('alex_muted', isMuted);
  }, [isMuted]);

  // Synchronize workout state when active user changes
  useEffect(() => {
    if (!currentUser) {
      loadedUserIdRef.current = null;
      setRoutines([]);
      setActiveRoutineId(null);
      setActiveRoutineStartedAt(null);
      setWorkoutItems([]);
      setLogs({});
      setWorkoutNotes('');
      return;
    }

    const currentUid = currentUser.id;
    const defaultSplit: SplitOption = currentUser.preferredSplit || (
      currentUser.focus === 'glutes' 
        ? 'lower' 
        : currentUser.frequency === 3 || currentUser.frequency === 6
        ? 'ppl' 
        : currentUser.frequency === 5
        ? 'abcde'
        : 'upper_lower'
    );

    const resolvedSplit = safeStorage.get(`alex_u_${currentUid}_split`, defaultSplit);
    const resolvedStrategy = safeStorage.get<StrategyOption>(`alex_u_${currentUid}_strategy`, 'synergy');
    const resolvedBudget = safeStorage.get(`alex_u_${currentUid}_weekly_budget`, currentUser.weeklyBudget || 80);
    const resolvedLevel = safeStorage.get<LevelOption>(`alex_u_${currentUid}_level`, currentUser.level || 'beginner');
    const resolvedEquip = safeStorage.get<EquipmentRequirement>(`alex_u_${currentUid}_equip`, 'full_gym');

    setSplit(resolvedSplit);
    setStrategy(resolvedStrategy);
    setWeeklyBudget(resolvedBudget);
    setLevel(resolvedLevel);
    setEquip(resolvedEquip);

    let storedRoutines = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${currentUid}_routines`, []);
    const hasInit = safeStorage.get<boolean>(`alex_u_${currentUid}_has_init_routines`, false);
    if (storedRoutines.length === 0 && !hasInit) {
      safeStorage.set(`alex_u_${currentUid}_has_init_routines`, true);
      const nowTs = Date.now();
      const initialGenerated = generateWeeklyRoutines({
        user: currentUser,
        split: resolvedSplit,
        strategy: resolvedStrategy,
        manualWeeklySets: resolvedBudget,
        level: resolvedLevel,
        equip: resolvedEquip,
        restSeconds: 60,
      }).map((r, idx) => ({
        ...r,
        id: `${r.id}_v1_${nowTs}_${idx}`,
        version: 1,
        createdAt: new Date(nowTs + idx).toISOString(),
      }));
      storedRoutines = initialGenerated;
      safeStorage.set(`alex_u_${currentUid}_routines`, storedRoutines);
    } else if (storedRoutines.length > 0 && !hasInit) {
      safeStorage.set(`alex_u_${currentUid}_has_init_routines`, true);
    }

    setRoutines(storedRoutines);
    setActiveRoutineId(safeStorage.get(`alex_u_${currentUid}_active_routine_id`, null));
    setActiveRoutineStartedAt(safeStorage.get(`alex_u_${currentUid}_active_routine_started_at`, null));
    setWorkoutItems(safeStorage.get(`alex_u_${currentUid}_workout`, []));
    setLogs(safeStorage.get(`alex_u_${currentUid}_current_logs`, {}));
    setWorkoutNotes(safeStorage.get(`alex_u_${currentUid}_workout_notes`, ''));

    loadedUserIdRef.current = currentUid;
  }, [currentUser]);

  // Persist settings
  useEffect(() => {
    if (!uid || loadedUserIdRef.current !== uid) return;
    safeStorage.set(`alex_u_${uid}_split`, split);
    safeStorage.set(`alex_u_${uid}_strategy`, strategy);
    safeStorage.set(`alex_u_${uid}_ex_per_muscle`, exercisesPerMuscle);
    safeStorage.set(`alex_u_${uid}_weekly_budget`, weeklyBudget);
    safeStorage.set(`alex_u_${uid}_level`, level);
    safeStorage.set(`alex_u_${uid}_equip`, equip);
    safeStorage.set(`alex_u_${uid}_periodization_strategy`, periodizationStrategy);
  }, [split, strategy, weeklyBudget, level, equip, periodizationStrategy, uid]);

  // Persist routines and sync to cloud
  useEffect(() => {
    if (!uid || loadedUserIdRef.current !== uid) return;
    safeStorage.set(`alex_u_${uid}_routines`, routines);
    if (currentUser && !currentUser.isVisitor) {
      syncRoutinesToCloud(uid, routines).catch(() => {});
    }
  }, [routines, uid, currentUser]);

  // Persist active workout items
  useEffect(() => {
    if (!uid || loadedUserIdRef.current !== uid) return;
    safeStorage.set(`alex_u_${uid}_workout`, workoutItems);
  }, [workoutItems, uid]);

  // Persist active logs
  useEffect(() => {
    if (!uid || loadedUserIdRef.current !== uid) return;
    safeStorage.set(`alex_u_${uid}_current_logs`, logs);
  }, [logs, uid]);

  // Persist workout notes
  useEffect(() => {
    if (!uid) {
      safeStorage.set('alex_guest_workout_notes', workoutNotes);
      return;
    }
    if (loadedUserIdRef.current !== uid) return;
    safeStorage.set(`alex_u_${uid}_workout_notes`, workoutNotes);
  }, [workoutNotes, uid]);

  // Active routine identification
  const activeRoutine = useMemo(() => {
    if (!activeRoutineId) return null;
    return routines.find((r) => r.id === activeRoutineId) || (routines.length > 0 ? routines[0] : null);
  }, [routines, activeRoutineId]);

  // Muscle Volume & Progress KPIs
  const activeWorkoutMuscles = useMemo(() => {
    return Array.from(new Set(workoutItems.map((item) => item.muscleKey))) as MuscleGroup[];
  }, [workoutItems]);

  const completedSetsByMuscle = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const counts: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;

    const thisWeekSessions = sessions.filter((s) => new Date(s.date) >= monday);
    thisWeekSessions.forEach((sess) => {
      sess.completedExercises?.forEach((ex) => {
        if (ex.muscleKey) {
          counts[ex.muscleKey] = (counts[ex.muscleKey] || 0) + (ex.sets?.length || 0);
        }
      });
    });

    workoutItems.forEach((item) => {
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        if (logs[key]?.done) {
          counts[item.muscleKey] = (counts[item.muscleKey] || 0) + 1;
        }
      }
    });

    return counts;
  }, [sessions, workoutItems, logs]);

  const totalSetsInWorkout = useMemo(() => {
    return workoutItems.reduce((acc, item) => acc + item.sets, 0);
  }, [workoutItems]);

  const totalCompletedSetsInWorkout = useMemo(() => {
    let count = 0;
    workoutItems.forEach((item) => {
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        if (logs[key]?.done) count++;
      }
    });
    return count;
  }, [workoutItems, logs]);

  const activeExerciseName = useMemo(() => {
    if (!activeRoutine) return undefined;
    const pendingItem =
      workoutItems.find((it) => {
        for (let s = 1; s <= it.sets; s++) {
          if (!logs[`${it.exercise.id}_${s}`]?.done) return true;
        }
        return false;
      }) || workoutItems[0];
    return pendingItem?.exercise.name || activeRoutine.name;
  }, [activeRoutine, workoutItems, logs]);

  // Reorder sync helper
  const syncActiveRoutineItems = useCallback((updatedItems: WorkoutItem[]) => {
    if (!activeRoutineId) return;
    setRoutines((prev) =>
      prev.map((r) => (r.id === activeRoutineId ? { ...r, items: updatedItems } : r))
    );
  }, [activeRoutineId]);

  // Workout execution handlers
  const handleStartWorkout = useCallback((routine: GeneratedWorkoutRoutine, onStartNav?: () => void) => {
    if (!uid) return;
    const now = Date.now();
    setActiveRoutineId(routine.id);
    setActiveRoutineStartedAt(now);
    setWorkoutItems(routine.items);
    setLogs({});
    safeStorage.set(`alex_u_${uid}_active_routine_id`, routine.id);
    safeStorage.set(`alex_u_${uid}_active_routine_started_at`, now);
    safeStorage.set(`alex_u_${uid}_workout`, routine.items);
    safeStorage.set(`alex_u_${uid}_current_logs`, {});
    onShowToast(`Treino ${routine.letter} iniciado! Bom treino!`);
    onStartNav?.();
  }, [uid, onShowToast]);

  const handleDiscardActiveWorkout = useCallback((onCancelNav?: () => void) => {
    if (!uid) return;
    setActiveRoutineId(null);
    setActiveRoutineStartedAt(null);
    setLogs({});
    setWorkoutNotes('');
    safeStorage.remove(`alex_u_${uid}_active_routine_id`);
    safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
    safeStorage.remove(`alex_u_${uid}_current_logs`);
    safeStorage.remove(`alex_u_${uid}_workout_notes`);
    onShowToast('Treino em andamento cancelado.');
    onCancelNav?.();
  }, [uid, onShowToast]);

  const finishAndSaveSession = useCallback((onFinishedNav?: () => void) => {
    if (!uid) return;
    const storedLogs = safeStorage.get<WorkoutLogs>(`alex_u_${uid}_current_logs`, {});
    const finalLogs: WorkoutLogs = { ...storedLogs, ...logs };
    Object.keys(storedLogs).forEach((k) => {
      if (storedLogs[k] && logs[k]) {
        finalLogs[k] = {
          ...logs[k],
          ...storedLogs[k],
          done: logs[k].done || storedLogs[k].done,
        };
      }
    });

    workoutItems.forEach((item) => {
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        const log = finalLogs[key];
        if (log && !log.done && parseFloat(log.weight) > 0) {
          const repsVal = parseInt(log.reps, 10) || parseInt(item.reps, 10) || 10;
          finalLogs[key] = { ...log, reps: repsVal.toString(), done: true };
        }
      }
    });

    const completedKeys = Object.keys(finalLogs).filter((k) => finalLogs[k].done);
    if (completedKeys.length === 0) {
      onShowToast('Preencha ao menos uma série com carga e repetições antes de salvar a sessão.');
      return;
    }

    const totalVolumeLoad = calculateVolumeLoad(finalLogs);

    const completedExercisesSummary = workoutItems
      .map((item) => {
        const itemSets: { weight: number; reps: number }[] = [];
        for (let s = 1; s <= item.sets; s++) {
          const key = `${item.exercise.id}_${s}`;
          if (finalLogs[key]?.done) {
            itemSets.push({
              weight: parseFloat(finalLogs[key].weight) || 0,
              reps: parseInt(finalLogs[key].reps, 10) || 0,
            });
          }
        }
        return {
          name: item.exercise.name,
          muscleKey: item.muscleKey,
          muscleGroup: MUSCLE_NAMES[item.muscleKey],
          sets: itemSets,
        };
      })
      .filter((ex) => ex.sets.length > 0);

    const resolvedSplitName = activeRoutine
      ? `${activeRoutine.letter} — ${activeRoutine.name}`
      : split.toUpperCase();

    const newSession = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      splitName: resolvedSplitName,
      totalSets: completedKeys.length,
      totalVolumeLoadKg: totalVolumeLoad,
      notes: workoutNotes.trim() || undefined,
      completedExercises: completedExercisesSummary,
    };

    const updatedHistory = { ...history, ...finalLogs };
    const newWeeklyVolume = { ...completedSetsByMuscle };

    addCompletedSession(newSession, updatedHistory, newWeeklyVolume);

    setActiveRoutineId(null);
    setActiveRoutineStartedAt(null);
    setLogs({});
    setWorkoutNotes('');
    safeStorage.remove(`alex_u_${uid}_active_routine_id`);
    safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
    safeStorage.remove(`alex_u_${uid}_current_logs`);
    safeStorage.remove(`alex_u_${uid}_workout_notes`);

    soundManager.playCelebration();
    soundManager.vibrate([150, 100, 150, 100, 300]);
    onShowToast(`🏆 Parabéns! Sessão Concluída — Volume: ${totalVolumeLoad.toLocaleString()} kg.`);

    onFinishedNav?.();
  }, [uid, logs, workoutItems, activeRoutine, split, workoutNotes, history, completedSetsByMuscle, addCompletedSession, onShowToast]);

  const handleUpdateLog = useCallback((key: string, field: 'weight' | 'reps' | 'setType', val: string) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      const updated = { ...current, [field]: val };
      return {
        ...prev,
        [key]: updated,
      };
    });
  }, []);

  const handleToggleSet = useCallback((key: string, restSec?: number) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      const nextDone = !current.done;

      if (nextDone) {
        soundManager.vibrateSetComplete();
        const exerciseId = key.split('_')[0];
        const matchItem = workoutItems.find((it) => it.exercise.id === exerciseId);
        const restDuration = restSec && restSec > 0 ? restSec : (matchItem?.rest || 60);
        setTimerRestSeconds(restDuration);
        setTimerTriggerKey((prev) => prev + 1);
      }

      const nextEntry = {
        ...current,
        done: nextDone,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        [key]: nextEntry,
      };
    });
  }, [workoutItems]);

  const handleAddSet = useCallback((itemIndex: number) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      copy[itemIndex] = { ...copy[itemIndex], sets: copy[itemIndex].sets + 1 };
      return copy;
    });
    onShowToast('Série adicional adicionada.');
  }, [onShowToast]);

  const handleRemoveSet = useCallback((itemIndex: number) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      if (copy[itemIndex].sets > 1) {
        copy[itemIndex] = { ...copy[itemIndex], sets: copy[itemIndex].sets - 1 };
      }
      return copy;
    });
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setWorkoutItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      syncActiveRoutineItems(copy);
      return copy;
    });
  }, [syncActiveRoutineItems]);

  const handleMoveDown = useCallback((index: number) => {
    setWorkoutItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      syncActiveRoutineItems(copy);
      return copy;
    });
  }, [syncActiveRoutineItems]);

  const handleReorderExercises = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setWorkoutItems((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      syncActiveRoutineItems(copy);
      return copy;
    });
    onShowToast('Ordem dos exercícios atualizada!');
  }, [syncActiveRoutineItems, onShowToast]);

  const handleReorderRoutines = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setRoutines((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
    onShowToast('Ordem dos treinos atualizada!');
  }, [onShowToast]);

  const handleDeleteExercise = useCallback((index: number) => {
    setWorkoutItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncActiveRoutineItems(next);
      return next;
    });
    onShowToast('Exercício removido do treino.');
  }, [syncActiveRoutineItems, onShowToast]);

  const handleSelectSwapExercise = useCallback((index: number, newExercise: Exercise) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], exercise: newExercise };
      syncActiveRoutineItems(copy);
      return copy;
    });
    onShowToast(`Substituído para ${newExercise.name}`);
  }, [syncActiveRoutineItems, onShowToast]);

  const handleAddCustomExercise = useCallback((newItem: WorkoutItem) => {
    setWorkoutItems((prev) => {
      const next = [...prev, newItem];
      syncActiveRoutineItems(next);
      return next;
    });
    onShowToast(`Exercício "${newItem.exercise.name}" adicionado ao treino!`);
  }, [syncActiveRoutineItems, onShowToast]);

  const handleUpdateRest = useCallback((index: number, newRest: number) => {
    setWorkoutItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          rest: Math.max(5, newRest),
        };
      }
      return updated;
    });
  }, []);

  const handleSelectPeriodizationStrategy = useCallback((phase: PeriodizationStrategy) => {
    setPeriodizationStrategy(phase);
    const phaseCfg = PERIODIZATION_PHASES[phase] || PERIODIZATION_PHASES.hypertrophy;
    if (uid) {
      safeStorage.set(`alex_u_${uid}_periodization_strategy`, phase);
    }
    setWorkoutItems((prev) =>
      prev.map((item) => ({
        ...item,
        reps: phaseCfg.repRange,
      }))
    );
    onShowToast(`Meta de repetições ajustada: ${phaseCfg.label} (${phaseCfg.repBadge})`);
  }, [uid, onShowToast]);

  const handleGenerateWeeklyRoutines = useCallback((forcedSplit?: SplitOption) => {
    if (!currentUser) return;
    const splitToUse: SplitOption = forcedSplit || split || currentUser.preferredSplit || 'upper_lower';
    const newRoutines = generateWeeklyRoutines({
      user: currentUser,
      split: splitToUse,
      strategy,
      manualWeeklySets: weeklyBudget,
      level,
      equip,
      restSeconds,
      customMuscleBudgets: currentUser.muscleBudgets,
      periodizationStrategy,
    });

    setRoutines((prev) => {
      const stored = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${currentUser.id}_routines`, []);
      const mergedMap = new Map<string, GeneratedWorkoutRoutine>();
      stored.forEach((r) => mergedMap.set(r.id, r));
      prev.forEach((r) => mergedMap.set(r.id, r));
      const existingRoutines = Array.from(mergedMap.values());

      const nextVersion = existingRoutines.reduce((maxV, r) => Math.max(maxV, r.version || 1), 0) + 1;
      const nowTs = Date.now();
      const hasExisting = existingRoutines.length > 0;

      const stampedNewRoutines: GeneratedWorkoutRoutine[] = newRoutines.map((r, idx) => ({
        ...r,
        id: `routine_${r.letter.toLowerCase()}_v${nextVersion}_${nowTs}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        name: hasExisting ? `${r.name} • v${nextVersion}` : r.name,
        version: nextVersion,
        createdAt: new Date(nowTs + idx).toISOString(),
      }));

      const updated = [...existingRoutines, ...stampedNewRoutines];
      safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      if (!currentUser.isVisitor) {
        syncRoutinesToCloud(currentUser.id, updated).catch(() => {});
      }

      return updated;
    });
    onShowToast(`+${newRoutines.length} novos treinos acumulados na sua lista (${weeklyBudget} séries/sem)!`);
  }, [currentUser, split, strategy, weeklyBudget, level, equip, restSeconds, periodizationStrategy, onShowToast]);

  const handleGenerateQuickWorkout = useCallback(() => {
    if (!currentUser) return;
    const quickRoutine = generateQuickWorkoutRoutine({
      user: currentUser,
      equip,
      restSeconds,
    });
    setRoutines((prev) => {
      const stored = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${currentUser.id}_routines`, []);
      const mergedMap = new Map<string, GeneratedWorkoutRoutine>();
      stored.forEach((r) => mergedMap.set(r.id, r));
      prev.forEach((r) => mergedMap.set(r.id, r));
      const existingRoutines = Array.from(mergedMap.values());

      const nextVersion = existingRoutines.reduce((maxV, r) => Math.max(maxV, r.version || 1), 0) + 1;
      const nowTs = Date.now();
      const stampedQuick: GeneratedWorkoutRoutine = {
        ...quickRoutine,
        id: `quick_routine_v${nextVersion}_${nowTs}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${quickRoutine.name} #${nextVersion}`,
        version: nextVersion,
        createdAt: new Date(nowTs).toISOString(),
      };

      const updated = [...existingRoutines, stampedQuick];
      safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      if (!currentUser.isVisitor) {
        syncRoutinesToCloud(currentUser.id, updated).catch(() => {});
      }

      return updated;
    });
    onShowToast(`⚡ Treino Rápido acumulado na sua lista de treinos!`);
  }, [currentUser, equip, restSeconds, onShowToast]);

  const handleShareRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    const shareText = `🏋️ Treino ${routine.letter} - ${routine.name}\n` +
      routine.items.map(i => `• ${i.exercise.name}: ${i.sets} séries × ${i.reps} reps`).join('\n') +
      `\n\nCriado no MeuTreino Pro`;
    if (navigator.share) {
      navigator.share({ title: routine.name, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        onShowToast('Treino copiado para a área de transferência!');
      });
    }
  }, [onShowToast]);

  const handleSaveManualRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    setRoutines((prev) => {
      const stored = uid
        ? safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${uid}_routines`, [])
        : [];
      const baseList = prev.length >= stored.length ? prev : stored;
      const existingIdx = baseList.findIndex((r) => r.id === routine.id);
      let updated: GeneratedWorkoutRoutine[];
      if (existingIdx >= 0) {
        updated = [...baseList];
        updated[existingIdx] = {
          ...routine,
          version: routine.version || baseList[existingIdx].version || 1,
          createdAt: routine.createdAt || baseList[existingIdx].createdAt || new Date().toISOString(),
        };
      } else {
        const nextVersion = baseList.reduce((maxV, r) => Math.max(maxV, r.version || 1), 0) + 1;
        const nowTs = Date.now();
        const stampedRoutine: GeneratedWorkoutRoutine = {
          ...routine,
          id: routine.id ? `${routine.id}_v${nextVersion}` : `custom_routine_${nowTs}_v${nextVersion}`,
          version: nextVersion,
          createdAt: new Date(nowTs).toISOString(),
        };
        updated = [...baseList, stampedRoutine];
      }
      if (uid) {
        safeStorage.set(`alex_u_${uid}_routines`, updated);
        if (currentUser && !currentUser.isVisitor) {
          syncRoutinesToCloud(uid, updated).catch(() => {});
        }
      }
      return updated;
    });
    onShowToast(`Treino "${routine.name}" salvo e acumulado na sua lista!`);
  }, [uid, currentUser, onShowToast]);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    setRoutines((prev) => {
      const updated = prev.filter((r) => r.id !== routineId);
      if (uid) {
        safeStorage.set(`alex_u_${uid}_routines`, updated);
        if (currentUser && !currentUser.isVisitor) {
          syncRoutinesToCloud(uid, updated).catch(() => {});
        }
      } else {
        safeStorage.set('alex_guest_routines', updated);
      }
      return updated;
    });

    setActiveRoutineId((curr) => {
      if (curr === routineId) {
        if (uid) {
          safeStorage.remove(`alex_u_${uid}_active_routine_id`);
          safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
        }
        return null;
      }
      return curr;
    });

    onShowToast('Treino removido da lista com sucesso.');
  }, [uid, currentUser, onShowToast]);

  const handleOpenCreateManualRoutine = useCallback(() => {
    setEditingRoutine(null);
    setIsManualWorkoutOpen(true);
  }, []);

  const handleEditRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    setEditingRoutine(routine);
    setIsManualWorkoutOpen(true);
  }, []);

  return (
    <WorkoutContext.Provider
      value={{
        split,
        setSplit,
        strategy,
        setStrategy,
        periodizationStrategy,
        setPeriodizationStrategy,
        weeklyBudget,
        setWeeklyBudget,
        level,
        setLevel,
        equip,
        setEquip,
        restSeconds,
        setRestSeconds,
        exercisesPerMuscle,
        routines,
        setRoutines,
        editingRoutine,
        setEditingRoutine,
        isManualWorkoutOpen,
        setIsManualWorkoutOpen,
        activeRoutineId,
        activeRoutineStartedAt,
        activeRoutine,
        workoutItems,
        setWorkoutItems,
        logs,
        workoutNotes,
        setWorkoutNotes,
        isAddExerciseOpen,
        setIsAddExerciseOpen,
        warmupData,
        setWarmupData,
        swapData,
        setSwapData,
        isMuted,
        setIsMuted,
        timerTriggerKey,
        timerRestSeconds,
        activeExerciseName,
        completedSetsByMuscle,
        totalSetsInWorkout,
        totalCompletedSetsInWorkout,
        activeWorkoutMuscles,
        handleStartWorkout,
        handleDiscardActiveWorkout,
        finishAndSaveSession,
        handleUpdateLog,
        handleToggleSet,
        handleAddSet,
        handleRemoveSet,
        handleMoveUp,
        handleMoveDown,
        handleReorderExercises,
        handleReorderRoutines,
        handleDeleteExercise,
        handleSelectSwapExercise,
        handleAddCustomExercise,
        handleUpdateRest,
        handleSelectPeriodizationStrategy,
        handleGenerateWeeklyRoutines,
        handleGenerateQuickWorkout,
        handleShareRoutine,
        handleSaveManualRoutine,
        handleDeleteRoutine,
        handleOpenCreateManualRoutine,
        handleEditRoutine,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout deve ser usado dentro de um WorkoutProvider');
  }
  return context;
};
