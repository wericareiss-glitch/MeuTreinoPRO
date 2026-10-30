/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const safeStorage = {
  cache: {} as Record<string, string>,
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      if (this.cache[key]) {
        try {
          return JSON.parse(this.cache[key]) as T;
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    }
  },
  set(key: string, value: unknown): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      this.cache[key] = serialized;
    } catch {
      this.cache[key] = JSON.stringify(value);
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
      delete this.cache[key];
    } catch {
      delete this.cache[key];
    }
  },
};

/**
 * Calculates estimated 1 Rep Max using Epley formula with RPE/RIR adjustment:
 * effectiveReps = reps + RIR (where RIR = 10 - RPE)
 * e1RM = weight * (1 + effectiveReps / 30)
 */
export function calculate1RM(weightStr: string, repsStr: string, rpeOrRir?: string): number | null {
  const weight = parseFloat(weightStr);
  const reps = parseInt(repsStr, 10);
  if (isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) return null;

  let rir = 0;
  if (rpeOrRir !== undefined && rpeOrRir !== '') {
    const val = parseFloat(rpeOrRir);
    if (!isNaN(val)) {
      if (val >= 6 && val <= 10) {
        // Val is RPE: RIR = 10 - RPE (ex: RPE 8 -> RIR 2, RPE 6 -> RIR 4, RPE 10 -> RIR 0)
        rir = Math.max(0, 10 - val);
      } else if (val >= 0 && val <= 5) {
        // Val is directly RIR
        rir = val;
      }
    }
  }

  const effectiveReps = reps + rir;
  if (effectiveReps <= 1) return Math.round(weight);
  return Math.round(weight * (1 + effectiveReps / 30));
}

/**
 * Calculates estimated 6 Rep Max based on 1RM adjusted with RPE/RIR:
 * 6RM is the load for 6 effective reps to failure = e1RM / (1 + 6/30) = e1RM / 1.2
 */
export function calculate6RM(weightStr: string, repsStr: string, rpeOrRir?: string): number | null {
  const oneRm = calculate1RM(weightStr, repsStr, rpeOrRir);
  if (!oneRm) return null;
  return Math.round(oneRm / 1.2);
}

/**
 * Estimates recommended load for the next set given target reps and desired RPE:
 */
export function estimateNextSetWeight(
  prevWeight: number,
  prevReps: number,
  prevRpe: number = 8,
  targetReps: number = 8,
  targetRpe: number = 8
): number {
  if (prevWeight <= 0 || prevReps <= 0) return 0;
  const rir = Math.max(0, 10 - prevRpe);
  const effectivePrevReps = prevReps + rir;
  const e1rm = prevWeight * (1 + effectivePrevReps / 30);

  const targetRir = Math.max(0, 10 - targetRpe);
  const effectiveTargetReps = targetReps + targetRir;
  const targetWeight = e1rm / (1 + effectiveTargetReps / 30);

  // Round to nearest 0.5kg
  return Math.round(targetWeight * 2) / 2;
}

/**
 * Calculates total session volume load: sum(weight * reps)
 */
export function calculateVolumeLoad(logs: Record<string, { weight: string; reps: string; done: boolean }>): number {
  let total = 0;
  for (const key of Object.keys(logs)) {
    const item = logs[key];
    if (item.done) {
      const w = parseFloat(item.weight) || 0;
      const r = parseInt(item.reps, 10) || 0;
      total += w * r;
    }
  }
  return Math.round(total);
}
