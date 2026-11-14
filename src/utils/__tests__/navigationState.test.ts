/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPersistedTab,
  persistActiveTab,
  getActiveTabStorageKey,
  isValidTab,
} from '../navigationState';
import { safeStorage } from '../storage';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('navigationState', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('sessionStorage', createMemoryStorage());
    safeStorage.remove(getActiveTabStorageKey());
    safeStorage.remove(getActiveTabStorageKey('user_1'));
    safeStorage.remove(getActiveTabStorageKey('user_2'));
  });

  it('defaults to inicio when nothing is persisted', () => {
    expect(getPersistedTab('user_1')).toBe('inicio');
    expect(getPersistedTab()).toBe('inicio');
  });

  it('persists and restores treino, perfil, and inicio across reloads', () => {
    persistActiveTab('treino', 'user_1');
    expect(getPersistedTab('user_1')).toBe('treino');

    persistActiveTab('perfil', 'user_1');
    expect(getPersistedTab('user_1')).toBe('perfil');

    persistActiveTab('inicio', 'user_1');
    expect(getPersistedTab('user_1')).toBe('inicio');
  });

  it('isolates persisted tabs per user id', () => {
    persistActiveTab('perfil', 'user_1');
    persistActiveTab('treino', 'user_2');

    expect(getPersistedTab('user_1')).toBe('perfil');
    expect(getPersistedTab('user_2')).toBe('treino');
  });

  it('restores treino_ativo when an active routine exists and falls back to treino otherwise', () => {
    persistActiveTab('treino_ativo', 'user_1');

    expect(getPersistedTab('user_1', true)).toBe('treino_ativo');
    expect(getPersistedTab('user_1', false)).toBe('treino');
  });

  it('ignores invalid persisted tab values safely', () => {
    localStorage.setItem(getActiveTabStorageKey('user_1'), JSON.stringify('invalid_tab'));
    expect(isValidTab('invalid_tab')).toBe(false);
    expect(getPersistedTab('user_1')).toBe('inicio');
  });
});
