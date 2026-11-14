/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WorkoutSessionSummary, WorkoutLogs, BodyMeasurement, MuscleGroup } from '../types/workout';
import { safeStorage } from '../utils/storage';
import { recalculateSessionSummary, recomputeWeeklyVolumeFromSessions } from '../utils/sessionEditor';
import { useAuth } from './AuthContext';
import { syncSessionToCloud, syncMeasurementToCloud, deleteMeasurementFromCloud } from '../services/firebase';

export interface HistoryContextType {
  sessions: WorkoutSessionSummary[];
  history: WorkoutLogs;
  weeklyCompletedSets: Record<MuscleGroup, number>;
  measurements: BodyMeasurement[];
  isHistoryOpen: boolean;
  setIsHistoryOpen: (open: boolean) => void;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (open: boolean) => void;
  analyticsExerciseName: string | undefined;
  setAnalyticsExerciseName: (name: string | undefined) => void;
  isMeasurementsOpen: boolean;
  setIsMeasurementsOpen: (open: boolean) => void;
  summaryModalSession: WorkoutSessionSummary | null;
  setSummaryModalSession: (sess: WorkoutSessionSummary | null) => void;
  summaryInitialEditMode: boolean;
  openSessionSummary: (sess: WorkoutSessionSummary, editMode?: boolean) => void;
  closeSessionSummary: () => void;
  handleUpdateSession: (updatedSession: WorkoutSessionSummary) => void;
  handleSaveMeasurement: (item: BodyMeasurement) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleOpenAnalytics: (exerciseName?: string) => void;
  clearHistory: () => void;
  addCompletedSession: (
    session: WorkoutSessionSummary,
    newHistory: WorkoutLogs,
    newWeeklyVolume: Record<MuscleGroup, number>
  ) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{
  children: React.ReactNode;
  onShowToast: (msg: string) => void;
}> = ({ children, onShowToast }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.id;

  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>(() => {
    if (!uid) return [];
    return safeStorage.get(`alex_u_${uid}_sessions`, []);
  });

  const [history, setHistory] = useState<WorkoutLogs>(() => {
    if (!uid) return {};
    return safeStorage.get(`alex_u_${uid}_history_logs`, {});
  });

  const [weeklyCompletedSets, setWeeklyCompletedSets] = useState<Record<MuscleGroup, number>>(() => {
    if (!uid) return {} as Record<MuscleGroup, number>;
    return safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>);
  });

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(() => {
    if (!uid) return [];
    return safeStorage.get(`alex_u_${uid}_measurements`, []);
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsExerciseName, setAnalyticsExerciseName] = useState<string | undefined>(undefined);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);
  const [summaryModalSession, setSummaryModalSession] = useState<WorkoutSessionSummary | null>(null);
  const [summaryInitialEditMode, setSummaryInitialEditMode] = useState(false);

  // Re-sync on user switch
  useEffect(() => {
    if (!uid) {
      setSessions([]);
      setHistory({});
      setWeeklyCompletedSets({} as Record<MuscleGroup, number>);
      setMeasurements([]);
      return;
    }
    setSessions(safeStorage.get(`alex_u_${uid}_sessions`, []));
    setHistory(safeStorage.get(`alex_u_${uid}_history_logs`, {}));
    setWeeklyCompletedSets(safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>));
    setMeasurements(safeStorage.get(`alex_u_${uid}_measurements`, []));
  }, [uid]);

  // Listen to remote sync events
  useEffect(() => {
    if (!uid) return;
    const handleRemoteSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.userId === uid) {
        const detail = customEvent.detail;
        if (detail.sessions) setSessions(detail.sessions);
        if (detail.measurements) setMeasurements(detail.measurements);
        setHistory(safeStorage.get(`alex_u_${uid}_history_logs`, {}));
        setWeeklyCompletedSets(safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>));
      }
    };
    window.addEventListener('meutreino:remote-sync-applied', handleRemoteSync);

    const handleIdbHydrated = () => {
      setSessions(safeStorage.get(`alex_u_${uid}_sessions`, []));
      setHistory(safeStorage.get(`alex_u_${uid}_history_logs`, {}));
      setWeeklyCompletedSets(safeStorage.get(`alex_u_${uid}_weekly_volume`, {} as Record<MuscleGroup, number>));
      setMeasurements(safeStorage.get(`alex_u_${uid}_measurements`, []));
    };
    window.addEventListener('meutreino:idb-hydrated', handleIdbHydrated);

    return () => {
      window.removeEventListener('meutreino:remote-sync-applied', handleRemoteSync);
      window.removeEventListener('meutreino:idb-hydrated', handleIdbHydrated);
    };
  }, [uid]);

  const handleSaveMeasurement = useCallback((item: BodyMeasurement) => {
    if (!uid) return;
    setMeasurements((prev) => {
      const existingIdx = prev.findIndex((m) => m.id === item.id);
      let updated: BodyMeasurement[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = item;
      } else {
        updated = [item, ...prev];
      }
      safeStorage.set(`alex_u_${uid}_measurements`, updated);
      return updated;
    });

    if (currentUser && !currentUser.isVisitor) {
      syncMeasurementToCloud(uid, item).catch(() => {});
    }
    onShowToast('Check-in corporal salvo com sucesso!');
  }, [uid, currentUser, onShowToast]);

  const handleDeleteMeasurement = useCallback((id: string) => {
    if (!uid) return;
    setMeasurements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      safeStorage.set(`alex_u_${uid}_measurements`, updated);
      return updated;
    });

    if (currentUser && !currentUser.isVisitor) {
      deleteMeasurementFromCloud(uid, id).catch(() => {});
    }
    onShowToast('Registo de medição removido.');
  }, [uid, currentUser, onShowToast]);

  const handleOpenAnalytics = useCallback((exerciseName?: string) => {
    setAnalyticsExerciseName(exerciseName);
    setIsAnalyticsOpen(true);
  }, []);

  const clearHistory = useCallback(() => {
    if (!uid) return;
    setSessions([]);
    safeStorage.remove(`alex_u_${uid}_sessions`);
    onShowToast('Histórico deste perfil foi apagado.');
  }, [uid, onShowToast]);

  const addCompletedSession = useCallback((
    newSession: WorkoutSessionSummary,
    newHistory: WorkoutLogs,
    newWeeklyVolume: Record<MuscleGroup, number>
  ) => {
    if (!uid) return;
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    safeStorage.set(`alex_u_${uid}_sessions`, updatedSessions);

    setHistory(newHistory);
    safeStorage.set(`alex_u_${uid}_history_logs`, newHistory);

    setWeeklyCompletedSets(newWeeklyVolume);
    safeStorage.set(`alex_u_${uid}_weekly_volume`, newWeeklyVolume);

    setSummaryInitialEditMode(false);
    setSummaryModalSession(newSession);

    if (currentUser && !currentUser.isVisitor) {
      syncSessionToCloud(uid, newSession).catch(() => {});
    }
  }, [uid, sessions, currentUser]);

  const openSessionSummary = useCallback((sess: WorkoutSessionSummary, editMode = false) => {
    setSummaryInitialEditMode(editMode);
    setSummaryModalSession(sess);
  }, []);

  const closeSessionSummary = useCallback(() => {
    setSummaryModalSession(null);
    setSummaryInitialEditMode(false);
  }, []);

  const handleUpdateSession = useCallback((updatedSession: WorkoutSessionSummary) => {
    if (!uid) return;
    const normalized = recalculateSessionSummary(updatedSession);

    setSessions((prev) => {
      const nextSessions = prev.map((s) => (s.id === normalized.id ? normalized : s));
      safeStorage.set(`alex_u_${uid}_sessions`, nextSessions);

      const nextWeekly = recomputeWeeklyVolumeFromSessions(nextSessions);
      setWeeklyCompletedSets(nextWeekly);
      safeStorage.set(`alex_u_${uid}_weekly_volume`, nextWeekly);

      return nextSessions;
    });

    setSummaryModalSession((curr) => (curr && curr.id === normalized.id ? normalized : curr));
    setSummaryInitialEditMode(false);

    if (currentUser && !currentUser.isVisitor) {
      syncSessionToCloud(uid, normalized).catch(() => {});
    }

    onShowToast('Registro da sessão atualizado com sucesso!');
  }, [uid, currentUser, onShowToast]);

  return (
    <HistoryContext.Provider
      value={{
        sessions,
        history,
        weeklyCompletedSets,
        measurements,
        isHistoryOpen,
        setIsHistoryOpen,
        isAnalyticsOpen,
        setIsAnalyticsOpen,
        analyticsExerciseName,
        setAnalyticsExerciseName,
        isMeasurementsOpen,
        setIsMeasurementsOpen,
        summaryModalSession,
        setSummaryModalSession,
        summaryInitialEditMode,
        openSessionSummary,
        closeSessionSummary,
        handleUpdateSession,
        handleSaveMeasurement,
        handleDeleteMeasurement,
        handleOpenAnalytics,
        clearHistory,
        addCompletedSession,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory deve ser usado dentro de um HistoryProvider');
  }
  return context;
};
