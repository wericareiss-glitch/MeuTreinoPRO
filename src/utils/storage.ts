/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutLogs } from '../types/workout';

const ENC_PREFIX = '__mtp_sec_v1__:';
const CIPHER_KEY = 'MTP_PRO_2026_PRIVATE_VAULT_KEY_#9812';

function encodePayload(rawJson: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(rawJson);
    const keyBytes = new TextEncoder().encode(CIPHER_KEY);
    const out = new Uint8Array(utf8Bytes.length);
    for (let i = 0; i < utf8Bytes.length; i++) {
      out[i] = utf8Bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
    }
    let binary = '';
    for (let i = 0; i < out.length; i++) {
      binary += String.fromCharCode(out[i]);
    }
    return ENC_PREFIX + btoa(binary);
  } catch {
    return rawJson;
  }
}

function decodePayload(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  try {
    const b64 = stored.slice(ENC_PREFIX.length);
    const binary = atob(b64);
    const keyBytes = new TextEncoder().encode(CIPHER_KEY);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff);
    }
    return new TextDecoder().decode(out);
  } catch {
    return stored;
  }
}

/**
 * Safe localStorage wrapper with automatic payload encryption/obfuscation
 * to protect sensitive user data from unauthorized inspection in shared environments.
 */
export const safeStorage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const isEncrypted = raw.startsWith(ENC_PREFIX);
      const decoded = isEncrypted ? decodePayload(raw) : raw;
      const parsed = JSON.parse(decoded) as T;
      // Transparently upgrade legacy plaintext entries to encrypted format
      if (!isEncrypted) {
        try {
          localStorage.setItem(key, encodePayload(decoded));
        } catch {
          // Ignore quota errors on transparent upgrade
        }
      }
      return parsed;
    } catch (e) {
      console.warn(`Failed to read localStorage key "${key}":`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      localStorage.setItem(key, encodePayload(json));
    } catch (e) {
      console.warn(`Failed to save localStorage key "${key}":`, e);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove localStorage key "${key}":`, e);
    }
  },
};

/**
 * Calculates total Volume Load (Sets * Reps * Weight in kg) for completed sets
 */
export function calculateVolumeLoad(logs: WorkoutLogs): number {
  let totalVolume = 0;
  Object.values(logs).forEach((entry) => {
    if (entry.done) {
      const w = parseFloat(entry.weight) || 0;
      const r = parseInt(entry.reps, 10) || 0;
      if (w > 0 && r > 0) {
        totalVolume += w * r;
      }
    }
  });
  return Math.round(totalVolume);
}

/**
 * Estimates 1RM (One Rep Max) using Epley formula adjusted for RPE/RIR
 */
export function calculate1RM(
  weight: string | number,
  reps: string | number,
  rpe?: string | number
): number | null {
  const w = typeof weight === 'number' ? weight : parseFloat(weight);
  const r = typeof reps === 'number' ? reps : parseInt(reps, 10);
  if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return null;

  let rir = 0;
  if (rpe !== undefined && rpe !== '') {
    const rpeNum = typeof rpe === 'number' ? rpe : parseFloat(rpe);
    if (!isNaN(rpeNum) && rpeNum >= 5 && rpeNum <= 10) {
      rir = Math.max(0, 10 - rpeNum);
    }
  }

  const effectiveReps = r + rir;
  if (effectiveReps <= 1) return Math.round(w * 10) / 10;
  const est = w * (1 + effectiveReps / 30);
  return Math.round(est * 10) / 10;
}

/**
 * Estimates 6RM (~85% of 1RM) for hypertrophy working weight calibration
 */
export function calculate6RM(
  weight: string | number,
  reps: string | number,
  rpe?: string | number
): number | null {
  const oneRm = calculate1RM(weight, reps, rpe);
  if (!oneRm || oneRm <= 0) return null;
  const sixRm = oneRm / (1 + 6 / 30);
  return Math.round(sixRm * 2) / 2;
}

/**
 * Estimates recommended weight for the next set based on current weight, reps, and RPE
 */
export function estimateNextSetWeight(
  currentWeight: number,
  currentReps: number,
  currentRpe: number,
  targetReps = currentReps,
  targetRpe = 8
): number | null {
  const oneRm = calculate1RM(currentWeight, currentReps, currentRpe);
  if (!oneRm || oneRm <= 0) return null;
  const targetRir = Math.max(0, 10 - targetRpe);
  const effectiveTargetReps = Math.max(1, targetReps + targetRir);
  const nextWeight = oneRm / (1 + effectiveTargetReps / 30);
  return Math.round(nextWeight * 2) / 2;
}

