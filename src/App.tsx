import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, WorkoutItem, WorkoutLogs, WorkoutSessionSummary, MuscleGroup, Exercise, GeneratedWorkoutRoutine, BodyMeasurement } from './types/workout';
import { authStorage } from './utils/auth';
import { safeStorage, calculateVolumeLoad } from './utils/storage';
import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { HomeView } from './components/HomeView';
import { WorkoutListView } from './components/WorkoutListView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { CardioView } from './components/CardioView';
import { ProfileView } from './components/ProfileView';
import { TabType } from './types/navigation';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { VolumeBudgetModal } from './components/VolumeBudgetModal';
import { AddExerciseModal } from './components/AddExerciseModal';
import { PlateCalculatorModal } from './components/PlateCalculatorModal';
import { HistoryModal } from './components/HistoryModal';
import { WarmupModal } from './components/WarmupModal';
import { SwapExerciseModal } from './components/SwapExerciseModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { ExerciseAnalyticsModal } from './components/ExerciseAnalyticsModal';
import { BodyMeasurementsModal } from './components/BodyMeasurementsModal';
import { ManualWorkoutModal } from './components/ManualWorkoutModal';
import { generateWeeklyRoutines } from './utils/routineGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authStorage.getActiveUser());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(() => !authStorage.getActiveUser());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);

  const [split, setSplit] = useState<any>('upper');
  const [strategy, setStrategy] = useState<any>('synergy');
  const [exercisesPerMuscle, setExercisesPerMuscle] = useState<1 | 2>(2);
  const [weeklyBudget, setWeeklyBudget] = useState<number>(80);
  const [level, setLevel] = useState<any>('intermediate');
  const [equip, setEquip] = useState<any>('full_gym');
  const [restSeconds, setRestSeconds] = useState<number>(90);
  const [isCardioRunning, setIsCardioRunning] = useState<boolean>(false);

  const [routines, setRoutines] = useState<GeneratedWorkoutRoutine[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [activeRoutineStartedAt, setActiveRoutineStartedAt] = useState<number | null>(null);

  const [workoutItems, setWorkoutItems] = useState<WorkoutItem[]>([]);
  const [logs, setLogs] = useState<WorkoutLogs>({});
  const [history, setHistory] = useState<WorkoutLogs>({});
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [weeklyCompletedSets, setWeeklyCompletedSets] = useState<Record<MuscleGroup, number>>({} as Record<MuscleGroup, number>);
  const [workoutNotes, setWorkoutNotes] = useState<string>('');

  const [isMuted, setIsMuted] = useState<boolean>(() => safeStorage.get('alex_muted', false));
  const [timerTriggerKey, setTimerTriggerKey] = useState(0);
  const [timerRestSeconds, setTimerRestSeconds] = useState(90);

  const [isPlateCalcOpen, setIsPlateCalcOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsExerciseName, setAnalyticsExerciseName] = useState<string | undefined>(undefined);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  
  const [warmupData, setWarmupData] = useState<{ isOpen: boolean; name: string; weight: string }>({ isOpen: false, name: '', weight: '60' });
  const [swapData, setSwapData] = useState<{ isOpen: boolean; index: number | null; currentExerciseId: string; muscleKey: string }>({ isOpen: false, index: null, currentExerciseId: '', muscleKey: '' });
  const [summaryModalSession, setSummaryModalSession] = useState<WorkoutSessionSummary | null>(null);
  const [isManualWorkoutOpen, setIsManualWorkoutOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<GeneratedWorkoutRoutine | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 2800);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    setRoutines(safeStorage.get(`alex_u_${uid}_routines`, []));
    setActiveRoutineId(safeStorage.get(`alex_u_${uid}_active_routine_id`, null));
    setActiveRoutineStartedAt(safeStorage.get(`alex_u_${uid}_active_routine_started_at`, null));
    setWorkoutItems(safeStorage.get(`alex_u_${uid}_workout`, []));
    setLogs(safeStorage.get(`alex_u_${uid}_current_logs`, {}));
    setHistory(safeStorage.get(`alex_u_${uid}_history_logs`, {}));
    setSessions(safeStorage.get(`alex_u_${uid}_sessions`, []));
    setWeeklyCompletedSets(safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>));
    setWorkoutNotes(safeStorage.get(`alex_u_${uid}_workout_notes`, ''));
    setMeasurements(safeStorage.get(`alex_u_${uid}_measurements`, []));
  }, [currentUser?.id]);

  const handleGenerateWeeklyRoutines = useCallback(() => {
    if (!currentUser) return;
    const newRoutines = generateWeeklyRoutines({
      user: currentUser,
      split,
      strategy,
      exercisesPerMuscle,
      manualWeeklySets: weeklyBudget,
      level,
      equip,
      restSeconds,
    });
    setRoutines(newRoutines);
    safeStorage.set(`alex_u_${currentUser.id}_routines`, newRoutines);
    showToast('Rotinas biomecânicas geradas com sucesso!');
  }, [currentUser, split, strategy, exercisesPerMuscle, weeklyBudget, level, equip, restSeconds, showToast]);

  useEffect(() => {
    if (currentUser && routines.length === 0) {
      handleGenerateWeeklyRoutines();
    }
  }, [currentUser, routines.length, handleGenerateWeeklyRoutines]);

  const activeRoutine = useMemo(() => {
    if (!activeRoutineId) return null;
    return routines.find((r) => r.id === activeRoutineId) || (routines.length > 0 ? routines[0] : null);
  }, [routines, activeRoutineId]);

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
    showToast(`Treino ${routine.letter} iniciado!`);
  }, [currentUser, showToast]);

  const handleDiscardActiveWorkout = useCallback(() => {
    if (!currentUser) return;
    if (confirm('Deseja realmente cancelar este treino ativo?')) {
      const uid = currentUser.id;
      setActiveRoutineId(null);
      setActiveRoutineStartedAt(null);
      setLogs({});
      setWorkoutNotes('');
      safeStorage.remove(`alex_u_${uid}_active_routine_id`);
      safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
      safeStorage.remove(`alex_u_${uid}_current_logs`);
      setActiveTab('treino');
      showToast('Treino cancelado.');
    }
  }, [currentUser, showToast]);

  const handleUpdateLog = useCallback((key: string, field: 'weight' | 'reps' | 'rpe' | 'rir', val: string) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      return { ...prev, [key]: { ...current, [field]: val } };
    });
  }, []);

  const handleToggleSet = useCallback((key: string, restSec: number) => {
    setLogs((prev) => {
      const current = prev[key] || { weight: '', reps: '', done: false };
      const nextDone = !current.done;
      if (nextDone) {
        setTimerRestSeconds(restSec);
        setTimerTriggerKey((k) => k + 1);
        showToast(`Série concluída! Descanso de ${restSec}s.`);
      }
      return { ...prev, [key]: { ...current, done: nextDone, timestamp: Date.now() } };
    });
  }, [showToast]);

  const finishAndSaveSession = () => {
    if (!currentUser) return;
    const completedKeys = Object.keys(logs).filter((k) => logs[k].done);
    if (completedKeys.length === 0) {
      alert('Conclua ao menos uma série antes de salvar.');
      return;
    }
    const totalVolumeLoad = calculateVolumeLoad(logs);
    const completedExercisesSummary = workoutItems.map((item) => {
      const itemSets: { weight: number; reps: number; rpe?: string }[] = [];
      for (let s = 1; s <= item.sets; s++) {
        const key = `${item.exercise.id}_${s}`;
        if (logs[key]?.done) {
          itemSets.push({
            weight: parseFloat(logs[key].weight) || 0,
            reps: parseInt(logs[key].reps, 10) || 0,
            rpe: logs[key].rpe,
          });
        }
      }
      return { name: item.exercise.name, muscleGroup: MUSCLE_NAMES[item.muscleKey], sets: itemSets };
    }).filter((ex) => ex.sets.length > 0);

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

    const updatedHistory = { ...history, ...logs };
    setHistory(updatedHistory);
    safeStorage.set(`alex_u_${uid}_history_logs`, updatedHistory);

    setActiveRoutineId(null);
    setActiveRoutineStartedAt(null);
    setLogs({});
    setWorkoutNotes('');
    safeStorage.remove(`alex_u_${uid}_active_routine_id`);
    safeStorage.remove(`alex_u_${uid}_active_routine_started_at`);
    safeStorage.remove(`alex_u_${uid}_current_logs`);

    setSummaryModalSession(newSession);
    showToast(`Treino concluído! Volume: ${totalVolumeLoad.toLocaleString()} kg.`);
    setActiveTab('inicio');
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
    showToast(`Bem-vindo, ${user.name}!`);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f1f5f9] pb-32">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-full shadow-2xl">
          {toastMessage}
        </div>
      )}

      <Header
        user={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={() => setActiveTab('perfil')}
        onOpenVolumeBudget={() => setIsBudgetOpen(true)}
        onOpenPlateCalc={() => setIsPlateCalcOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenMeasurements={() => setIsMeasurementsOpen(true)}
        onShare={() => {}}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        activeSetsCount={workoutItems.reduce((acc, it) => acc + it.sets, 0)}
        completedSetsCount={Object.keys(logs).filter((k) => logs[k].done).length}
        hasActiveWorkout={!!activeRoutineId}
      />

      <NavigationTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeSetsCount={workoutItems.reduce((acc, it) => acc + it.sets, 0)}
        completedSetsCount={Object.keys(logs).filter((k) => logs[k].done).length}
        sessionsCount={sessions.length}
        isCardioRunning={isCardioRunning}
        hasActiveWorkout={!!activeRoutineId}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'inicio' && (
          <HomeView
            user={currentUser}
            sessions={sessions}
            completedSetsByMuscle={weeklyCompletedSets}
            activeWorkoutMuscles={[]}
            totalSetsInWorkout={0}
            totalCompletedSetsInWorkout={0}
            workoutNotes={workoutNotes}
            onUpdateWorkoutNotes={setWorkoutNotes}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
            onGoToWorkout={() => setActiveTab('treino')}
            onViewSummary={(sess) => setSummaryModalSession(sess)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
            onOpenMeasurements={() => setIsMeasurementsOpen(true)}
          />
        )}

        {activeTab === 'treino' && currentUser && (
          <WorkoutListView
            user={currentUser}
            routines={routines}
            activeRoutineId={activeRoutineId}
            onStartWorkout={handleStartWorkout}
            onGoToProfileGenerator={() => setActiveTab('perfil')}
            onCreateManualWorkout={() => setIsManualWorkoutOpen(true)}
            onEditRoutine={() => {}}
            onDeleteRoutine={(id) => setRoutines((prev) => prev.filter((r) => r.id !== id))}
          />
        )}

        {activeTab === 'treino_ativo' && activeRoutine && (
          <ActiveWorkoutView
            routine={activeRoutine}
            workoutItems={workoutItems}
            logs={logs}
            history={history}
            sessions={sessions}
            startedAt={activeRoutineStartedAt || Date.now()}
            workoutNotes={workoutNotes}
            onUpdateWorkoutNotes={setWorkoutNotes}
            onOpenAddExercise={() => setIsAddExerciseOpen(true)}
            onMoveUp={(idx) => {
              if (idx <= 0) return;
              setWorkoutItems((prev) => {
                const c = [...prev];
                const t = c[idx];
                c[idx] = c[idx - 1];
                c[idx - 1] = t;
                return c;
              });
            }}
            onMoveDown={(idx) => {
              setWorkoutItems((prev) => {
                if (idx >= prev.length - 1) return prev;
                const c = [...prev];
                const t = c[idx];
                c[idx] = c[idx + 1];
                c[idx + 1] = t;
                return c;
              });
            }}
            onDeleteExercise={(idx) => setWorkoutItems((prev) => prev.filter((_, i) => i !== idx))}
            onUpdateLog={handleUpdateLog}
            onToggleSet={handleToggleSet}
            onUpdateRest={(idx, rest) => {
              setWorkoutItems((prev) => {
                const c = [...prev];
                c[idx] = { ...c[idx], rest };
                return c;
              });
            }}
            onOpenWarmup={(name, w) => setWarmupData({ isOpen: true, name, weight: w })}
            onOpenSwap={(idx) => setSwapData({ isOpen: true, index: idx, currentExerciseId: workoutItems[idx].exercise.id, muscleKey: workoutItems[idx].muscleKey })}
            onAddSet={(idx) => {
              setWorkoutItems((prev) => {
                const c = [...prev];
                c[idx] = { ...c[idx], sets: c[idx].sets + 1 };
                return c;
              });
            }}
            onRemoveSet={(idx) => {
              setWorkoutItems((prev) => {
                const c = [...prev];
                if (c[idx].sets > 1) c[idx] = { ...c[idx], sets: c[idx].sets - 1 };
                return c;
              });
            }}
            onFinishSession={finishAndSaveSession}
            onDiscardSession={handleDiscardActiveWorkout}
            onBackToList={() => setActiveTab('treino')}
          />
        )}

        {activeTab === 'cardio' && currentUser && (
          <CardioView user={currentUser} onCardioStateChange={setIsCardioRunning} />
        )}

        {activeTab === 'perfil' && currentUser && (
          <ProfileView
            user={currentUser}
            sessions={sessions}
            onUpdateUser={setCurrentUser}
            onLogout={() => {
              authStorage.logout();
              setCurrentUser(null);
              setIsAuthOpen(true);
            }}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
            onOpenPlateCalc={() => setIsPlateCalcOpen(true)}
            onExportBackup={() => {}}
            onImportBackup={() => {}}
            onViewSummary={(s) => setSummaryModalSession(s)}
            onClearHistory={() => setSessions([])}
            split={split}
            setSplit={setSplit}
            strategy={strategy}
            setStrategy={setStrategy}
            exercisesPerMuscle={exercisesPerMuscle}
            setExercisesPerMuscle={setExercisesPerMuscle}
            weeklyBudget={weeklyBudget}
            setWeeklyBudget={setWeeklyBudget}
            equip={equip}
            setEquip={setEquip}
            restSeconds={restSeconds}
            setRestSeconds={setRestSeconds}
            onGenerateRoutines={handleGenerateWeeklyRoutines}
            onGoToWorkoutTab={() => setActiveTab('treino')}
          />
        )}
      </main>

      <RestTimerDock
        initialSeconds={timerRestSeconds}
        triggerKey={timerTriggerKey}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
      />

      <AuthModal isOpen={isAuthOpen} onSuccess={handleAuthSuccess} />
      {currentUser && (
        <>
          <ProfileModal
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            user={currentUser}
            onUpdateUser={setCurrentUser}
            onLogout={() => {
              authStorage.logout();
              setCurrentUser(null);
              setIsAuthOpen(true);
            }}
            onOpenVolumeBudget={() => setIsBudgetOpen(true)}
          />
          <VolumeBudgetModal
            isOpen={isBudgetOpen}
            onClose={() => setIsBudgetOpen(false)}
            weeklyBudget={currentUser.weeklyBudget}
            muscleBudgets={currentUser.muscleBudgets}
            onSaveBudgets={() => {}}
          />
        </>
      )}
      <AddExerciseModal
        isOpen={isAddExerciseOpen}
        onClose={() => setIsAddExerciseOpen(false)}
        onAddExercise={(item) => setWorkoutItems((prev) => [...prev, item])}
      />
      <PlateCalculatorModal isOpen={isPlateCalcOpen} onClose={() => setIsPlateCalcOpen(false)} />
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
        onClearHistory={() => setSessions([])}
        onViewSummary={(s) => setSummaryModalSession(s)}
      />
      <SwapExerciseModal
        isOpen={swapData.isOpen}
        onClose={() => setSwapData((d) => ({ ...d, isOpen: false }))}
        targetItemIndex={swapData.index}
        currentExerciseId={swapData.currentExerciseId}
        muscleKey={swapData.muscleKey}
        equipmentFilter={equip}
        onSelectExercise={(idx, ex) => {
          setWorkoutItems((prev) => {
            const c = [...prev];
            c[idx] = { ...c[idx], exercise: ex };
            return c;
          });
        }}
      />
      <WorkoutSummaryModal
        isOpen={summaryModalSession !== null}
        onClose={() => setSummaryModalSession(null)}
        session={summaryModalSession}
        athleteName={currentUser?.name || 'Atleta'}
      />
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
        onSaveMeasurement={(m) => setMeasurements((prev) => [m, ...prev])}
        onDeleteMeasurement={(id) => setMeasurements((prev) => prev.filter((m) => m.id !== id))}
      />
      <ManualWorkoutModal
        isOpen={isManualWorkoutOpen}
        onClose={() => setIsManualWorkoutOpen(false)}
        onSaveRoutine={() => {}}
        editingRoutine={editingRoutine}
        existingRoutinesCount={routines.length}
      />
    </div>
  );
}
