/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSessionSummary } from '../types/workout';

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
  // Get start of current calendar week (Monday or 7 days back)
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

  // Calculate streak: consecutive weeks with target frequency
  let consecutiveWeeksStreak = completedThisWeek >= targetFrequency ? 1 : 0;
  // Simple heuristic calculation based on total sessions
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
