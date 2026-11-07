/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  testConnection, 
  handleFirestoreError, 
  OperationType,
  syncUserProfileToCloud,
  syncRoutineToCloud,
  syncSessionToCloud,
  syncMeasurementToCloud
} from './firebase';
import { 
  UserProfile, 
  WorkoutSessionSummary, 
  GeneratedWorkoutRoutine, 
  BodyMeasurement,
  WorkoutLogs,
  MuscleGroup
} from '../types/workout';
import { safeStorage } from '../utils/storage';
import { authStorage } from '../utils/auth';

export interface IntegrityReport {
  timestamp: string;
  isOnline: boolean;
  firestoreConnected: boolean;
  userAuthId: string | null;
  status: 'healthy' | 'merged' | 'offline' | 'error';
  summaryMessage: string;
  discrepanciesResolved: number;
  hasLocalUpdates: boolean;
  details: {
    sessions: {
      localCount: number;
      remoteCount: number;
      mergedTotal: number;
      pulledFromCloud: number;
      pushedToCloud: number;
      updatedFromRemoteTimestamp: number;
    };
    routines: {
      localCount: number;
      remoteCount: number;
      mergedTotal: number;
      pulledFromCloud: number;
      pushedToCloud: number;
      updatedFromRemoteTimestamp: number;
    };
    measurements: {
      localCount: number;
      remoteCount: number;
      mergedTotal: number;
      pulledFromCloud: number;
      pushedToCloud: number;
      updatedFromRemoteTimestamp: number;
    };
    profile: {
      localFound: boolean;
      remoteFound: boolean;
      status: 'in_sync' | 'merged_to_local' | 'pushed_to_cloud' | 'unchanged';
    };
  };
}

// Throttle para sincronização automática em segundo plano
let lastAutoSyncTimestamp = 0;
const AUTO_SYNC_THROTTLE_MS = 15000; // 15 segundos

/**
 * Extrai de forma robusta um timestamp numérico em milissegundos de qualquer entidade
 * Suporta objetos de Timestamp do Firestore (.toDate() / .seconds), strings ISO 8601 (updatedAt, date, createdAt)
 * ou números unix.
 */
export function extractTimestamp(item: any): number {
  if (!item) return 0;
  
  // Objeto Timestamp nativo do Firestore
  if (typeof item.toDate === 'function') {
    try {
      return item.toDate().getTime();
    } catch {
      // continua para outros fallbacks
    }
  }
  if (typeof item.seconds === 'number') {
    return item.seconds * 1000;
  }

  // Campo explícito updatedAt
  if (item.updatedAt) {
    const ms = new Date(item.updatedAt).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }

  // Campo data/date (sessões e medidas)
  if (item.date) {
    const ms = new Date(item.date).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }

  // Campo createdAt
  if (item.createdAt) {
    const ms = new Date(item.createdAt).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }

  // Unix timestamp numérico
  if (typeof item.timestamp === 'number' && item.timestamp > 0) {
    return item.timestamp;
  }

  return 0;
}

/**
 * Reconstrói histórico de logs de cargas a partir de uma lista de sessões concluídas
 */
function rebuildHistoryLogsFromSessions(sessions: WorkoutSessionSummary[]): WorkoutLogs {
  const history: WorkoutLogs = {};
  
  // Ordena cronologicamente para que as sessões mais recentes sobrescrevam
  const sorted = [...sessions].sort(
    (a, b) => extractTimestamp(a) - extractTimestamp(b)
  );

  for (const session of sorted) {
    if (!session.completedExercises) continue;
    for (const ex of session.completedExercises) {
      if (!ex.sets || !Array.isArray(ex.sets)) continue;
      ex.sets.forEach((set, sIdx) => {
        const key = `${ex.name}_${sIdx + 1}`;
        history[key] = {
          weight: set.weight?.toString() || '0',
          reps: set.reps?.toString() || '0',
          done: true,
          timestamp: extractTimestamp(session),
        };
      });
    }
  }

  return history;
}

/**
 * Recalcula o volume semanal realizado com base nas sessões dos últimos 7 dias
 */
function recalculateWeeklyVolumeFromSessions(sessions: WorkoutSessionSummary[]): Record<MuscleGroup, number> {
  const weeklyVolume: Record<string, number> = {};
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const session of sessions) {
    const sTime = extractTimestamp(session);
    if (sTime < oneWeekAgo) continue;

    if (session.completedExercises && Array.isArray(session.completedExercises)) {
      for (const ex of session.completedExercises) {
        if (ex.muscleKey) {
          const setsCount = ex.sets?.length || 0;
          weeklyVolume[ex.muscleKey] = (weeklyVolume[ex.muscleKey] || 0) + setsCount;
        }
      }
    }
  }

  return weeklyVolume as Record<MuscleGroup, number>;
}

/**
 * Executa a verificação completa de integridade comparando as chaves salvas no safeStorage com o Firestore.
 * Se encontrar timestamps mais recentes no servidor, realiza o merge automático e atualiza o estado local
 * de routines, sessions e measurements para garantir que o PWA permaneça 100% sincronizado entre dispositivos.
 */
export async function verifyAndMergeDatabase(
  userId: string,
  options?: { force?: boolean; silent?: boolean }
): Promise<IntegrityReport> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const localUser = authStorage.getActiveUser() || authStorage.getUsers().find((u) => u.id === userId);
  const currentUid = auth.currentUser?.uid || null;
  const isGuest = !userId || userId.startsWith('user_guest_') || userId.startsWith('alex_guest_') || localUser?.isVisitor || !currentUid;
  const nowIso = new Date().toISOString();

  const report: IntegrityReport = {
    timestamp: nowIso,
    isOnline,
    firestoreConnected: false,
    userAuthId: currentUid,
    status: 'healthy',
    summaryMessage: isGuest
      ? 'Modo visitante/local ativo. Dados mantidos com segurança no dispositivo.'
      : 'Verificando integridade das chaves e dados no Firebase...',
    discrepanciesResolved: 0,
    hasLocalUpdates: false,
    details: {
      sessions: { localCount: 0, remoteCount: 0, mergedTotal: 0, pulledFromCloud: 0, pushedToCloud: 0, updatedFromRemoteTimestamp: 0 },
      routines: { localCount: 0, remoteCount: 0, mergedTotal: 0, pulledFromCloud: 0, pushedToCloud: 0, updatedFromRemoteTimestamp: 0 },
      measurements: { localCount: 0, remoteCount: 0, mergedTotal: 0, pulledFromCloud: 0, pushedToCloud: 0, updatedFromRemoteTimestamp: 0 },
      profile: { localFound: false, remoteFound: false, status: 'unchanged' },
    },
  };

  if (!isOnline) {
    report.status = 'offline';
    report.summaryMessage = 'Dispositivo offline. As chaves locais do safeStorage estão intactas.';
    return report;
  }

  // Se o usuário não está autenticado no Firebase Auth ou é um perfil visitante/local:
  if (isGuest || !currentUid) {
    report.status = 'healthy';
    report.summaryMessage = 'Modo visitante/local ativo. Dados mantidos com segurança no armazenamento local.';
    safeStorage.set(`firebase_last_integrity_check_${userId}`, nowIso);
    safeStorage.set(`firebase_last_integrity_report_${userId}`, report);
    return report;
  }

  // 1. Testa conectividade com o Firestore
  try {
    const isConnected = await testConnection();
    report.firestoreConnected = isConnected;
  } catch {
    report.firestoreConnected = false;
  }

  try {
    // ========================================================
    // A. CARREGAR AS CHAVES LOCAIS DO SAFESTORAGE
    // ========================================================
    const localSessions = safeStorage.get<WorkoutSessionSummary[]>(`alex_u_${userId}_sessions`, []);
    const localRoutines = safeStorage.get<GeneratedWorkoutRoutine[]>(`alex_u_${userId}_routines`, []);
    const localMeasurements = safeStorage.get<BodyMeasurement[]>(`alex_u_${userId}_measurements`, []);

    report.details.sessions.localCount = localSessions.length;
    report.details.routines.localCount = localRoutines.length;
    report.details.measurements.localCount = localMeasurements.length;
    report.details.profile.localFound = !!localUser;

    // ========================================================
    // B. CONSULTAR DADOS E TIMESTAMPS DO FIRESTORE
    // ========================================================
    let remoteProfile: UserProfile | null = null;
    const remoteSessions: WorkoutSessionSummary[] = [];
    const remoteRoutines: GeneratedWorkoutRoutine[] = [];
    const remoteMeasurements: BodyMeasurement[] = [];

    // 1. Perfil remoto
    try {
      const userDocRef = doc(db, 'users', currentUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        remoteProfile = userSnap.data() as UserProfile;
        report.details.profile.remoteFound = true;
      }
    } catch (err) {
      console.warn('Erro ao consultar perfil remoto no Firestore:', err);
    }

    // 2. Subcoleção de Sessões remotas
    try {
      const sessionsSnap = await getDocs(collection(db, 'users', currentUid, 'sessions'));
      sessionsSnap.forEach((docSnap) => {
        remoteSessions.push(docSnap.data() as WorkoutSessionSummary);
      });
      report.details.sessions.remoteCount = remoteSessions.length;
    } catch (err) {
      console.warn('Erro ao consultar sessões remotas:', err);
    }

    // 3. Subcoleção de Rotinas remotas
    try {
      const routinesSnap = await getDocs(collection(db, 'users', currentUid, 'routines'));
      routinesSnap.forEach((docSnap) => {
        remoteRoutines.push(docSnap.data() as GeneratedWorkoutRoutine);
      });
      report.details.routines.remoteCount = remoteRoutines.length;
    } catch (err) {
      console.warn('Erro ao consultar rotinas remotas:', err);
    }

    // 4. Subcoleção de Medidas remotas
    try {
      const measurementsSnap = await getDocs(collection(db, 'users', currentUid, 'measurements'));
      measurementsSnap.forEach((docSnap) => {
        remoteMeasurements.push(docSnap.data() as BodyMeasurement);
      });
      report.details.measurements.remoteCount = remoteMeasurements.length;
    } catch (err) {
      console.warn('Erro ao consultar medidas remotas:', err);
    }

    let hasLocalChangesMade = false;

    // ========================================================
    // C. MERGE DE SESSÕES COM BASE EM TIMESTAMPS E CONTEÚDO
    // ========================================================
    const sessionsMap = new Map<string, WorkoutSessionSummary>();
    let sessionsPushed = 0;
    let sessionsPulled = 0;
    let sessionsUpdatedFromRemote = 0;

    // Indexa sessões locais primeiro
    for (const lSession of localSessions) {
      const key = lSession.id || `session_${lSession.date}`;
      sessionsMap.set(key, { ...lSession, id: key });
    }

    // Compara com as sessões remotas
    for (const rSession of remoteSessions) {
      const key = rSession.id || `session_${rSession.date}`;
      const localItem = sessionsMap.get(key);

      if (!localItem) {
        // Sessão do servidor que não existe no safeStorage local: absorve imediatamente
        sessionsMap.set(key, { ...rSession, id: key });
        sessionsPulled++;
        hasLocalChangesMade = true;
      } else {
        const remoteTs = extractTimestamp(rSession);
        const localTs = extractTimestamp(localItem);

        // Se o timestamp do servidor for mais recente, atualiza o item local com o do servidor
        if (remoteTs > localTs) {
          sessionsMap.set(key, { ...rSession, id: key });
          sessionsUpdatedFromRemote++;
          hasLocalChangesMade = true;
        } else if (localTs > remoteTs) {
          // Versão local mais recente: propaga para o servidor
          await syncSessionToCloud(currentUid, { ...localItem, id: key });
          sessionsPushed++;
        } else {
          // Mesmo timestamp: verifica se o remoto tem mais dados (ex: séries concluídas adicionais)
          const localSets = localItem.completedExercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 0;
          const remoteSets = rSession.completedExercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 0;
          if (remoteSets > localSets) {
            sessionsMap.set(key, { ...rSession, id: key });
            sessionsUpdatedFromRemote++;
            hasLocalChangesMade = true;
          } else if (localSets > remoteSets) {
            await syncSessionToCloud(currentUid, { ...localItem, id: key });
            sessionsPushed++;
          }
        }
      }
    }

    // Verifica se há sessões locais que ainda não estão no servidor
    const remoteSessionKeys = new Set(remoteSessions.map((s) => s.id || `session_${s.date}`));
    for (const lSession of localSessions) {
      const key = lSession.id || `session_${lSession.date}`;
      if (!remoteSessionKeys.has(key)) {
        await syncSessionToCloud(currentUid, { ...lSession, id: key });
        sessionsPushed++;
      }
    }

    const mergedSessions = Array.from(sessionsMap.values()).sort(
      (a, b) => extractTimestamp(b) - extractTimestamp(a)
    );

    // Se houve novos treinos ou atualizações vindas do servidor, atualiza o safeStorage
    if (sessionsPulled > 0 || sessionsUpdatedFromRemote > 0 || mergedSessions.length !== localSessions.length) {
      safeStorage.set(`alex_u_${userId}_sessions`, mergedSessions);
      const rebuiltHistory = rebuildHistoryLogsFromSessions(mergedSessions);
      const currentHistory = safeStorage.get<WorkoutLogs>(`alex_u_${userId}_history_logs`, {});
      safeStorage.set(`alex_u_${userId}_history_logs`, { ...currentHistory, ...rebuiltHistory });

      const newWeeklyVol = recalculateWeeklyVolumeFromSessions(mergedSessions);
      safeStorage.set(`alex_u_${userId}_weekly_volume`, newWeeklyVol);
    }

    report.details.sessions.mergedTotal = mergedSessions.length;
    report.details.sessions.pulledFromCloud = sessionsPulled;
    report.details.sessions.pushedToCloud = sessionsPushed;
    report.details.sessions.updatedFromRemoteTimestamp = sessionsUpdatedFromRemote;

    // ========================================================
    // D. MERGE DE ROTINAS COM BASE EM TIMESTAMPS E VERSÕES
    // ========================================================
    const routinesMap = new Map<string, GeneratedWorkoutRoutine>();
    let routinesPushed = 0;
    let routinesPulled = 0;
    let routinesUpdatedFromRemote = 0;

    for (const lRoutine of localRoutines) {
      const key = lRoutine.id || `routine_${lRoutine.letter}`;
      routinesMap.set(key, { ...lRoutine, id: key });
    }

    for (const rRoutine of remoteRoutines) {
      const key = rRoutine.id || `routine_${rRoutine.letter}`;
      const localItem = routinesMap.get(key);

      if (!localItem) {
        // Rotina criada em outro aparelho e presente no Firestore: absorve localmente
        routinesMap.set(key, { ...rRoutine, id: key });
        routinesPulled++;
        hasLocalChangesMade = true;
      } else {
        const remoteTs = extractTimestamp(rRoutine);
        const localTs = extractTimestamp(localItem);
        const remoteVer = rRoutine.version || 1;
        const localVer = localItem.version || 1;

        // Se o timestamp ou versão no servidor for mais recente, atualiza a rotina local
        if (remoteTs > localTs || remoteVer > localVer) {
          routinesMap.set(key, { ...rRoutine, id: key });
          routinesUpdatedFromRemote++;
          hasLocalChangesMade = true;
        } else if (localTs > remoteTs || localVer > remoteVer) {
          // Versão local é mais recente: envia para o Firestore
          await syncRoutineToCloud(currentUid, { ...localItem, id: key });
          routinesPushed++;
        }
      }
    }

    // Envia rotinas locais que ainda não estão na nuvem
    const remoteRoutineKeys = new Set(remoteRoutines.map((r) => r.id || `routine_${r.letter}`));
    for (const lRoutine of localRoutines) {
      const key = lRoutine.id || `routine_${lRoutine.letter}`;
      if (!remoteRoutineKeys.has(key)) {
        await syncRoutineToCloud(currentUid, { ...lRoutine, id: key });
        routinesPushed++;
      }
    }

    const mergedRoutines = Array.from(routinesMap.values()).sort((a, b) =>
      a.letter.localeCompare(b.letter)
    );

    if (routinesPulled > 0 || routinesUpdatedFromRemote > 0 || mergedRoutines.length !== localRoutines.length) {
      if (mergedRoutines.length > 0) {
        safeStorage.set(`alex_u_${userId}_routines`, mergedRoutines);
        safeStorage.set(`alex_u_${userId}_has_init_routines`, true);
      }
    }

    report.details.routines.mergedTotal = mergedRoutines.length;
    report.details.routines.pulledFromCloud = routinesPulled;
    report.details.routines.pushedToCloud = routinesPushed;
    report.details.routines.updatedFromRemoteTimestamp = routinesUpdatedFromRemote;

    // ========================================================
    // E. MERGE DE MEDIDAS CORPORAIS COM BASE EM TIMESTAMPS
    // ========================================================
    const measurementsMap = new Map<string, BodyMeasurement>();
    let measurementsPushed = 0;
    let measurementsPulled = 0;
    let measurementsUpdatedFromRemote = 0;

    for (const lM of localMeasurements) {
      const key = lM.id || `m_${lM.date}`;
      measurementsMap.set(key, { ...lM, id: key });
    }

    for (const rM of remoteMeasurements) {
      const key = rM.id || `m_${rM.date}`;
      const localItem = measurementsMap.get(key);

      if (!localItem) {
        // Medida registrada em outro dispositivo: absorve localmente
        measurementsMap.set(key, { ...rM, id: key });
        measurementsPulled++;
        hasLocalChangesMade = true;
      } else {
        const remoteTs = extractTimestamp(rM);
        const localTs = extractTimestamp(localItem);

        if (remoteTs > localTs) {
          measurementsMap.set(key, { ...rM, id: key });
          measurementsUpdatedFromRemote++;
          hasLocalChangesMade = true;
        } else if (localTs > remoteTs) {
          await syncMeasurementToCloud(currentUid, { ...localItem, id: key });
          measurementsPushed++;
        }
      }
    }

    const remoteMeasurementKeys = new Set(remoteMeasurements.map((m) => m.id || `m_${m.date}`));
    for (const lM of localMeasurements) {
      const key = lM.id || `m_${lM.date}`;
      if (!remoteMeasurementKeys.has(key)) {
        await syncMeasurementToCloud(currentUid, { ...lM, id: key });
        measurementsPushed++;
      }
    }

    const mergedMeasurements = Array.from(measurementsMap.values()).sort(
      (a, b) => extractTimestamp(b) - extractTimestamp(a)
    );

    if (measurementsPulled > 0 || measurementsUpdatedFromRemote > 0 || mergedMeasurements.length !== localMeasurements.length) {
      safeStorage.set(`alex_u_${userId}_measurements`, mergedMeasurements);
    }

    report.details.measurements.mergedTotal = mergedMeasurements.length;
    report.details.measurements.pulledFromCloud = measurementsPulled;
    report.details.measurements.pushedToCloud = measurementsPushed;
    report.details.measurements.updatedFromRemoteTimestamp = measurementsUpdatedFromRemote;

    // ========================================================
    // F. MERGE DO PERFIL DO USUÁRIO
    // ========================================================
    if (localUser && remoteProfile) {
      const localTs = extractTimestamp(localUser);
      const remoteTs = extractTimestamp(remoteProfile);

      if (remoteTs > localTs) {
        // Perfil no servidor é mais recente: atualiza o perfil local mantendo senha local
        const mergedUser: UserProfile = {
          ...localUser,
          ...remoteProfile,
          password: localUser.password, // Preserva credencial de autenticação local
          id: localUser.id,
          updatedAt: remoteProfile.updatedAt || new Date(remoteTs).toISOString(),
        };
        authStorage.saveUsers(
          authStorage._getRawUsers().map((u) => (u.id === localUser.id ? mergedUser : u))
        );
        report.details.profile.status = 'merged_to_local';
        hasLocalChangesMade = true;
      } else if (localTs > remoteTs) {
        // Local é mais recente: envia perfil para o Firestore
        await syncUserProfileToCloud({ ...localUser, id: currentUid });
        report.details.profile.status = 'pushed_to_cloud';
      } else {
        report.details.profile.status = 'in_sync';
      }
    } else if (localUser && !remoteProfile) {
      await syncUserProfileToCloud({ ...localUser, id: currentUid });
      report.details.profile.status = 'pushed_to_cloud';
    } else if (!localUser && remoteProfile) {
      const restoredUser: UserProfile = {
        ...remoteProfile,
        password: '',
        id: currentUid,
      };
      const users = authStorage._getRawUsers();
      users.push(restoredUser);
      authStorage.saveUsers(users);
      authStorage.setActiveUserId(currentUid);
      report.details.profile.status = 'merged_to_local';
      hasLocalChangesMade = true;
    }

    // Calcula discrepâncias totais que foram reconciliadas
    const totalDiscrepancies =
      sessionsPushed + sessionsPulled + sessionsUpdatedFromRemote +
      routinesPushed + routinesPulled + routinesUpdatedFromRemote +
      measurementsPushed + measurementsPulled + measurementsUpdatedFromRemote +
      (report.details.profile.status !== 'in_sync' && report.details.profile.status !== 'unchanged' ? 1 : 0);

    report.discrepanciesResolved = totalDiscrepancies;
    report.hasLocalUpdates = hasLocalChangesMade;
    safeStorage.set(`firebase_last_sync_${userId}`, nowIso);
    safeStorage.set(`firebase_last_integrity_check_${userId}`, nowIso);
    safeStorage.set(`firebase_last_integrity_report_${userId}`, report);

    if (totalDiscrepancies > 0) {
      report.status = 'merged';
      report.summaryMessage = `Sincronização concluída: ${totalDiscrepancies} item(ns) reconciliados entre seus dispositivos com base nos timestamps mais recentes.`;
    } else {
      report.status = 'healthy';
      report.summaryMessage = 'Integridade 100% verificada: todos os dados locais do safeStorage estão alinhados com o servidor.';
    }

    // ========================================================
    // G. NOTIFICAÇÃO DE EVENTO GLOBAL PARA ATUALIZAR O ESTADO DO PWA
    // ========================================================
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('meutreino:remote-sync-applied', {
          detail: {
            userId,
            report,
            discrepanciesResolved: totalDiscrepancies,
            hasLocalUpdates: hasLocalChangesMade,
            routines: mergedRoutines,
            sessions: mergedSessions,
            measurements: mergedMeasurements,
          },
        })
      );
    }

    return report;
  } catch (error) {
    console.error('Falha durante a verificação de integridade e merge:', error);
    report.status = 'error';
    report.summaryMessage = 'Ocorreu um erro ao verificar a integridade da nuvem.';
    return report;
  }
}

/**
 * Registra listeners de integridade automática no ciclo de vida do PWA:
 * - Executa verificação imediata ao carregar o PWA (100ms) para comparar chaves e timestamps do servidor
 * - Ao reconectar à internet ('online')
 * - Ao retomar a aba ou tela do aplicativo ('visibilitychange')
 * - Throttled a cada 15 segundos para otimizar conexões
 */
export function setupIntegrityAutoSync(
  userId: string,
  onMergeComplete?: (report: IntegrityReport) => void
): () => void {
  if (!userId || userId.startsWith('user_guest_') || userId.startsWith('alex_guest_') || !auth.currentUser) {
    return () => {};
  }

  const triggerAutoSync = async (force = false) => {
    if (!auth.currentUser || userId.startsWith('user_guest_') || userId.startsWith('alex_guest_')) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastAutoSyncTimestamp < AUTO_SYNC_THROTTLE_MS) {
      return;
    }
    lastAutoSyncTimestamp = now;

    try {
      const report = await verifyAndMergeDatabase(userId, { silent: true });
      if (onMergeComplete) {
        onMergeComplete(report);
      }
    } catch (err) {
      console.warn('Auto-sync integrity background check ignored error:', err);
    }
  };

  const handleOnline = () => {
    triggerAutoSync(true);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      triggerAutoSync();
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Executa uma sincronização imediata logo após o PWA carregar (100ms)
  const timer = setTimeout(() => {
    triggerAutoSync();
  }, 100);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
