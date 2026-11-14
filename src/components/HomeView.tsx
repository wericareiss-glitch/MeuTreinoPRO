/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  Trophy,
  Dumbbell,
  Calendar,
  Award,
  ArrowRight,
  TrendingUp,
  Target,
  Bell,
  Camera,
  Flame,
  BarChart3,
  History,
  CalendarDays,
} from 'lucide-react';
import {
  UserProfile,
  WorkoutSessionSummary,
  MuscleGroup,
} from '../types/workout';
import { ConsistencyCalendar } from './ConsistencyCalendar';
import { useI18n } from '../utils/i18n';
import { safeStorage } from '../utils/storage';
import { VolumeDashboard } from './VolumeDashboard';
import { HomeAnalyticsDashboard } from './HomeAnalyticsDashboard';
import { ReminderSettingsPanel } from './home/ReminderSettingsPanel';
import { RecentSessionsList } from './home/RecentSessionsList';
import {
  getWeeklyMicrocycleStatus,
  requestNotificationPermission,
  sendAppNotification,
  getReminderConfig,
  saveReminderConfig,
  checkAndTriggerScheduledNotification,
  getNotificationPermissionStatus,
  normalizeReminderTimes,
  getNextScheduledReminderInfo,
  DailyReminderConfig,
} from '../utils/notifications';

type HomeSubTab = 'historico' | 'volume' | 'analytics' | 'consistencia';

interface HomeViewProps {
  user: UserProfile | null;
  sessions: WorkoutSessionSummary[];
  completedSetsByMuscle: Record<MuscleGroup, number>;
  activeWorkoutMuscles: MuscleGroup[];
  totalSetsInWorkout: number;
  totalCompletedSetsInWorkout: number;
  activeRoutineName?: string;
  onOpenVolumeBudget: () => void;
  onGoToWorkout: () => void;
  onViewSummary: (session: WorkoutSessionSummary) => void;
  onEditSession?: (session: WorkoutSessionSummary) => void;
  onOpenAnalytics?: (exerciseName?: string) => void;
  onOpenMeasurements?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  sessions,
  completedSetsByMuscle,
  activeWorkoutMuscles,
  totalSetsInWorkout,
  totalCompletedSetsInWorkout,
  activeRoutineName,
  onOpenVolumeBudget,
  onGoToWorkout,
  onViewSummary,
  onEditSession,
  onOpenAnalytics,
  onOpenMeasurements,
}) => {
  const { t } = useI18n();

  const microcycle = useMemo(
    () => getWeeklyMicrocycleStatus(sessions, user?.frequency || 4),
    [sessions, user?.frequency]
  );

  const [activeSubTab, setActiveSubTab] = useState<HomeSubTab>(() => {
    const saved = safeStorage.get<string>('meutreino_home_subtab', 'historico');
    if (saved === 'volume' || saved === 'analytics' || saved === 'consistencia') {
      return saved;
    }
    return 'historico';
  });

  const handleChangeSubTab = (tab: HomeSubTab) => {
    setActiveSubTab(tab);
    safeStorage.set('meutreino_home_subtab', tab);
  };

  const [notifStatus, setNotifStatus] = useState<'idle' | 'success' | 'blocked'>('idle');
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() =>
    getNotificationPermissionStatus()
  );
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [testNotifSuccess, setTestNotifSuccess] = useState(false);

  const [reminderConfig, setReminderConfig] = useState<DailyReminderConfig>(() => {
    return user
      ? getReminderConfig(user.id)
      : { enabled: false, time: '18:00', times: ['18:00'], days: [1, 2, 3, 4, 5], customMessage: '' };
  });

  useEffect(() => {
    if (user) {
      setReminderConfig(getReminderConfig(user.id));
    }
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; config: DailyReminderConfig }>;
      if (user && customEvent.detail && customEvent.detail.userId === user.id) {
        setReminderConfig(customEvent.detail.config);
      }
    };
    window.addEventListener('meutreino:reminder-updated', handleSync);
    return () => window.removeEventListener('meutreino:reminder-updated', handleSync);
  }, [user]);

  useEffect(() => {
    setPermStatus(getNotificationPermissionStatus());

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK_ACTION') {
          onGoToWorkout();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, [onGoToWorkout]);

  const configuredTimes = useMemo(() => normalizeReminderTimes(reminderConfig), [reminderConfig]);
  const nextReminderInfo = useMemo(() => getNextScheduledReminderInfo(reminderConfig), [reminderConfig]);

  const userId = user?.id;
  const userName = user?.name;
  const reminderEnabled = reminderConfig.enabled;
  const reminderTimesKey = configuredTimes.join(',');
  const reminderDaysStr = reminderConfig.days.join(',');

  useEffect(() => {
    if (!userId || !reminderEnabled) return;
    checkAndTriggerScheduledNotification(userId, userName || 'Atleta');
  }, [userId, userName, reminderEnabled, reminderTimesKey, reminderDaysStr]);

  const handleToggleReminder = async () => {
    if (!user) return;

    if (!reminderConfig.enabled) {
      const currentPerm = getNotificationPermissionStatus();
      if (currentPerm !== 'granted') {
        const granted = await requestNotificationPermission();
        setPermStatus(getNotificationPermissionStatus());
        if (!granted) {
          setNotifStatus('blocked');
          setTimeout(() => setNotifStatus('idle'), 4000);
          return;
        }
      }
      const times = normalizeReminderTimes(reminderConfig);
      const nextConfig: DailyReminderConfig = {
        ...reminderConfig,
        enabled: true,
        time: times[0],
        times,
      };
      setReminderConfig(nextConfig);
      saveReminderConfig(user.id, nextConfig);
      sendAppNotification(
        'MeuTreino Pro ⚡ • Lembretes Ativos',
        `Lembretes agendados para: ${times.join(', ')} nos dias selecionados!`
      );
      setNotifStatus('success');
      setTimeout(() => setNotifStatus('idle'), 3000);
    } else {
      const nextConfig = { ...reminderConfig, enabled: false };
      setReminderConfig(nextConfig);
      saveReminderConfig(user.id, nextConfig);
    }
  };

  const handleUpdatePrimaryTime = (index: number, newTime: string) => {
    if (!user || !newTime) return;
    const currentList = [...configuredTimes];
    currentList[index] = newTime;
    const nextTimes = Array.from(new Set(currentList)).sort();
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleAddReminderTime = (timeToAdd?: string) => {
    if (!user) return;
    const target = (timeToAdd || '07:00').trim();
    if (!/^\d{2}:\d{2}$/.test(target)) return;
    const nextTimes = Array.from(new Set([...configuredTimes, target])).sort();
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0],
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleRemoveReminderTime = (timeToRemove: string) => {
    if (!user || configuredTimes.length <= 1) return;
    const nextTimes = configuredTimes.filter((tm) => tm !== timeToRemove);
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      time: nextTimes[0] || '18:00',
      times: nextTimes,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleUpdateCustomMessage = (msg: string) => {
    if (!user) return;
    const nextConfig: DailyReminderConfig = {
      ...reminderConfig,
      customMessage: msg,
    };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleToggleDay = (day: number) => {
    if (!user) return;
    const exists = reminderConfig.days.includes(day);
    const nextDays = exists
      ? reminderConfig.days.filter((d) => d !== day)
      : [...reminderConfig.days, day].sort();

    const nextConfig = { ...reminderConfig, days: nextDays.length > 0 ? nextDays : [day] };
    setReminderConfig(nextConfig);
    saveReminderConfig(user.id, nextConfig);
  };

  const handleSendTestNotification = async () => {
    const currentPerm = getNotificationPermissionStatus();
    if (currentPerm !== 'granted') {
      const granted = await requestNotificationPermission();
      setPermStatus(getNotificationPermissionStatus());
      if (!granted) return;
    }
    const msg =
      reminderConfig.customMessage && reminderConfig.customMessage.trim().length > 0
        ? reminderConfig.customMessage.trim()
        : `Hora do treino! Seus horários definidos (${configuredTimes.join(', ')}) estão ativos`;
    const sent = sendAppNotification('MeuTreino Pro • Aviso de Teste', msg);
    if (sent) {
      setTestNotifSuccess(true);
      setTimeout(() => setTestNotifSuccess(false), 3000);
    }
  };

  const stats = useMemo(() => {
    let totalTonnage = 0;
    let highestWeight = 0;

    sessions.forEach((s) => {
      totalTonnage += s.totalVolumeLoadKg || 0;
      s.completedExercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (set.weight > highestWeight) highestWeight = set.weight;
        });
      });
    });

    const totalWeeklyTarget = user?.weeklyBudget || 90;
    const weeklyCompleted = Object.values(completedSetsByMuscle).reduce((a, b) => a + b, 0);
    const weeklyPercent =
      totalWeeklyTarget > 0 ? Math.min(100, Math.round((weeklyCompleted / totalWeeklyTarget) * 100)) : 0;

    return {
      totalTonnage,
      highestWeight,
      weeklyCompleted,
      totalWeeklyTarget,
      weeklyPercent,
    };
  }, [sessions, completedSetsByMuscle, user?.weeklyBudget]);

  const profileSummaryLine = useMemo(() => {
    if (!user) return t.homeSubtitle;
    const levelLabel =
      user.level === 'beginner'
        ? t.nav.levelBeginner
        : user.level === 'intermediate'
        ? t.nav.levelIntermediate
        : t.nav.levelAdvanced;
    const focusLabel =
      user.focus === 'glutes'
        ? t.nav.focusGlutes
        : user.focus === 'strength'
        ? t.nav.focusStrength
        : user.focus === 'v_taper'
        ? t.nav.focusVTaper
        : t.nav.focusBalanced;
    return `${levelLabel} · ${focusLabel} · ${user.frequency || 4}x/${t.nav.perWeek}`;
  }, [user, t]);

  return (
    <div className="space-y-3.5 animate-fadeIn pb-[max(6.5rem,calc(5rem+env(safe-area-inset-bottom)))] sm:pb-16 w-full max-w-full min-w-0 touch-pan-y">
      {/* 1. Card Compacto "Treino de Hoje" + Ações Rápidas */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121c32] via-[#0e1628] to-[#0a101f] border border-[#213252] p-3.5 sm:p-4 shadow-xl space-y-3">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight truncate">
              {t.homeGreeting}, {user?.name || 'Atleta'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {profileSummaryLine}
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToWorkout}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Dumbbell className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>
              {totalSetsInWorkout > 0
                ? activeRoutineName
                  ? `${t.continueWorkoutCta} · ${totalCompletedSetsInWorkout}/${totalSetsInWorkout}`
                  : `${t.continueWorkoutCta} (${totalCompletedSetsInWorkout}/${totalSetsInWorkout})`
                : t.startWorkoutCta}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Barra de Atalhos Compactos (1 linha sem rolagem) */}
        <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => (onOpenAnalytics ? onOpenAnalytics() : handleChangeSubTab('analytics'))}
            className="min-h-[42px] px-2.5 rounded-xl bg-[#090f1d] hover:bg-[#111c33] border border-slate-800 hover:border-emerald-500/40 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{t.home.exerciseAnalyticsBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenMeasurements?.()}
            disabled={!onOpenMeasurements}
            className="min-h-[42px] px-2.5 rounded-xl bg-[#090f1d] hover:bg-[#111c33] border border-slate-800 hover:border-teal-500/40 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">{t.home.bodyMeasurementsBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowReminderSettings((prev) => !prev)}
            className={`min-h-[42px] px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer active:scale-[0.98] whitespace-nowrap ${
              reminderConfig.enabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-[#090f1d] hover:bg-[#111c33] border-slate-800 text-slate-200'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 shrink-0 ${reminderConfig.enabled ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="truncate font-mono">
              {reminderConfig.enabled ? configuredTimes[0] : t.notifications.title}
            </span>
          </button>
        </div>

        {notifStatus === 'blocked' && (
          <p className="text-[11px] text-rose-400 font-medium">
            {t.notifications.blockedNotice}
          </p>
        )}
      </div>

      {/* Painel Expansível de Lembretes (sob demanda) */}
      {showReminderSettings && (
        <ReminderSettingsPanel
          reminderConfig={reminderConfig}
          configuredTimes={configuredTimes}
          nextReminderInfo={nextReminderInfo}
          permStatus={permStatus}
          testNotifSuccess={testNotifSuccess}
          onToggleReminder={handleToggleReminder}
          onUpdatePrimaryTime={handleUpdatePrimaryTime}
          onAddReminderTime={handleAddReminderTime}
          onRemoveReminderTime={handleRemoveReminderTime}
          onToggleDay={handleToggleDay}
          onUpdateCustomMessage={handleUpdateCustomMessage}
          onSendTestNotification={handleSendTestNotification}
          onClose={() => setShowReminderSettings(false)}
        />
      )}

      {/* 2. Grade 2x2 de Métricas da Semana */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {t.kpiCompletedWorkouts}
            </span>
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black font-mono text-white tabular-nums">
              {sessions.length}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {sessions.length === 1 ? t.home.workoutSingular : t.home.workoutPlural}
            </span>
          </div>
        </div>

        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {t.kpiTotalTonnage}
            </span>
            <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums truncate">
              {stats.totalTonnage.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">kg</span>
          </div>
        </div>

        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {t.kpiWeeklyTarget}
            </span>
            <Target className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-teal-300 tabular-nums">
                {stats.weeklyCompleted}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                / {stats.totalWeeklyTarget} s
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.weeklyPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate">
              {t.kpiMaxLoadPR}
            </span>
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 tabular-nums">
              {stats.highestWeight}
            </span>
            <span className="text-[11px] font-mono text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* 3. Barra Compacta de Microciclo Semanal */}
      <div className="bg-gradient-to-r from-[#10192e] to-[#0c1322] border border-sky-500/25 rounded-2xl p-3 sm:p-3.5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-white truncate">
              {t.home.microcycleTitle}: {microcycle.completedThisWeek}/{microcycle.targetFrequency} {t.home.microcycleWorkouts} ({microcycle.percentage}%)
            </span>
          </div>

          {microcycle.consecutiveWeeksStreak > 0 && (
            <span className="text-[11px] font-mono font-bold text-amber-300 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {microcycle.consecutiveWeeksStreak} {t.nav.perWeek.slice(0, 3)}.
            </span>
          )}
        </div>

        <div className="w-full bg-[#080d19] h-1.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${microcycle.percentage}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 truncate">
          {microcycle.statusMessage}
        </p>
      </div>

      {/* 4. Abas Internas Horizontais para Evitar Empilhamento Longo */}
      <div
        role="tablist"
        aria-label={t.home.tabOverview}
        className="flex items-center gap-1.5 overflow-x-auto theme-scrollbar pb-0.5"
      >
        {(
          [
            { id: 'historico', label: `${t.historyBtn} (${sessions.length})`, icon: History },
            { id: 'volume', label: t.home.weeklyVolumeBtn, icon: BarChart3 },
            { id: 'analytics', label: t.home.tabAnalytics, icon: TrendingUp },
            { id: 'consistencia', label: t.home.tabCalendar, icon: CalendarDays },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChangeSubTab(tab.id)}
              className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98] ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/15 font-black'
                  : 'bg-[#0f172a] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Sub-Aba Ativa */}
      <div className="animate-fadeIn">
        {activeSubTab === 'historico' && (
          <RecentSessionsList
            sessions={sessions}
            onGoToWorkout={onGoToWorkout}
            onViewSummary={onViewSummary}
            onEditSession={onEditSession}
          />
        )}

        {activeSubTab === 'volume' && (
          <VolumeDashboard
            completedSetsByMuscle={completedSetsByMuscle}
            activeWorkoutMuscles={activeWorkoutMuscles}
            muscleBudgets={user?.muscleBudgets}
            totalWeeklyBudget={user?.weeklyBudget}
            onOpenVolumeBudget={onOpenVolumeBudget}
          />
        )}

        {activeSubTab === 'analytics' && (
          <HomeAnalyticsDashboard
            sessions={sessions}
            onGoToWorkout={onGoToWorkout}
            onOpenAnalyticsModal={onOpenAnalytics}
          />
        )}

        {activeSubTab === 'consistencia' && (
          <ConsistencyCalendar
            sessions={sessions}
            weeklyFrequencyGoal={user?.frequency || 4}
          />
        )}
      </div>
    </div>
  );
};
