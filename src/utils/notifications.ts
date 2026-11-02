/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary } from '../types/workout';
import { safeStorage } from './storage';

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // Ex: "08:00" ou "18:30"
  days: number[]; // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
  lastNotifiedDate?: string; // Formato YYYY-MM-DD para evitar notificações duplicadas no mesmo dia
}

export const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  enabled: false,
  time: '18:00',
  days: [1, 2, 3, 4, 5], // Segunda a Sexta
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

export function sendAppNotification(title: string, body: string): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Lê configuração de lembretes diários do usuário
 */
export function getReminderConfig(userId: string): DailyReminderConfig {
  return safeStorage.get<DailyReminderConfig>(`alex_reminder_cfg_${userId}`, DEFAULT_REMINDER_CONFIG);
}

/**
 * Salva configuração de lembretes diários do usuário
 */
export function saveReminderConfig(userId: string, config: DailyReminderConfig): void {
  safeStorage.set(`alex_reminder_cfg_${userId}`, config);
}

/**
 * Verifica se no momento atual deve disparar o lembrete de treino agendado
 */
export function checkAndTriggerScheduledNotification(
  userId: string,
  athleteName: string = 'Atleta'
): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const config = getReminderConfig(userId);
  if (!config.enabled) return false;

  const now = new Date();
  const currentDay = now.getDay();
  if (!config.days.includes(currentDay)) {
    return false;
  }

  // Data local do atleta (evita bug de UTC no Brasil e fusos negativos)
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const todayStr = `${localYear}-${localMonth}-${localDay}`;

  if (config.lastNotifiedDate === todayStr) {
    return false; // Já notificado com sucesso hoje
  }

  if (!config.time || !config.time.includes(':')) {
    return false;
  }

  const [targetH, targetM] = config.time.split(':').map((v) => parseInt(v, 10));
  if (isNaN(targetH) || isNaN(targetM)) {
    return false;
  }

  const currentH = now.getHours();
  const currentM = now.getMinutes();

  // Janela segura de tolerância de 5 minutos após o horário agendado
  // Impede que o usuário perca o aviso caso o timer de 40s ou a aba em segundo plano atrase alguns segundos
  const targetTotalMinutes = targetH * 60 + targetM;
  const currentTotalMinutes = currentH * 60 + currentM;
  const diffMinutes = currentTotalMinutes - targetTotalMinutes;

  if (diffMinutes >= 0 && diffMinutes <= 5) {
    const messages = [
      `Hora do treino, ${athleteName}! Seu corpo precisa do estímulo de hipertrofia hoje 💪`,
      `Bora treinar, ${athleteName}! A consistência é o que constrói resultados definitivos 🔥`,
      `Seu treino de hoje está pronto no MeuTreino Pro! Vamos bater recordes de carga 🏋️‍♂️`,
      `Lembrete de treino: Mantenha sua meta da semana ativa! 🎯`
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    const success = sendAppNotification('MeuTreino Pro ⚡', randomMsg);
    if (success) {
      config.lastNotifiedDate = todayStr;
      saveReminderConfig(userId, config);
      return true;
    }
  }

  return false;
}

/**
 * Calcula o progresso do microciclo semanal e consistência do atleta.
 */
export function getWeeklyMicrocycleStatus(
  sessions: WorkoutSessionSummary[],
  targetFrequency: number = 4
): {
  completedThisWeek: number;
  targetFrequency: number;
  percentage: number;
  isComplete: number;
  consecutiveWeeksStreak: number;
  statusMessage: string;
} {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeekSessions = sessions.filter((s) => new Date(s.date) >= oneWeekAgo);
  const completedThisWeek = thisWeekSessions.length;
  const percentage = Math.min(100, Math.round((completedThisWeek / Math.max(1, targetFrequency)) * 100));

  let statusMessage = '';
  if (completedThisWeek >= targetFrequency) {
    statusMessage = `🔥 Meta da semana batida (${completedThisWeek}/${targetFrequency} treinos)! Parabéns pela consistência.`;
  } else {
    const remaining = targetFrequency - completedThisWeek;
    statusMessage = `Resta${remaining > 1 ? 'm' : ''} ${remaining} treino${remaining > 1 ? 's' : ''} para concluir a meta de ${targetFrequency}x nesta semana!`;
  }

  let consecutiveWeeksStreak = completedThisWeek >= targetFrequency ? 1 : 0;
  if (sessions.length >= targetFrequency * 2) {
    consecutiveWeeksStreak = Math.min(12, Math.floor(sessions.length / targetFrequency));
  }

  return {
    completedThisWeek,
    targetFrequency,
    percentage,
    isComplete: completedThisWeek >= targetFrequency ? 1 : 0,
    consecutiveWeeksStreak,
    statusMessage,
  };
}
