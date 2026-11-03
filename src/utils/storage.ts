import { WorkoutLogs } from '../types/workout';

export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return fallback;
      return JSON.parse(item) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, val: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore quota or private mode errors
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
};

export function calculate1RM(weightStr: string, repsStr: string): number | null {
  const w = parseFloat(weightStr);
  const r = parseInt(repsStr, 10);
  if (!w || !r || r < 1 || w <= 0) return null;
  if (r === 1) return Math.round(w);
  return Math.round(w * (1 + r / 30));
}

export function calculateVolumeLoad(logs: WorkoutLogs): number {
  let total = 0;
  Object.values(logs).forEach((log) => {
    if (log && log.done) {
      const w = parseFloat(log.weight) || 0;
      const r = parseInt(log.reps, 10) || 0;
      total += w * r;
    }
  });
  return total;
}
