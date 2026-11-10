/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserProfile, 
  Exercise, 
  SplitOption,
  WorkoutItem,
  WorkoutLogs,
  WorkoutSessionSummary,
  BodyMeasurement
} from './types/workout';
import { MUSCLE_NAMES } from './data/exerciseDatabase';
import { safeStorage } from './utils/storage';
import { authStorage } from './utils/auth';
import { TabType } from './types/navigation';
import { useI18n } from './utils/i18n';
import { useTheme } from './utils/theme';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HistoryProvider, useHistory } from './contexts/HistoryContext';
import { WorkoutProvider, useWorkout } from './contexts/WorkoutContext';

import { Header } from './components/Header';
import { RestTimerDock } from './components/RestTimerDock';
import { AuthModal } from './components/AuthModal';
import { NavigationTabs } from './components/NavigationTabs';
import { HomeView } from './components/HomeView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';

import { WorkoutListView } from './components/WorkoutListView';
import { ActiveWorkoutView } from './components/ActiveWorkoutView';
import { ProfileView } from './components/ProfileView';
import { WarmupModal } from './components/WarmupModal';
import { HistoryModal } from './components/HistoryModal';
import { SwapExerciseModal } from './components/SwapExerciseModal';
import { VolumeBudgetModal } from './components/VolumeBudgetModal';
import { AddExerciseModal } from './components/AddExerciseModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { ExerciseAnalyticsModal } from './components/ExerciseAnalyticsModal';
import { BodyMeasurementsModal } from './components/BodyMeasurementsModal';
import { ManualWorkoutModal } from './components/ManualWorkoutModal';

interface AppContentProps {
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

function AppContent({ toastMessage, showToast }: AppContentProps) {
  const { t } = useI18n();
  useTheme();

  // Navigation tab state: 'inicio' | 'treino' | 'treino_ativo' | 'perfil'
  const [activeTab, setActiveTab] = useState<TabType>('inicio');

  // Auth Context
  const {
    currentUser,
    isAuthOpen,
    isBudgetOpen,
    setIsBudgetOpen,
    isBiometricLocked,
    setIsBiometricLocked,
    handleAuthSuccess,
    handleLogout,
    handleDeleteProfile,
    handleSwitchProfile,
    updateUser,
    handleSaveBudgets,
  } = useAuth();

  // History Context
  const {
    sessions,
    history,
    weeklyCompletedSets,
    measurements,
    isHistoryOpen,
    setIsHistoryOpen,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    analyticsExerciseName,
    isMeasurementsOpen,
    setIsMeasurementsOpen,
    summaryModalSession,
    setSummaryModalSession,
    handleSaveMeasurement,
    handleDeleteMeasurement,
    handleOpenAnalytics,
    clearHistory,
  } = useHistory();

  // Workout Context
  const {
    split,
    setSplit,
    strategy,
    setStrategy,
    periodizationStrategy,
    weeklyBudget,
    setWeeklyBudget,
    level,
    setLevel,
    equip,
    setEquip,
    restSeconds,
    setRestSeconds,
    routines,
    setRoutines,
    editingRoutine,
    isManualWorkoutOpen,
    setIsManualWorkoutOpen,
    activeRoutineId,
    activeRoutineStartedAt,
    activeRoutine,
    workoutItems,
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
  } = useWorkout();

  // Ensure active tab redirects to treino if active routine is cleared
  useEffect(() => {
    if (activeTab === 'treino_ativo' && !activeRoutineId) {
      setActiveTab('treino');
    }
  }, [activeTab, activeRoutineId]);

  // Export and Share Helpers
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
      lines.push(`• Séries: ${item.sets} x ${item.reps} | Descanso: ${item.rest}s`);
      
      const loggedSets: string[] = [];
      for (let s = 1; s <= item.sets; s++) {
        const k = `${item.exercise.id}_${s}`;
        if (logs[k]?.done) {
          loggedSets.push(`S${s}: ${logs[k].weight || 0}kg x ${logs[k].reps || 0}`);
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
    const sanitizedUser: UserProfile = {
      ...currentUser,
      password: '',
    };
    const backup = {
      app: 'MeuTreinoPro',
      version: '4.1',
      exportedAt: new Date().toISOString(),
      user: sanitizedUser,
      settings: { split, strategy, level, equip, restSeconds, weeklyBudget },
      routines,
      measurements,
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
    showToast('Backup completo do perfil exportado com sucesso!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const uid = currentUser.id;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid backup structure');
        }
        if (parsed.currentLogs) {
          safeStorage.set(`alex_u_${uid}_current_logs`, parsed.currentLogs);
        }
        if (parsed.historyLogs) {
          safeStorage.set(`alex_u_${uid}_history_logs`, parsed.historyLogs);
        }
        if (Array.isArray(parsed.sessions)) {
          safeStorage.set(`alex_u_${uid}_sessions`, parsed.sessions);
        }
        if (parsed.weeklyVolume) {
          safeStorage.set(`alex_u_${uid}_weekly_volume`, parsed.weeklyVolume);
        }
        if (Array.isArray(parsed.routines)) {
          safeStorage.set(`alex_u_${uid}_routines`, parsed.routines);
        }
        if (Array.isArray(parsed.measurements)) {
          safeStorage.set(`alex_u_${uid}_measurements`, parsed.measurements);
        }
        if (Array.isArray(parsed.workoutItems)) {
          safeStorage.set(`alex_u_${uid}_workout`, parsed.workoutItems);
        }
        if (parsed.workoutNotes !== undefined) {
          safeStorage.set(`alex_u_${uid}_workout_notes`, parsed.workoutNotes);
        }
        showToast('✅ Dados do backup restaurados e salvos com sucesso!');
        window.location.reload();
      } catch {
        showToast('⚠️ Arquivo de backup inválido ou corrompido.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen max-w-full w-full bg-theme-app text-theme-body pb-32 transition-colors duration-200 touch-pan-y">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl shadow-emerald-500/40 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Offline Connectivity Notification */}
      <OfflineIndicator />

      {/* Clean Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Responsive Navigation Tabs (Subheader on Desktop, Dock on Mobile) */}
      {activeTab !== 'treino_ativo' && (
        <NavigationTabs
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          activeSetsCount={totalSetsInWorkout}
          completedSetsCount={totalCompletedSetsInWorkout}
          sessionsCount={sessions.length}
          hasActiveWorkout={!!activeRoutineId}
        />
      )}

      {/* Main Container - Renders the selected Tab View */}
      <main className="w-full max-w-6xl mx-auto min-w-0 px-3 sm:px-6 pt-4 sm:pt-6 touch-pan-y">
        {/* Banner Flutuante Rápido de Retorno ao Treino Ativo */}
        {activeRoutine && activeTab !== 'treino_ativo' && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-teal-500/20 border border-amber-400/50 shadow-lg flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    Treino em Andamento
                  </span>
                  <span className="text-xs font-extrabold text-white truncate">
                    {activeRoutine.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                  {totalCompletedSetsInWorkout} de {totalSetsInWorkout} séries concluídas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('treino_ativo')}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <span>Voltar ao Treino</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Container Principal com Transição Suave via framer-motion */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full min-w-0 touch-pan-y"
          >
            {/* ABA 1: INÍCIO */}
            {activeTab === 'inicio' && (
              <SectionErrorBoundary sectionName="Painel Principal">
                <HomeView
                  user={currentUser}
                  sessions={sessions}
                  completedSetsByMuscle={completedSetsByMuscle}
                  activeWorkoutMuscles={activeWorkoutMuscles}
                  totalSetsInWorkout={totalSetsInWorkout}
                  totalCompletedSetsInWorkout={totalCompletedSetsInWorkout}
                  onOpenVolumeBudget={() => setIsBudgetOpen(true)}
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
              </SectionErrorBoundary>
            )}

            {/* Abas Secundárias Carregadas Sob Demanda */}
            <React.Suspense
              fallback={
                <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
                  Carregando...
                </div>
              }
            >
              {/* ABA 2: TREINO */}
              {activeTab === 'treino' && currentUser && (
                <SectionErrorBoundary sectionName="Lista de Treinos">
                  <WorkoutListView
                    user={currentUser}
                    routines={routines}
                    activeRoutineId={activeRoutineId}
                    onStartWorkout={(r) => handleStartWorkout(r, () => setActiveTab('treino_ativo'))}
                    onCreateManualWorkout={handleOpenCreateManualRoutine}
                    onGenerateQuickWorkout={handleGenerateQuickWorkout}
                    onEditRoutine={handleEditRoutine}
                    onDeleteRoutine={handleDeleteRoutine}
                    onShareRoutine={handleShareRoutine}
                    onReorderRoutines={handleReorderRoutines}
                    split={split}
                    setSplit={setSplit}
                    strategy={strategy}
                    setStrategy={setStrategy}
                    weeklyBudget={weeklyBudget}
                    setWeeklyBudget={setWeeklyBudget}
                    level={level}
                    setLevel={setLevel}
                    equip={equip}
                    setEquip={setEquip}
                    restSeconds={restSeconds}
                    setRestSeconds={setRestSeconds}
                    onGenerateRoutines={handleGenerateWeeklyRoutines}
                    onUpdateUser={updateUser}
                    periodizationStrategy={periodizationStrategy}
                    setPeriodizationStrategy={handleSelectPeriodizationStrategy}
                    onOpenVolumeBudget={() => setIsBudgetOpen(true)}
                  />
                </SectionErrorBoundary>
              )}

              {/* ABA 2.5: TREINO ATIVO */}
              {activeTab === 'treino_ativo' && activeRoutine && (
                <SectionErrorBoundary sectionName="Treino Ativo">
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
                    onReorderExercises={handleReorderExercises}
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
                    periodizationStrategy={periodizationStrategy}
                    userFocus={currentUser?.focus}
                    onSelectPeriodizationStrategy={handleSelectPeriodizationStrategy}
                    deepWorkMode={Boolean(currentUser?.deepWorkMode)}
                    onToggleDeepWork={() => {
                      if (currentUser) {
                        const updated = authStorage.updateProfile(currentUser.id, {
                          deepWorkMode: !currentUser.deepWorkMode,
                        });
                        if (updated) {
                          updateUser(updated);
                        }
                      }
                    }}
                    onFinishSession={() => finishAndSaveSession(() => setActiveTab('inicio'))}
                    onDiscardSession={() => handleDiscardActiveWorkout(() => setActiveTab('treino'))}
                    onBackToList={() => setActiveTab('treino')}
                  />
                </SectionErrorBoundary>
              )}

              {/* ABA: PERFIL */}
              {activeTab === 'perfil' && currentUser && (
                <SectionErrorBoundary sectionName="Perfil">
                  <ProfileView
                    user={currentUser}
                    sessions={sessions}
                    onUpdateUser={updateUser}
                    onLogout={handleLogout}
                    onOpenVolumeBudget={() => setIsBudgetOpen(true)}
                    onExportBackup={handleExportBackup}
                    onImportBackup={handleImportBackup}
                    onViewSummary={(sess) => setSummaryModalSession(sess)}
                    onClearHistory={clearHistory}
                    onDeleteProfile={handleDeleteProfile}
                    onSwitchProfile={handleSwitchProfile}
                  />
                </SectionErrorBoundary>
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating HUD Rest Timer */}
      <RestTimerDock
        initialSeconds={timerRestSeconds}
        triggerKey={timerTriggerKey}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        activeExerciseName={activeExerciseName}
        hasBottomNav={activeTab !== 'treino_ativo'}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
      />

      {currentUser && isBiometricLocked && !isAuthOpen && (
        <BiometricLockScreen
          user={currentUser}
          onUnlocked={() => setIsBiometricLocked(false)}
          onSwitchAccount={handleLogout}
        />
      )}

      <React.Suspense fallback={null}>
        {currentUser && isBudgetOpen && (
          <VolumeBudgetModal
            isOpen={isBudgetOpen}
            onClose={() => setIsBudgetOpen(false)}
            weeklyBudget={currentUser.weeklyBudget}
            muscleBudgets={currentUser.muscleBudgets}
            onSaveBudgets={handleSaveBudgets}
          />
        )}

        {isAddExerciseOpen && (
          <AddExerciseModal
            isOpen={isAddExerciseOpen}
            onClose={() => setIsAddExerciseOpen(false)}
            onAddExercise={handleAddCustomExercise}
          />
        )}

        {warmupData.isOpen && (
          <WarmupModal
            isOpen={warmupData.isOpen}
            onClose={() => setWarmupData((d) => ({ ...d, isOpen: false }))}
            exerciseName={warmupData.name}
            initialWeight={warmupData.weight}
          />
        )}

        {isHistoryOpen && (
          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            sessions={sessions}
            onViewSummary={(sess) => {
              setIsHistoryOpen(false);
              setSummaryModalSession(sess);
            }}
            onClearHistory={clearHistory}
          />
        )}

        {swapData.isOpen && (
          <SwapExerciseModal
            isOpen={swapData.isOpen}
            onClose={() => setSwapData((d) => ({ ...d, isOpen: false }))}
            targetItemIndex={swapData.index}
            currentExerciseId={swapData.currentExerciseId}
            muscleKey={swapData.muscleKey}
            equipmentFilter={equip}
            onSelectExercise={handleSelectSwapExercise}
          />
        )}

        {summaryModalSession !== null && (
          <WorkoutSummaryModal
            isOpen={summaryModalSession !== null}
            onClose={() => setSummaryModalSession(null)}
            session={summaryModalSession}
            athleteName={currentUser?.name || 'Atleta'}
            previousSessions={sessions}
          />
        )}

        {isAnalyticsOpen && (
          <ExerciseAnalyticsModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
            sessions={sessions}
            initialExerciseName={analyticsExerciseName}
          />
        )}

        {isMeasurementsOpen && (
          <BodyMeasurementsModal
            isOpen={isMeasurementsOpen}
            onClose={() => setIsMeasurementsOpen(false)}
            user={currentUser}
            measurements={measurements}
            onSaveMeasurement={handleSaveMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        )}

        {isManualWorkoutOpen && (
          <ManualWorkoutModal
            isOpen={isManualWorkoutOpen}
            onClose={() => setIsManualWorkoutOpen(false)}
            onSaveRoutine={handleSaveManualRoutine}
            editingRoutine={editingRoutine}
            existingRoutinesCount={routines.length}
          />
        )}
      </React.Suspense>
    </div>
  );
}

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detecção e atualização automática transparente do Service Worker nos estados 'installed' e 'waiting'
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // Recarregar a página automaticamente com window.location.reload() quando o novo SW assumir o controle
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Enviar SKIP_WAITING para forçar ativação imediata do novo Service Worker
    const triggerSkipWaiting = (worker: ServiceWorker | null | undefined) => {
      if (!worker) return;
      try {
        worker.postMessage({ type: 'SKIP_WAITING' });
      } catch {
        // Fallback caso postMessage falhe
      }
    };

    // Monitorar registros e estados 'installed' e 'waiting'
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // 1. Caso o Service Worker já esteja no estado 'waiting'
      if (registration.waiting) {
        triggerSkipWaiting(registration.waiting);
      }

      // 2. Detectar quando o Service Worker em instalação atinge o estado 'installed'
      const checkInstallingWorker = (worker: ServiceWorker | null) => {
        if (!worker) return;
        if (worker.state === 'installed') {
          triggerSkipWaiting(worker);
        } else {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed') {
              triggerSkipWaiting(worker);
            }
          });
        }
      };

      if (registration.installing) {
        checkInstallingWorker(registration.installing);
      }

      // 3. Ouvir por novas atualizações descobertas durante a sessão
      registration.addEventListener('updatefound', () => {
        checkInstallingWorker(registration.installing);
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  return (
    <AuthProvider onShowToast={showToast}>
      <HistoryProvider onShowToast={showToast}>
        <WorkoutProvider onShowToast={showToast}>
          <AppContent toastMessage={toastMessage} showToast={showToast} />
        </WorkoutProvider>
      </HistoryProvider>
    </AuthProvider>
  );
}
