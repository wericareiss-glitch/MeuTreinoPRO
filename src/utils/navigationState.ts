/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TabType } from '../types/navigation';
import { safeStorage } from './storage';

export const VALID_TABS: readonly TabType[] = [
  'inicio',
  'treino',
  'treino_ativo',
  'perfil',
];

const GLOBAL_TAB_KEY = 'meutreino_active_tab';

export function getActiveTabStorageKey(uid?: string): string {
  return uid ? `alex_u_${uid}_active_tab` : GLOBAL_TAB_KEY;
}

export function isValidTab(value: unknown): value is TabType {
  return typeof value === 'string' && (VALID_TABS as readonly string[]).includes(value);
}

function parseRawTab(raw: string | null): TabType | null {
  if (!raw) return null;
  if (isValidTab(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (isValidTab(parsed)) return parsed;
  } catch {
    // Ignore non-JSON raw strings
  }
  return null;
}

export function getPersistedTab(uid?: string, hasActiveRoutine = true): TabType {
  const key = getActiveTabStorageKey(uid);
  let resolved: TabType | null = null;

  try {
    if (typeof localStorage !== 'undefined') {
      resolved = parseRawTab(localStorage.getItem(key));
    }
  } catch {
    // Ignore storage read errors
  }

  if (!resolved) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        resolved = parseRawTab(sessionStorage.getItem(key));
      }
    } catch {
      // Ignore storage read errors
    }
  }

  if (!resolved) {
    const fromVault = safeStorage.get<unknown>(key, null);
    if (isValidTab(fromVault)) {
      resolved = fromVault;
    }
  }

  if (!resolved) return 'inicio';
  if (resolved === 'treino_ativo' && !hasActiveRoutine) return 'treino';
  return resolved;
}

export function persistActiveTab(tab: TabType, uid?: string): void {
  if (!isValidTab(tab)) return;
  const key = getActiveTabStorageKey(uid);
  const serialized = JSON.stringify(tab);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore quota or restricted storage errors
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore quota or restricted storage errors
  }

  safeStorage.set(key, tab);
}
