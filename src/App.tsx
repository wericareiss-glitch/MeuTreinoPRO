/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Dumbbell, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Upload, 
  RotateCcw, 
  PlusCircle, 
  Sliders
} from 'lucide-react';
import { 
  SplitOption, 
  StrategyOption, 
  LevelOption, 
  EquipmentRequirement, 
  WorkoutItem, 
  WorkoutLogs, 
  WorkoutSessionSummary,
  MuscleGroup,
  Exercise,
  UserProfile,
  GeneratedWorkoutRoutine,
  NutritionPlan,
  BodyMeasurement,
  rpeToRir,
  rirToRpe
} from './types/workout';
import { 
  EXERCISE_DATABASE, 
  SPLIT_MUSCLES, 
  MUSCLE_NAMES 
} from './data/exerciseDatabase';
import { 
  safeStorage, 
  calculateVolumeLoad 
} from './utils/storage';
import { authStorage, ALL_MUSCLE_GROUPS } from './utils/auth';
import { soundManager } from './utils/audio';
import { generateWeeklyRoutines, generateQuickWorkoutRoutine } from './utils/routineGenerator';

import { Header } from './components/Header';
import { VolumeDashboard } from './components/VolumeDashboard';
import { WorkoutConfig } from './components/WorkoutConfig';
import { ExerciseCard } from './components/ExerciseCard';
import { RestTimerDock } from './components/RestTimerDock';
import { CardioDock } from './components/CardioDock';
import { FeedbackView } from './components/FeedbackView';
import { WarmupModal } from './components/WarmupModal';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { NutritionModal } from './components/NutritionModal';
import { DonationModal } from './components/DonationModal';
import { HistoryModal } from './components/HistoryModal';
import { SwapExerciseModal } from './components/SwapExerciseModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { VolumeBudgetModal } from './components/VolumeBudgetModal';
import { AddExerciseModal } from './components/AddExerciseModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { ExerciseAnalyticsModal } from './components/ExerciseAnalyticsModal';
import { BodyMeasurementsModal } from './components/BodyMeasurementsModal';
import { ManualWorkoutModal } from './components/ManualWorkoutModal';
import { CadenceModal } from './components/CadenceModal';
import { NavigationTabs } from './components/NavigationTabs';
import { HomeView } from './components/HomeView';
import { WorkoutListView } from './components/WorkoutListView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { CardioView } from './components/CardioView';
import { ProfileView } from './components/ProfileView';
import { DeloadAssistantModal } from './components/DeloadAssistantModal';
import { getDeloadState, analyzeFatigueAndDeload, DeloadState } from './utils/deloadEngine';
import { TabType } from './types/navigation';
import { useI18n } from './utils/i18n';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useTheme } from './utils/theme';

export default function App() {
  const { t } = useI18n();
  // Inicializa e sincroniza o sistema global de temas (Escuro de alto contraste / Claro de alta legibilidade)
  useTheme();

  // Navigation tab state: 'inicio' | 'treino' | 'cardio' | 'perfil'
  const [activeTab, setActiveTab] = useState<TabType>('inicio');

  // Current active authenticated user
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authStorage.getActiveUser());
  const loadedUserIdRef = useRef<string | null>(currentUser?.id || null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !authStorage.getActiveUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);

  // Helper for per-user storage key isolation
  const userKey = (key: string) => currentUser ? `alex_u_${currentUser.id}_${key}` : `alex_guest_${key}`;

  // Config state
  const [split, setSplit] = useState<SplitOption>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return 'upper_lower';
    return safeStorage.get(`alex_u_${user.id}_split`, user.preferredSplit || (user.frequency === 3 || user.frequency === 6 ? 'ppl' : 'upper_lower'));
  });
  const [strategy, setStrategy] = useState<StrategyOption>('synergy');
  // Padrão sempre 1 exercício por músculo
  const exercisesPerMuscle: 1 = 1;
  const [weeklyBudget, setWeeklyBudget] = useState<number>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return 80;
    return safeStorage.get(`alex_u_${user.id}_weekly_budget`, user.weeklyBudget || 80);
  });
  const [level, setLevel] = useState<LevelOption>(() => currentUser?.level || 'intermediate');
  const [equip, setEquip] = useState<EquipmentRequirement>('full_gym');
  const [restSeconds, setRestSeconds] = useState<number>(30); // Padrão automático 30s por série
  const [isCardioRunning, setIsCardioRunning] = useState<boolean>(false);

  // Geração de Treinos Inteligentes & Treino Ativo
  const [routines, setRoutines] = useState<GeneratedWorkoutRoutine[]>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return [];
    return safeStorage.get(`alex_u_${user.id}_routines`, []);
  });
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return null;
    return safeStorage.get(`alex_u_${user.id}_active_routine_id`, null);
  });
  const [activeRoutineStartedAt, setActiveRoutineStartedAt] = useState<number | null>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return null;
    return safeStorage.get(`alex_u_${user.id}_active_routine_started_at`, null);
  });

  // Workout & Log state (Isolated per User)
  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [logs, setLogs] = useState<WorkoutLogs>({});
  const [history, setHistory] = useState<WorkoutLogs>({});
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [weeklyCompletedSets, setWeeklyCompletedSets] = useState<Record<MuscleGroup, number>>({} as Record<MuscleGroup, number>);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');

  // Audio & Timer state
  const [isMuted, setIsMuted] = useState<boolean>(() => safeStorage.get('alex_muted', false));
  const [timerTriggerKey, setTimerTriggerKey] = useState(0);
  const [timerRestSeconds, setTimerRestSeconds] = useState(30);

  // Modals state
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isCadenceOpen, setIsCadenceOpen] = useState(false);
  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsExerciseName, setAnalyticsExerciseName] = useState<string | undefined>(undefined);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(() => {
    const user = authStorage.getActiveUser();
    if (!user) return [];
    return safeStorage.get(`alex_u_${user.id}_measurements`, []);
  });
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
  const [summaryModalSession, setSummaryModalSession] = useState<WorkoutSessionSummary | null>(null);
  const [isManualWorkoutOpen, setIsManualWorkoutOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<GeneratedWorkoutRoutine | null>(null);
  const [isDeloadOpen, setIsDeloadOpen] = useState(false);
  const [deloadState, setDeloadState] = useState<DeloadState | null>(() => {
    const user = authStorage.getActiveUser();
    return user ? getDeloadState(user.id) : null;
  });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  // Análise científica de fadiga acumulada e recomendação de Deload
  const fatigueAnalysis = useMemo(() => {
    if (!currentUser) {
      return {
        recommendDeload: false,
        fatigueScore: 15,
        consecutiveHeavyWeeks: 0,
        highRpeSetsCount: 0,
        mrvExceededMuscles: [],
        reasons: [],
      };
    }
    return analyzeFatigueAndDeload(currentUser, sessions, weeklyCompletedSets);
  }, [currentUser, sessions, weeklyCompletedSets]);

  // Sync isolated user state whenever currentUser changes
  useEffect(() => {
    if (!currentUser) {
      loadedUserIdRef.current = null;
      setRoutines([]);
      setActiveRoutineId(null);
      setActiveRoutineStartedAt(null);
      setWorkoutItems([]);
      setLogs({});
      setHistory({});
      setSessions([]);
      setWorkoutNotes('');
      setMeasurements([]);
      return;
    }
    const uid = currentUser.id;

    const defaultSplit: SplitOption = currentUser.preferredSplit || (
      currentUser.focus === 'glutes' 
        ? 'lower' 
        : currentUser.frequency === 3 || currentUser.frequency === 6
        ? 'ppl' 
        : currentUser.frequency === 5
        ? 'abcde'
        : 'upper_lower'
    );
    setSplit(safeStorage.get(`alex_u_${uid}_split`, defaultSplit));
    setStrategy(safeStorage.get(`alex_u_${uid}_strategy`, 'synergy'));
    setWeeklyBudget(safeStorage.get(`alex_u_${uid}_weekly_budget`, currentUser.weeklyBudget || 80));
    setLevel(safeStorage.get(`alex_u_${uid}_level`, currentUser.level || 'beginner'));
    setEquip(safeStorage.get(`alex_u_${uid}_equip`, 'full_gym'));

    const storedRoutines = safeStorage.get(`alex_u_${uid}_routines`, []);
    setRoutines(storedRoutines);
    setActiveRoutineId(safeStorage.get(`alex_u_${uid}_active_routine_id`, null));
    setActiveRoutineStartedAt(safeStorage.get(`alex_u_${uid}_active_routine_started_at`, null));

    setWorkoutItems(safeStorage.get(`alex_u_${uid}_workout`, []));
    setLogs(safeStorage.get(`alex_u_${uid}_current_logs`, {}));
    setHistory(safeStorage.get(`alex_u_${uid}_history_logs`, {}));
    setSessions(safeStorage.get(`alex_u_${uid}_sessions`, []));
    setWeeklyCompletedSets(safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>));
    setWorkoutNotes(safeStorage.get(`alex_u_${uid}_workout_notes`, ''));
    setMeasurements(safeStorage.get(`alex_u_${uid}_measurements`, []));

    // Marca o ID do usuário cujos dados foram carregados na memória
    loadedUserIdRef.current = uid;
  }, [currentUser?.id]);

  // Update sound manager mute state
  useEffect(() => {
    soundManager.setMuted(isMuted);
    safeStorage.set('alex_muted', isMuted);
  }, [isMuted]);

  // Synchronize cardio running state continuously
  useEffect(() => {
    if (!currentUser) {
      setIsCardioRunning(false);
      return;
    }
    const checkCardio = () => {
      const active = safeStorage.get<{ isRunning?: boolean } | null>(`mtp_cardio_active_${currentUser.id}`, null);
      setIsCardioRunning(!!active?.isRunning);
    };
    checkCardio();
    const interval = setInterval(checkCardio, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Persist user-isolated settings (somente após os dados do usuário estarem carregados)
  useEffect(() => {
    if (!currentUser || loadedUserIdRef.current !== currentUser.id) return;
    const uid = currentUser.id;
    safeStorage.set(`alex_u_${uid}_split`, split);
    safeStorage.set(`alex_u_${uid}_strategy`, strategy);
    safeStorage.set(`alex_u_${uid}_ex_per_muscle`, exercisesPerMuscle);
    safeStorage.set(`alex_u_${uid}_weekly_budget`, weeklyBudget);
    safeStorage.set(`alex_u_${uid}_level`, level);
    safeStorage.set(`alex_u_${uid}_equip`, equip);
  }, [split, strategy, exercisesPerMuscle, weeklyBudget, level, equip, currentUser]);

  // Persist routines
  useEffect(() => {
    if (!currentUser || loadedUserIdRef.current !== currentUser.id) return;
    safeStorage.set(`alex_u_${currentUser.id}_routines`, routines);
  }, [routines, currentUser]);

  // Persist workout items
  useEffect(() => {
    if (!currentUser || loadedUserIdRef.current !== currentUser.id) return;
    safeStorage.set(`alex_u_${currentUser.id}_workout`, workoutItems);
  }, [workoutItems, currentUser]);

  // Persist logs
  useEffect(() => {
    if (!currentUser || loadedUserIdRef.current !== currentUser.id) return;
    safeStorage.set(`alex_u_${currentUser.id}_current_logs`, logs);
  }, [logs, currentUser]);

  // Persist workout notes
  useEffect(() => {
    if (!currentUser) {
      safeStorage.set('alex_guest_workout_notes', workoutNotes);
      return;
    }
    if (loadedUserIdRef.current !== currentUser.id) return;
    safeStorage.set(`alex_u_${currentUser.id}_workout_notes`, workoutNotes);
  }, [workoutNotes, currentUser]);

  // Persist measurements
  useEffect(() => {
    if (!currentUser || loadedUserIdRef.current !== currentUser.id) return;
    safeStorage.set(`alex_u_${currentUser.id}_measurements`, measurements);
  }, [measurements, currentUser]);

  // Measurement handlers
  const handleSaveMeasurement = useCallback((item: BodyMeasurement) => {
    if (!currentUser) return;
    setMeasurements((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === item.id);
      let updated: BodyMeasurement[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = item;
      } else {
        updated = [item, ...prev];
      }
      safeStorage.set(`alex_u_${currentUser.id}_measurements`, updated);
      return updated;
    });
    showToast('Check-in corporal salvo com sucesso!');
  }, [currentUser, showToast]);

  const handleDeleteMeasurement = useCallback((id: string) => {
    if (!currentUser) return;
    setMeasurements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      safeStorage.set(`alex_u_${currentUser.id}_measurements`, updated);
      return updated;
    });
    showToast('Registo de medição removido.');
  }, [currentUser, showToast]);

  const handleOpenAnalytics = useCallback((exerciseName?: string) => {
    setAnalyticsExerciseName(exerciseName);
    setIsAnalyticsOpen(true);
  }, []);

  // Handlers para criação e gerenciamento manual de treinos
  const handleOpenCreateManualRoutine = useCallback(() => {
    setEditingRoutine(null);
    setIsManualWorkoutOpen(true);
  }, []);

  const handleEditRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    setEditingRoutine(routine);
    setIsManualWorkoutOpen(true);
  }, []);

  const handleSaveManualRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    setRoutines((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === routine.id);
      let updated: GeneratedWorkoutRoutine[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = routine;
      } else {
        updated = [...prev, routine];
      }
      if (currentUser) {
        safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      }
      return updated;
    });
    showToast(`Treino "${routine.name}" salvo com sucesso!`);
  }, [currentUser, showToast]);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    setRoutines((prev) => {
      const updated = prev.filter((r) => r.id !== routineId);
      if (currentUser) {
        safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      } else {
        safeStorage.set('alex_guest_routines', updated);
      }
      return updated;
    });

    // Se o treino deletado era o treino ativo, limpa o estado ativo
    setActiveRoutineId((curr) => {
      if (curr === routineId) {
        if (currentUser) {
          safeStorage.remove(`alex_u_${currentUser.id}_active_routine_id`);
          safeStorage.remove(`alex_u_${currentUser.id}_active_routine_started_at`);
        }
        return null;
      }
      return curr;
    });

    showToast('Treino removido da lista com sucesso.');
  }, [currentUser, showToast]);

  // Geração de rotinas da semana (ACUMULA para o atleta poder escolher entre as opções)
  const handleGenerateWeeklyRoutines = useCallback((forcedSplit?: SplitOption) => {
    if (!currentUser) return;
    const splitToUse: SplitOption = forcedSplit || split || currentUser.preferredSplit || (
      currentUser.focus === 'glutes'
        ? 'lower'
        : currentUser.frequency === 3 || currentUser.frequency === 6
        ? 'ppl'
        : currentUser.frequency === 5
        ? 'abcde'
        : 'upper_lower'
    );
    const newRoutines = generateWeeklyRoutines({
      user: currentUser,
      split: splitToUse,
      strategy,
      manualWeeklySets: weeklyBudget,
      level,
      equip,
      restSeconds,
    });
    setRoutines((prev) => {
      // Preserve custom/manual routines, replace weekly split routines
      const customRoutines = prev.filter((r) => r.isCustom);
      const updated = [...newRoutines, ...customRoutines];
      safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      return updated;
    });
    showToast(`Rotinas geradas: ${newRoutines.length} treinos para ${weeklyBudget} séries semanais!`);
  }, [currentUser, split, strategy, weeklyBudget, level, equip, restSeconds, showToast]);

  // Geração de Treino Rápido (Aleatório balanceado Full Body / Dobradiça)
  const handleGenerateQuickWorkout = useCallback(() => {
    if (!currentUser) return;
    const quickRoutine = generateQuickWorkoutRoutine({
      user: currentUser,
      equip,
      restSeconds,
    });
    setRoutines((prev) => {
      const updated = [...prev, quickRoutine];
      safeStorage.set(`alex_u_${currentUser.id}_routines`, updated);
      return updated;
    });
    showToast(`⚡ Treino Rápido "${quickRoutine.name}" adicionado à sua lista!`);
  }, [currentUser, equip, restSeconds, showToast]);

  // Compartilhar treino formatado
  const handleShareRoutine = useCallback((routine: GeneratedWorkoutRoutine) => {
    const shareText = `🏋️ Treino ${routine.letter} - ${routine.name}\n` +
      routine.items.map(i => `• ${i.exercise.name}: ${i.sets} séries × ${i.reps} reps (RIR: ${i.rir})`).join('\n') +
      `\n\nCriado no MeuTreino Pro`;
    if (navigator.share) {
      navigator.share({ title: routine.name, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Treino copiado para a área de transferência!');
      });
    }
  }, [showToast]);

  // Excluir Perfil com limpeza de storage
  const handleDeleteProfile = useCallback((userId: string) => {
    authStorage.deleteUser(userId);
    const users = authStorage.getUsers();
    if (users.length > 0) {
      authStorage.setActiveUserId(users[0].id);
      setCurrentUser(users[0]);
    } else {
      authStorage.setActiveUserId(null);
      setCurrentUser(null);
      setIsAuthOpen(true);
    }
    showToast('Perfil excluído com sucesso.');
  }, [showToast]);

  // Trocar Perfil
  const handleSwitchProfile = useCallback(() => {
    setIsAuthOpen(true);
  }, []);

  // Geração inicial automática apenas no primeiro acesso se o usuário não possuir rotinas
  useEffect(() => {
    if (currentUser) {
      const hasInit = safeStorage.get(`alex_u_${currentUser.id}_has_init_routines`, false);
      if (!hasInit && routines.length === 0) {
        safeStorage.set(`alex_u_${currentUser.id}_has_init_routines`, true);
        const targetSplit: SplitOption = currentUser.preferredSplit || (
          currentUser.focus === 'glutes'
            ? 'lower'
            : currentUser.frequency === 3 || currentUser.frequency === 6
            ? 'ppl'
            : currentUser.frequency === 5
            ? 'abcde'
            : 'upper_lower'
        );
        handleGenerateWeeklyRoutines(targetSplit);
      }
    }
  }, [currentUser?.id, handleGenerateWeeklyRoutines, routines.length]);

  // Iniciar treino selecionado
  const handleStartWorkout = useCallback((routine: GeneratedWorkoutRoutine) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const now = Date.now();
    setActiveRoutineId(routine.id);
    setActiveRoutineStartedAt(now);
    setWorkoutItems(routine.items);
    setLogs({});
    safeStorage.set(`alex_u_${uid}_active_routine_id`, routine.id);
    safeStorage.set(`alex_u_${uid}_active_routine_started_at`, now);
    safeStorage.set(`alex_u_${uid}_workout`, routine.items);
    safeStorage.set(`alex_u_${uid}_current_logs`, {});
    setActiveTab('treino_ativo');
    showToast(`Treino ${routine.letter} iniciado! Bom treino!`);
  }, [currentUser, showToast]);

  // Descartar/Cancelar treino em andamento (confirmação já feita no componente de visualização)
  const handleDiscardActiveWorkout = useCallback(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setActiveRoutineId(null);
    setActiveRoutineStartedAt(null);
    setLogs({});
    setWorkoutNotes('');
    safeStorage.remove(`alex_u_${uid}_active_routine_id`);
    safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
    safeStorage.remove(`alex_u_${uid}_current_logs`);
    safeStorage.remove(`alex_u_${uid}_workout_notes`);
    setActiveTab('treino');
    showToast('Treino em andamento cancelado.');
  }, [currentUser, showToast]);

  // Identificação do treino ativo
  const activeRoutine = useMemo(() => {
    if (!activeRoutineId) return null;
    return routines.find((r) => r.id === activeRoutineId) || (routines.length > 0 ? routines[0] : null);
  }, [routines, activeRoutineId]);

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

  // Log handlers (Sincronização bidirecional automática de RPE 6-10 e RIR 0-4)
  const handleUpdateLog = useCallback((key: string, field: 'weight' | 'reps' | 'rpe' | 'rir', val: string) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      const updated = { ...current, [field]: val };

      if (field === 'rpe') {
        updated.rir = rpeToRir(val);
      } else if (field === 'rir') {
        updated.rpe = rirToRpe(val);
      }

      return {
        ...prev,
        [key]: updated,
      };
    });
  }, []);

  const handleOpenPlateCalc = useCallback((weight?: number) => {
    setPlateCalcWeight(weight);
    setIsPlateCalcOpen(true);
  }, []);

  const handleToggleSet = useCallback((key: string, restSec: number) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      const nextDone = !current.done;

      if (nextDone) {
        soundManager.vibrateSetComplete();
        setTimerRestSeconds(restSec);
        setTimerTriggerKey((k) => k + 1);
        showToast(`Série concluída! Descanso de ${restSec}s iniciado.`);
      }

      return {
        ...prev,
        [key]: {
          ...current,
          done: nextDone,
          timestamp: Date.now(),
        },
      };
    });
  }, [showToast]);

  const handleAddSet = useCallback((itemIndex: number) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      copy[itemIndex] = { ...copy[itemIndex], sets: copy[itemIndex].sets + 1 };
      return copy;
    });
    showToast('Série adicional adicionada.');
  }, [showToast]);

  const handleRemoveSet = useCallback((itemIndex: number) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      if (copy[itemIndex].sets > 1) {
        copy[itemIndex] = { ...copy[itemIndex], sets: copy[itemIndex].sets - 1 };
      }
      return copy;
    });
  }, []);

  // Exercise reordering (Master Controls)
  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setWorkoutItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setWorkoutItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  }, []);

  const handleDeleteExercise = useCallback((index: number) => {
    setWorkoutItems((prev) => prev.filter((_, i) => i !== index));
    showToast('Exercício removido do treino.');
  }, [showToast]);

  const handleSelectSwapExercise = useCallback((index: number, newExercise: Exercise) => {
    setWorkoutItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], exercise: newExercise };
      return copy;
    });
    showToast(`Substituído para ${newExercise.name}`);
  }, [showToast]);

  const handleAddCustomExercise = useCallback((newItem: WorkoutItem) => {
    setWorkoutItems((prev) => [...prev, newItem]);
    showToast(`Exercício "${newItem.exercise.name}" adicionado ao treino!`);
  }, [showToast]);

  // Volume Dashboard Calculations
  const activeWorkoutMuscles = useMemo(() => {
    return Array.from(new Set(workoutItems.map((item) => item.muscleKey)));
  }, [workoutItems]);

  const completedSetsByMuscle = useMemo(() => {
    const counts: Record<MuscleGroup, number> = { ...(weeklyCompletedSets || {}) };

    workoutItems.forEach((item) => {
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        if (logs[key]?.done) {
          counts[item.muscleKey] = (counts[item.muscleKey] || 0) + 1;
        }
      }
    });

    return counts;
  }, [workoutItems, logs, weeklyCompletedSets]);

  // Overall progress
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

  // Finish and save session
  const finishAndSaveSession = () => {
    if (!currentUser) return;
    // Auto-mark any set that has both weight and reps filled as completed
    const finalLogs = { ...logs };
    workoutItems.forEach((item) => {
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        const log = finalLogs[key];
        if (log && !log.done && parseFloat(log.weight) > 0 && parseInt(log.reps, 10) > 0) {
          finalLogs[key] = { ...log, done: true };
        }
      }
    });

    const completedKeys = Object.keys(finalLogs).filter((k) => finalLogs[k].done);
    if (completedKeys.length === 0) {
      showToast('Preencha ao menos uma série com carga e repetições antes de salvar a sessão.');
      return;
    }

    const totalVolumeLoad = calculateVolumeLoad(finalLogs);

    // Build completed exercise summary
    const completedExercisesSummary = workoutItems
      .map((item) => {
        const itemSets: { weight: number; reps: number; rpe?: string; rir?: string }[] = [];
        for (let s = 1; s <= item.sets; s++) {
          const key = `${item.exercise.id}_${s}`;
          if (finalLogs[key]?.done) {
            itemSets.push({
              weight: parseFloat(finalLogs[key].weight) || 0,
              reps: parseInt(finalLogs[key].reps, 10) || 0,
              rpe: finalLogs[key].rpe,
              rir: finalLogs[key].rir,
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

    const newSession: WorkoutSessionSummary = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString(),
      splitName: split.toUpperCase(),
      totalSets: completedKeys.length,
      totalVolumeLoadKg: totalVolumeLoad,
      notes: workoutNotes.trim() || undefined,
      completedExercises: completedExercisesSummary,
    };

    const uid = currentUser.id;
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    safeStorage.set(`alex_u_${uid}_sessions`, updatedSessions);

    // Save logs as history for next time
    const updatedHistory = { ...history, ...finalLogs };
    setHistory(updatedHistory);
    safeStorage.set(`alex_u_${uid}_history_logs`, updatedHistory);

    // Accumulate weekly volume
    const newWeeklyVolume = { ...completedSetsByMuscle };
    setWeeklyCompletedSets(newWeeklyVolume);
    safeStorage.set(`alex_u_${uid}_weekly_volume`, newWeeklyVolume);

    // Finaliza a sessão ativa e remove o treino em andamento (a aba Treino Ativo sumirá)
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
    setSummaryModalSession(newSession);
    showToast(`🏆 Parabéns! Sessão Concluída — Volume: ${totalVolumeLoad.toLocaleString()} kg.`);
    setActiveTab('inicio');
  };

  // Export & Share
  const buildExportText = () => {
    if (!workoutItems.length) return 'Nenhum treino gerado.';
    const lines = [
      `⚡ *MeuTreino Pro — Hipertrofia Individualizada*`,
      `Atleta: ${currentUser?.name || 'Atleta'} | Divisão: ${split.toUpperCase()}`,
      '',
    ];

    if (workoutNotes.trim()) {
      lines.push(`📝 Observações: ${workoutNotes.trim()}`);
      lines.push('');
    }

    workoutItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. *${item.exercise.name}* (${MUSCLE_NAMES[item.muscleKey]})`);
      lines.push(`• Séries: ${item.sets} x ${item.reps} | ${item.rir} | Descanso: ${item.rest}s`);
      
      const loggedSets: string[] = [];
      for (let s = 1; s <= item.sets; s++) {
        const k = `${item.exercise.id}_${s}`;
        if (logs[k]?.done) {
          const rpeBadge = logs[k].rpe ? ` @RPE ${logs[k].rpe}` : '';
          loggedSets.push(`S${s}: ${logs[k].weight || 0}kg x ${logs[k].reps || 0}${rpeBadge}`);
        }
      }
      if (loggedSets.length > 0) {
        lines.push(`• Registrado: ${loggedSets.join(' | ')}`);
      }

      lines.push(`• Perfil: ${item.exercise.profile} | Alvo: ${item.exercise.target}`);
      lines.push('');
    });

    return lines.join('\n');
  };

  const handleShare = () => {
    const text = buildExportText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'MeuTreino Pro — Treino Concluído',
        text: text,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Texto do treino copiado para a área de transferência!');
      });
    }
  };

  const handleExportBackup = () => {
    if (!currentUser) return;
    const backup = {
      app: 'MeuTreinoPro',
      version: '4.0',
      exportedAt: new Date().toISOString(),
      user: currentUser,
      settings: { split, strategy, level, equip },
      workoutItems,
      currentLogs: logs,
      historyLogs: history,
      sessions,
      weeklyVolume: weeklyCompletedSets,
      workoutNotes,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `alex_team_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Backup do perfil exportado com sucesso!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.currentLogs) setLogs(parsed.currentLogs);
        if (parsed.historyLogs) setHistory(parsed.historyLogs);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.weeklyVolume) setWeeklyCompletedSets(parsed.weeklyVolume);
        if (parsed.workoutItems) setWorkoutItems(parsed.workoutItems);
        if (parsed.workoutNotes !== undefined) setWorkoutNotes(parsed.workoutNotes);
        showToast('Dados restaurados com sucesso para este perfil!');
      } catch {
        alert('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToday = () => {
    if (!currentUser) return;
    if (confirm('Deseja realmente zerar todos os registros de séries e notas de hoje?')) {
      const uid = currentUser.id;
      setLogs({});
      setWorkoutNotes('');
      safeStorage.remove(`alex_u_${uid}_current_logs`);
      safeStorage.remove(`alex_u_${uid}_workout_notes`);
      showToast('Anotações de hoje foram zeradas.');
    }
  };

  // Nutrition Plan Save Handler
  const handleSaveNutritionPlan = (plan: NutritionPlan) => {
    if (!currentUser) return;
    const updated = authStorage.updateProfile(currentUser.id, { nutritionPlan: plan });
    if (updated) {
      setCurrentUser(updated);
      showToast('Plano nutricional salvo no perfil! 🍎');
    }
  };

  // Profile and Auth Actions
  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    showToast(`Bem-vindo, ${user.name}!`);
    const targetSplit: SplitOption = user.preferredSplit || (
      user.focus === 'glutes'
        ? 'lower'
        : user.frequency === 3 || user.frequency === 6
        ? 'ppl'
        : user.frequency === 5
        ? 'abcde'
        : 'upper_lower'
    );
    setSplit(targetSplit);
    safeStorage.set(`alex_u_${user.id}_split`, targetSplit);

    const existingRoutines = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${user.id}_routines`, []);
    if (existingRoutines.length === 0) {
      const generated = generateWeeklyRoutines({
        user,
        split: targetSplit,
        manualWeeklySets: user.weeklyBudget,
        level: user.level || 'intermediate',
        equip: 'full_gym',
        restSeconds: 30,
      });
      setRoutines(generated);
      safeStorage.set(`alex_u_${user.id}_routines`, generated);
      safeStorage.set(`alex_u_${user.id}_has_init_routines`, true);
    }
  };

  const handleLogout = () => {
    authStorage.logout();
    setCurrentUser(null);
    setIsProfileOpen(false);
    setIsAuthOpen(true);
    showToast('Você foi desconectado.');
  };

  const handleSaveBudgets = (totalBudget: number, newBudgets: Record<MuscleGroup, number>) => {
    if (!currentUser) return;
    const updated = authStorage.updateProfile(currentUser.id, {
      weeklyBudget: totalBudget,
      muscleBudgets: newBudgets,
    });
    if (updated) {
      setCurrentUser(updated);
      showToast('Séries atualizadas com sucesso!');
    }
  };

  return (
    <div className="min-h-screen bg-theme-app text-theme-body pb-32 transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl shadow-emerald-500/40 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Offline Connectivity Notification */}
      <OfflineIndicator />

      {/* Header with Navigation and Fast Tools */}
      <Header
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={() => setActiveTab('perfil')}
        onOpenVolumeBudget={() => setIsBudgetOpen(true)}
        onOpenPlateCalc={() => setIsPlateCalcOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAnalytics={() => handleOpenAnalytics()}
        onOpenMeasurements={() => setIsMeasurementsOpen(true)}
        onOpenCadence={() => setIsCadenceOpen(true)}
        onOpenDeloadAssistant={() => setIsDeloadOpen(true)}
        isDeloadActive={!!deloadState?.active}
        onOpenNutrition={() => setIsNutritionOpen(true)}
        onOpenDonation={() => setIsDonationOpen(true)}
        onShare={handleShare}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        activeSetsCount={totalSetsInWorkout}
        completedSetsCount={totalCompletedSetsInWorkout}
        hasActiveWorkout={!!activeRoutineId}
      />

      {/* Responsive Navigation Tabs (Subheader on Desktop, Dock on Mobile) */}
      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeSetsCount={totalSetsInWorkout}
        completedSetsCount={totalCompletedSetsInWorkout}
        sessionsCount={sessions.length}
        isCardioRunning={isCardioRunning}
        hasActiveWorkout={!!activeRoutineId}
      />

      {/* Main Container - Renders the selected Tab View */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* ABA 1: INÍCIO (Resumo do atleta, KPIs, acompanhamento de volume e histórico detalhado) */}
        {activeTab === 'inicio' && (
          <HomeView
            user={currentUser}
            sessions={sessions}
            completedSetsByMuscle={completedSetsByMuscle}
            activeWorkoutMuscles={activeWorkoutMuscles}
            totalSetsInWorkout={totalSetsInWorkout}
            totalCompletedSetsInWorkout={totalCompletedSetsInWorkout}
            workoutNotes={workoutNotes}
            onUpdateWorkoutNotes={setWorkoutNotes}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
            onOpenDeloadAssistant={() => setIsDeloadOpen(true)}
            isDeloadActive={!!deloadState?.active}
            onGoToWorkout={() => {
              if (activeRoutineId) {
                setActiveTab('treino_ativo');
              } else {
                setActiveTab('treino');
              }
            }}
            onViewSummary={(sess) => setSummaryModalSession(sess)}
            onOpenAnalytics={() => handleOpenAnalytics()}
            onOpenMeasurements={() => setIsMeasurementsOpen(true)}
          />
        )}

        {/* ABA 2: TREINO (Exibe os treinos acumulados da rotina semanal para o usuário escolher e iniciar) */}
        {activeTab === 'treino' && currentUser && (
          <WorkoutListView
            user={currentUser}
            routines={routines}
            activeRoutineId={activeRoutineId}
            onStartWorkout={handleStartWorkout}
            onGoToProfileGenerator={() => setActiveTab('perfil')}
            onCreateManualWorkout={handleOpenCreateManualRoutine}
            onGenerateQuickWorkout={handleGenerateQuickWorkout}
            onEditRoutine={handleEditRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            onShareRoutine={handleShareRoutine}
          />
        )}

        {/* ABA 2.5: TREINO ATIVO (Aba dinâmica: SÓ EXISTE quando um treino foi iniciado e some ao concluir ou descartar) */}
        {activeTab === 'treino_ativo' && activeRoutine && (
          <ActiveWorkoutView
            routine={activeRoutine}
            workoutItems={workoutItems}
            logs={logs}
            history={history}
            sessions={sessions}
            onOpenAnalytics={handleOpenAnalytics}
            startedAt={activeRoutineStartedAt || Date.now()}
            workoutNotes={workoutNotes}
            onUpdateWorkoutNotes={setWorkoutNotes}
            onOpenAddExercise={() => setIsAddExerciseOpen(true)}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDeleteExercise={handleDeleteExercise}
            onUpdateLog={handleUpdateLog}
            onToggleSet={handleToggleSet}
            onUpdateRest={handleUpdateRest}
            onOpenWarmup={(name, weight) => setWarmupData({ isOpen: true, name, weight })}
            onOpenSwap={(idx) =>
              setSwapData({
                isOpen: true,
                index: idx,
                currentExerciseId: workoutItems[idx].exercise.id,
                muscleKey: workoutItems[idx].muscleKey,
              })
            }
            onAddSet={handleAddSet}
            onRemoveSet={handleRemoveSet}
            onOpenCadence={() => setIsCadenceOpen(true)}
            onOpenPlateCalc={handleOpenPlateCalc}
            muscleTargetRir={currentUser?.muscleTargetRir}
            onFinishSession={finishAndSaveSession}
            onDiscardSession={handleDiscardActiveWorkout}
            onBackToList={() => setActiveTab('treino')}
          />
        )}

        {/* ABA 3: CARDIO (Cronômetro resiliente que nunca reseta ao alternar de aba, métricas e histórico) */}
        {activeTab === 'cardio' && currentUser && (
          <CardioView
            user={currentUser}
            onCardioStateChange={setIsCardioRunning}
          />
        )}

        {/* ABA 4: PERFIL (Metas corporais, GERAÇÃO & PERSONALIZAÇÃO DE TREINOS e histórico) */}
        {activeTab === 'perfil' && currentUser && (
          <ProfileView
            user={currentUser}
            sessions={sessions}
            onUpdateUser={setCurrentUser}
            onLogout={handleLogout}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
            onOpenPlateCalc={() => setIsPlateCalcOpen(true)}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onViewSummary={(sess) => setSummaryModalSession(sess)}
            onClearHistory={() => {
              if (!currentUser) return;
              if (confirm('Tem certeza que deseja apagar todo o histórico de treinos deste perfil?')) {
                setSessions([]);
                safeStorage.remove(`alex_u_${currentUser.id}_sessions`);
                showToast('Histórico do perfil foi apagado.');
              }
            }}
            onDeleteProfile={handleDeleteProfile}
            onSwitchProfile={handleSwitchProfile}
            split={split}
            setSplit={setSplit}
            strategy={strategy}
            setStrategy={setStrategy}
            weeklyBudget={weeklyBudget}
            setWeeklyBudget={setWeeklyBudget}
            equip={equip}
            setEquip={setEquip}
            restSeconds={restSeconds}
            setRestSeconds={setRestSeconds}
            onGenerateRoutines={handleGenerateWeeklyRoutines}
            onGoToWorkoutTab={() => setActiveTab('treino')}
            onGoToFeedback={() => setActiveTab('feedback')}
            onOpenNutrition={() => setIsNutritionOpen(true)}
            onOpenDonation={() => setIsDonationOpen(true)}
          />
        )}

        {/* ABA 5: SUGESTÕES & BUGS (Envio de ideias e relatos) */}
        {activeTab === 'feedback' && currentUser && (
          <FeedbackView
            user={currentUser}
            routines={routines}
          />
        )}
      </main>

      {/* Floating HUD Rest Timer */}
      <RestTimerDock
        initialSeconds={timerRestSeconds}
        triggerKey={timerTriggerKey}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
      />

      {/* Floating Cardio HUD Dock when cardio is active/running and outside the cardio tab */}
      {currentUser && activeTab !== 'cardio' && (
        <CardioDock
          userId={currentUser.id}
          onOpenCardio={() => setActiveTab('cardio')}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
      />

      {currentUser && (
        <>
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={currentUser}
            onUpdateUser={setCurrentUser}
            onLogout={handleLogout}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
          />

          <VolumeBudgetModal
            isOpen={isBudgetOpen}
            onClose={() => setIsBudgetOpen(false)}
            weeklyBudget={currentUser.weeklyBudget}
            muscleBudgets={currentUser.muscleBudgets}
            onSaveBudgets={handleSaveBudgets}
          />
        </>
      )}

      <AddExerciseModal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        onAddExercise={handleAddCustomExercise}
      />

      <PlateCalculatorModal
        isOpen={isPlateCalcOpen}
        onClose={() => setIsPlateCalcOpen(false)}
        initialWeight={plateCalcWeight}
      />

      <CadenceModal
        isOpen={isCadenceOpen}
        onClose={() => setIsCadenceOpen(false)}
      />

      <WarmupModal
        isOpen={warmupData.isOpen}
        onClose={() => setWarmupData((d) => ({ ...d, isOpen: false }))}
        exerciseName={warmupData.name}
        initialWeight={warmupData.weight}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        onViewSummary={(sess) => {
          setIsHistoryOpen(false);
          setSummaryModalSession(sess);
        }}
        onClearHistory={() => {
          if (!currentUser) return;
          setSessions([]);
          safeStorage.remove(`alex_u_${currentUser.id}_sessions`);
          showToast('Histórico deste perfil foi apagado.');
        }}
      />

      <SwapExerciseModal
        isOpen={swapData.isOpen}
        onClose={() => setSwapData((d) => ({ ...d, isOpen: false }))}
        targetItemIndex={swapData.index}
        currentExerciseId={swapData.currentExerciseId}
        muscleKey={swapData.muscleKey}
        equipmentFilter={equip}
        onSelectExercise={handleSelectSwapExercise}
      />

      <WorkoutSummaryModal
        isOpen={summaryModalSession !== null}
        onClose={() => setSummaryModalSession(null)}
        session={summaryModalSession}
        athleteName={currentUser?.name || 'Atleta'}
        previousSessions={sessions}
      />

      {currentUser && (
        <DeloadAssistantModal
          isOpen={isDeloadOpen}
          onClose={() => setIsDeloadOpen(false)}
          user={currentUser}
          analysis={fatigueAnalysis}
          currentDeload={deloadState}
          currentBudget={weeklyBudget}
          onDeloadStateChange={() => {
            const next = getDeloadState(currentUser.id);
            setDeloadState(next);
            showToast(next?.active ? 'Semana de Deload Ativada (-40% séries) 🧘‍♂️' : 'Deload desativado. Volume restaurado!');
          }}
        />
      )}

      <ExerciseAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        sessions={sessions}
        initialExerciseName={analyticsExerciseName}
      />

      <BodyMeasurementsModal
        isOpen={isMeasurementsOpen}
        onClose={() => setIsMeasurementsOpen(false)}
        measurements={measurements}
        onSaveMeasurement={handleSaveMeasurement}
        onDeleteMeasurement={handleDeleteMeasurement}
      />

      <ManualWorkoutModal
        isOpen={isManualWorkoutOpen}
        onClose={() => setIsManualWorkoutOpen(false)}
        onSaveRoutine={handleSaveManualRoutine}
        editingRoutine={editingRoutine}
        existingRoutinesCount={routines.length}
      />

      {currentUser && (
        <NutritionModal
          isOpen={isNutritionOpen}
          onClose={() => setIsNutritionOpen(false)}
          user={currentUser}
          onSavePlan={handleSaveNutritionPlan}
        />
      )}

      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />
    </div>
  );
}
