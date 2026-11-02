/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'meutreino_theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // LocalStorage indisponível ou em modo anônimo estrito
  }
  return 'dark';
}

export function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  
  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('theme-light');
  } else {
    root.classList.remove('theme-light');
    root.classList.add('dark');
  }

  // Atualiza meta theme-color para navegadores mobile (Safari / Chrome Android)
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute('content', theme === 'light' ? '#f8fafc' : '#090d16');
}

type ThemeListener = (theme: Theme) => void;
const listeners = new Set<ThemeListener>();

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  applyThemeToDOM(theme);
  listeners.forEach((listener) => listener(theme));
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function useTheme() {
  const [theme, setCurrentTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    // Garante que o DOM esteja sincronizado no mount
    applyThemeToDOM(theme);

    const handler = (newTheme: Theme) => {
      setCurrentTheme(newTheme);
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [theme]);

  const toggle = useCallback(() => {
    const next = toggleTheme();
    setCurrentTheme(next);
  }, []);

  const setSpecificTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setCurrentTheme(newTheme);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme: toggle,
    setTheme: setSpecificTheme,
  };
}
