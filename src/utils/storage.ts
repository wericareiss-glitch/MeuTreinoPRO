/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutLogs } from '../types/workout';

const ENC_PREFIX_V1 = '__mtp_sec_v1__:';
const ENC_PREFIX_V2 = '__mtp_sec_v2__:';
const CIPHER_KEY = 'MTP_PRO_2026_PRIVATE_VAULT_KEY_#9812';
const DEVICE_SALT_STORAGE_KEY = '__mtp_device_vault_salt_v2__';

const sharedEncoder = new TextEncoder();
const sharedDecoder = new TextDecoder();
const CIPHER_KEY_BYTES = sharedEncoder.encode(CIPHER_KEY);
const CHUNK_SIZE = 0x8000; // 32KB chunks for fast String.fromCharCode conversion

let cachedDeviceKeyBytes: Uint8Array | null = null;

function getSecureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function getDeviceKeyBytes(): Uint8Array {
  if (cachedDeviceKeyBytes) return cachedDeviceKeyBytes;
  try {
    if (typeof localStorage !== 'undefined') {
      let saltHex = localStorage.getItem(DEVICE_SALT_STORAGE_KEY);
      if (!saltHex || saltHex.length < 32) {
        saltHex = bytesToHex(getSecureRandomBytes(16));
        try {
          localStorage.setItem(DEVICE_SALT_STORAGE_KEY, saltHex);
        } catch {}
      }
      cachedDeviceKeyBytes = sharedEncoder.encode(`${CIPHER_KEY}::${saltHex}`);
      return cachedDeviceKeyBytes;
    }
  } catch {}
  cachedDeviceKeyBytes = CIPHER_KEY_BYTES;
  return cachedDeviceKeyBytes;
}

/**
 * Parses JSON while stripping dangerous prototype-pollution keys (__proto__, constructor, prototype)
 */
export function safeJsonParse<T>(rawJson: string): T {
  return JSON.parse(rawJson, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  }) as T;
}

function encodePayload(rawJson: string): string {
  try {
    const utf8Bytes = sharedEncoder.encode(rawJson);
    const keyBytes = getDeviceKeyBytes();
    const keyLen = keyBytes.length;
    const nonceBytes = getSecureRandomBytes(8);
    const nonceHex = bytesToHex(nonceBytes);
    const len = utf8Bytes.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const nonceByte = nonceBytes[i & 7] ^ ((i * 53) & 0xff);
      out[i] = utf8Bytes[i] ^ keyBytes[i % keyLen] ^ nonceByte;
    }
    const chunks: string[] = [];
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const sub = out.subarray(i, Math.min(i + CHUNK_SIZE, len));
      chunks.push(String.fromCharCode.apply(null, sub as unknown as number[]));
    }
    return `${ENC_PREFIX_V2}${nonceHex}:${btoa(chunks.join(''))}`;
  } catch {
    return rawJson;
  }
}

function decodePayload(stored: string): string {
  if (stored.startsWith(ENC_PREFIX_V2)) {
    try {
      const payload = stored.slice(ENC_PREFIX_V2.length);
      const sepIdx = payload.indexOf(':');
      if (sepIdx !== 16) return stored;
      const nonceHex = payload.slice(0, 16);
      const b64 = payload.slice(17);
      const nonceBytes = new Uint8Array(8);
      for (let j = 0; j < 8; j++) {
        nonceBytes[j] = parseInt(nonceHex.slice(j * 2, j * 2 + 2), 16) || 0;
      }
      const binary = atob(b64);
      const keyBytes = getDeviceKeyBytes();
      const keyLen = keyBytes.length;
      const len = binary.length;
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        const nonceByte = nonceBytes[i & 7] ^ ((i * 53) & 0xff);
        out[i] = binary.charCodeAt(i) ^ keyBytes[i % keyLen] ^ nonceByte;
      }
      return sharedDecoder.decode(out);
    } catch {
      return stored;
    }
  }
  if (!stored.startsWith(ENC_PREFIX_V1)) {
    return stored;
  }
  try {
    const b64 = stored.slice(ENC_PREFIX_V1.length);
    const binary = atob(b64);
    const keyLen = CIPHER_KEY_BYTES.length;
    const len = binary.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = binary.charCodeAt(i) ^ CIPHER_KEY_BYTES[i % keyLen] ^ ((i * 31) & 0xff);
    }
    return sharedDecoder.decode(out);
  } catch {
    return stored;
  }
}

function isEncryptedPayload(raw: string): boolean {
  return raw.startsWith(ENC_PREFIX_V2) || raw.startsWith(ENC_PREFIX_V1);
}

// ============================================================================
// IndexedDB Primary Offline Persistence Engine + Automatic localStorage Migration
// Eliminates the 5MB mobile localStorage ceiling for multi-year workout histories
// ============================================================================
const IDB_NAME = 'meutreino_pro_idb';
const IDB_VERSION = 2;
const IDB_STORE = 'kv_vault';
const IDB_MIGRATION_FLAG = 'meutreino_idb_migrated_v2';

// Heavy keys that grow indefinitely over months/years of workouts
const HEAVY_KEY_SUFFIXES = [
  '_sessions',
  '_history_logs',
  '_routines',
  '_measurements',
  '_current_logs',
  '_workout',
];

function isHeavyStorageKey(key: string): boolean {
  return HEAVY_KEY_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

const memoryCache = new Map<string, unknown>();
const pendingDiskWrites = new Map<string, unknown>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let idbPromise: Promise<IDBDatabase | null> | null = null;
let idbReady = false;
let idbKeysCount = 0;

function openVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => {
          idbReady = true;
          resolve(req.result);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

async function idbSet(key: string, encryptedPayload: string): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(encryptedPayload, key);
  } catch {
    // Ignore IDB transient write errors
  }
}

async function idbRemove(key: string): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
  } catch {
    // Ignore IDB delete errors
  }
}

/**
 * When localStorage reaches its ~5MB mobile quota, evicts heavy keys from localStorage
 * (since they are safely persisted in IndexedDB + memoryCache) to make room for lightweight flags.
 */
function freeLocalStorageQuotaForKey(targetKey: string, encodedPayload: string): void {
  try {
    const keysToEvict: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== targetKey && isHeavyStorageKey(k)) {
        keysToEvict.push(k);
      }
    }
    for (const heavyKey of keysToEvict) {
      const existingRaw = localStorage.getItem(heavyKey);
      if (existingRaw) {
        idbSet(heavyKey, existingRaw).catch(() => {});
        localStorage.removeItem(heavyKey);
      }
    }
    if (!isHeavyStorageKey(targetKey)) {
      localStorage.setItem(targetKey, encodedPayload);
    }
  } catch {
    // IndexedDB + memoryCache hold all data safely even if localStorage is 100% full
  }
}

function flushPendingWrites(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingDiskWrites.size === 0) return;

  const entries = Array.from(pendingDiskWrites.entries());
  pendingDiskWrites.clear();

  for (const [key, value] of entries) {
    try {
      const json = JSON.stringify(value);
      const encoded = encodePayload(json);
      // Primary persistence in IndexedDB (unbounded capacity)
      idbSet(key, encoded).catch(() => {});
      try {
        localStorage.setItem(key, encoded);
      } catch {
        // QuotaExceededError: migrate heavy keys out of localStorage into IndexedDB
        freeLocalStorageQuotaForKey(key, encoded);
      }
    } catch (e) {
      console.warn(`Failed to save storage key "${key}":`, e);
    }
  }
}

/**
 * Migrates all existing localStorage keys into IndexedDB on first run
 * and hydrates memoryCache from IndexedDB on startup.
 */
async function migrateAndHydrateIndexedDB(): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;

  try {
    // 1. Migrate any existing localStorage keys into IndexedDB if not migrated yet
    const alreadyMigrated = localStorage.getItem(IDB_MIGRATION_FLAG);
    if (!alreadyMigrated) {
      const txWrite = db.transaction(IDB_STORE, 'readwrite');
      const storeWrite = txWrite.objectStore(IDB_STORE);
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k === IDB_MIGRATION_FLAG || k === DEVICE_SALT_STORAGE_KEY) continue;
        const raw = localStorage.getItem(k);
        if (raw) {
          const encoded = isEncryptedPayload(raw) ? raw : encodePayload(raw);
          storeWrite.put(encoded, k);
        }
      }
      try {
        localStorage.setItem(IDB_MIGRATION_FLAG, new Date().toISOString());
      } catch {
        // Ignore if quota full
      }
    }

    // 2. Hydrate memoryCache from IndexedDB (ensuring records larger than localStorage are loaded)
    const txRead = db.transaction(IDB_STORE, 'readonly');
    const storeRead = txRead.objectStore(IDB_STORE);
    const getAllKeysReq = storeRead.getAllKeys();

    getAllKeysReq.onsuccess = () => {
      const keys = getAllKeysReq.result || [];
      idbKeysCount = keys.length;
      let hydratedNewData = false;
      let pendingCount = keys.length;

      if (pendingCount === 0) return;

      keys.forEach((k) => {
        const keyStr = String(k);
        const getReq = storeRead.get(k);
        getReq.onsuccess = () => {
          const rawVal = getReq.result;
          if (typeof rawVal === 'string') {
            try {
              const decoded = isEncryptedPayload(rawVal) ? decodePayload(rawVal) : rawVal;
              const parsed = safeJsonParse<any>(decoded);
              if (!memoryCache.has(keyStr)) {
                memoryCache.set(keyStr, parsed);
                hydratedNewData = true;
              } else if (isHeavyStorageKey(keyStr)) {
                // If IndexedDB has a fuller array/object than what was in localStorage, prefer IndexedDB
                const currentMem = memoryCache.get(keyStr);
                if (Array.isArray(parsed) && Array.isArray(currentMem) && parsed.length > currentMem.length) {
                  memoryCache.set(keyStr, parsed);
                  hydratedNewData = true;
                } else if (
                  parsed &&
                  typeof parsed === 'object' &&
                  !Array.isArray(parsed) &&
                  currentMem &&
                  typeof currentMem === 'object' &&
                  Object.keys(parsed).length > Object.keys(currentMem as object).length
                ) {
                  memoryCache.set(keyStr, parsed);
                  hydratedNewData = true;
                }
              }
            } catch {
              // Ignore malformed legacy entry
            }
          }
          pendingCount--;
          if (pendingCount <= 0 && hydratedNewData && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('meutreino:idb-hydrated'));
          }
        };
        getReq.onerror = () => {
          pendingCount--;
        };
      });
    };
  } catch {
    // Ignore hydration errors
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingWrites();
    }
  });
  window.addEventListener('beforeunload', flushPendingWrites);
  migrateAndHydrateIndexedDB().catch(() => {});
}

export function getIndexedDBStatus(): {
  isReady: boolean;
  cachedKeysCount: number;
  idbKeysCount: number;
} {
  return {
    isReady: idbReady,
    cachedKeysCount: memoryCache.size,
    idbKeysCount: Math.max(idbKeysCount, memoryCache.size),
  };
}

/**
 * Safe storage wrapper backed by IndexedDB + synchronous in-memory cache
 * with automatic payload encryption and QuotaExceededError protection.
 */
export const safeStorage = {
  get<T>(key: string, defaultValue: T): T {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) as T;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const isEncrypted = isEncryptedPayload(raw);
      const isV2 = raw.startsWith(ENC_PREFIX_V2);
      const decoded = isEncrypted ? decodePayload(raw) : raw;
      const parsed = safeJsonParse<T>(decoded);
      memoryCache.set(key, parsed);
      // Transparently upgrade legacy plaintext or v1 entries to v2 encrypted format & mirror to IndexedDB
      const encoded = isV2 ? raw : encodePayload(decoded);
      if (!isV2) {
        try {
          localStorage.setItem(key, encoded);
        } catch {
          // Ignore quota errors on transparent upgrade
        }
      }
      idbSet(key, encoded).catch(() => {});
      return parsed;
    } catch (e) {
      console.warn(`Failed to read storage key "${key}":`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    let clonedValue = value;
    if (value !== null && typeof value === 'object') {
      try {
        clonedValue = typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
      } catch {
        clonedValue = value;
      }
    }
    memoryCache.set(key, clonedValue);
    pendingDiskWrites.set(key, clonedValue);

    if (!flushTimer) {
      flushTimer = setTimeout(flushPendingWrites, 80);
    }
  },

  remove(key: string): void {
    memoryCache.delete(key);
    pendingDiskWrites.delete(key);
    idbRemove(key).catch(() => {});
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove storage key "${key}":`, e);
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
