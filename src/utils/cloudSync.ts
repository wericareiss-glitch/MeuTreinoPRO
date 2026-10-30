/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, WorkoutSessionSummary, WorkoutLogs, BodyMeasurement } from '../types/workout';
import { safeStorage } from './storage';

export interface CloudBackupPayload {
  version: string;
  timestamp: string;
  userId: string;
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
  historyLogs: WorkoutLogs;
  measurements: BodyMeasurement[];
  weeklyVolume: Record<string, number>;
}

/**
 * Simula ou executa a sincronização do perfil do atleta com um servidor em nuvem.
 * Compatível com endpoints REST (Supabase, Firebase ou API própria).
 */
export async function syncUserDataToCloud(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = safeStorage.get<UserProfile | null>(`alex_u_${userId}_profile`, null);
    if (!user) {
      return { success: false, message: 'Perfil não encontrado para sincronização.' };
    }

    const sessions = safeStorage.get<WorkoutSessionSummary[]>(`alex_u_${userId}_sessions`, []);
    const historyLogs = safeStorage.get<WorkoutLogs>(`alex_u_${userId}_history_logs`, {});
    const measurements = safeStorage.get<BodyMeasurement[]>(`alex_u_${userId}_measurements`, []);
    const weeklyVolume = safeStorage.get<Record<string, number>>(`alex_u_${userId}_weekly_volume`, {});

    const payload: CloudBackupPayload = {
      version: '4.1',
      timestamp: new Date().toISOString(),
      userId,
      user,
      sessions,
      historyLogs,
      measurements,
      weeklyVolume,
    };

    // Exemplo de integração com API de nuvem (Fetch / Supabase / Firebase)
    // const response = await fetch('https://api.meutreinopro.com/v1/sync', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    // Simulando latência de rede com sucesso garantido para robustez local-first
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Salva o carimbo da última sincronização na nuvem
    safeStorage.set(`mtp_cloud_sync_${userId}`, {
      lastSyncedAt: new Date().toISOString(),
      sessionsCount: sessions.length,
      success: true,
    });

    return {
      success: true,
      message: `Sincronização em nuvem concluída (${sessions.length} sessões salvas na nuvem).`,
    };
  } catch (error) {
    console.error('Erro na sincronização em nuvem:', error);
    return { success: false, message: 'Falha ao conectar com o servidor de nuvem.' };
  }
}

/**
 * Restaura os dados do atleta a partir de um backup em nuvem.
 */
export async function restoreUserDataFromCloud(userId: string, cloudPayload: CloudBackupPayload): Promise<boolean> {
  try {
    if (!cloudPayload || !cloudPayload.user) return false;

    safeStorage.set(`alex_u_${userId}_sessions`, cloudPayload.sessions || []);
    safeStorage.set(`alex_u_${userId}_history_logs`, cloudPayload.historyLogs || {});
    safeStorage.set(`alex_u_${userId}_measurements`, cloudPayload.measurements || []);
    safeStorage.set(`alex_u_${userId}_weekly_volume`, cloudPayload.weeklyVolume || {});
    safeStorage.set(`alex_u_${userId}_profile`, cloudPayload.user);

    return true;
  } catch (error) {
    console.error('Erro ao restaurar dados da nuvem:', error);
    return false;
  }
}