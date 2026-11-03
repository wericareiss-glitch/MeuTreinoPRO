/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'oled' | 'light';
export type ThemeMode = 'system' | 'dark' | 'oled' | 'light';
export type AccentColor = 'emerald' | 'gold' | 'cyan' | 'crimson';

const THEME_STORAGE_KEY = 'meutreino_theme';
const THEME_MODE_STORAGE_KEY = 'meutreino_theme_mode';
const AUTO_DETECT_DISABLED_KEY = 'meutreino_auto_theme_disabled';
const ACCENT_STORAGE_KEY = 'meutreino_accent_color';

export const ACCENT_PALETTES: Array<{
  id: AccentColor;
  label: string;
  subtitle: string;
  previewHex: string;
}> = [
  {
    id: 'emerald',
    label: 'Emerald Pro',
    subtitle: 'Verde Esmeralda Clássico',
    previewHex: '#10b981',
  },
  {
    id: 'gold',
    label: 'Gold & Black',
    subtitle: 'Ouro Alta Performance',
    previewHex: '#f59e0b',
  },
  {
    id: 'cyan',
    label: 'Neon Cyan',
    subtitle: 'Ciano Elétrico Cyber',
    previewHex: '#06b6d4',
  },
  {
    id: 'crimson',
    label: 'Crimson Red',
    subtitle: 'Vermelho Sangue & Força',
    previewHex: '#f43f5e',
  },
];

/**
 * Detecta o tema preferido do sistema operacional / navegador via prefers-color-scheme
 */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Fallback seguro caso matchMedia falhe
  }
  return 'dark';
}

export function getStoredAccentColor(): AccentColor {
  if (typeof window === 'undefined') return 'emerald';
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored === 'emerald' || stored === 'gold' || stored === 'cyan' || stored === 'crimson') {
      return stored;
    }
  } catch {
    // Ignore storage read error
  }
  return 'emerald';
}

const ACCENT_RGB_MAP: Record<AccentColor, { base: string; hover: string; hex: string; hoverHex: string }> = {
  emerald: { base: '16, 185, 129', hover: '52, 211, 153', hex: '#10b981', hoverHex: '#34d399' },
  gold: { base: '245, 158, 11', hover: '251, 191, 36', hex: '#f59e0b', hoverHex: '#fbbf24' },
  cyan: { base: '6, 182, 212', hover: '34, 211, 238', hex: '#06b6d4', hoverHex: '#22d3ee' },
  crimson: { base: '244, 63, 94', hover: '251, 113, 133', hex: '#f43f5e', hoverHex: '#fb7185' },
};

export function applyAccentToDOM(accent: AccentColor) {
  if (typeof document === 'undefined') return;
  const palette = ACCENT_RGB_MAP[accent] || ACCENT_RGB_MAP.emerald;
  const thumbIdle = `rgba(${palette.base}, 0.55)`;
  const thumbHover = `rgba(${palette.hover}, 0.85)`;
  const thumbActive = palette.hoverHex;

  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
  root.style.setProperty('--accent-rgb', palette.base);
  root.style.setProperty('--accent-hover-rgb', palette.hover);
  root.style.setProperty('--accent-primary', palette.hex);
  root.style.setProperty('--accent-hover', palette.hoverHex);
  root.style.setProperty('--scrollbar-track', 'transparent');
  root.style.setProperty('--scrollbar-thumb', thumbIdle);
  root.style.setProperty('--scrollbar-thumb-hover', thumbHover);
  root.style.setProperty('--scrollbar-thumb-active', thumbActive);

  if (document.body) {
    document.body.setAttribute('data-accent', accent);
  }

  // Garante injeção direta de regras ::-webkit-scrollbar sem variáveis aninhadas para WebKit/Blink
  let styleEl = document.getElementById('meutreino-scrollbar-theme') as HTMLStyleElement | null;
  if (!styleEl && document.head) {
    styleEl = document.createElement('style');
    styleEl.id = 'meutreino-scrollbar-theme';
    document.head.appendChild(styleEl);
  }
  if (styleEl) {
    styleEl.textContent = `
      @supports (-moz-appearance: none) {
        *, *::before, *::after {
          scrollbar-width: thin !important;
          scrollbar-color: ${thumbIdle} transparent !important;
        }
      }
      ::-webkit-scrollbar,
      html::-webkit-scrollbar,
      body::-webkit-scrollbar,
      *::-webkit-scrollbar,
      .theme-scrollbar::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
        background: transparent !important;
        background-color: transparent !important;
      }
      ::-webkit-scrollbar-track,
      ::-webkit-scrollbar-track-piece,
      html::-webkit-scrollbar-track,
      html::-webkit-scrollbar-track-piece,
      body::-webkit-scrollbar-track,
      body::-webkit-scrollbar-track-piece,
      *::-webkit-scrollbar-track,
      *::-webkit-scrollbar-track-piece,
      .theme-scrollbar::-webkit-scrollbar-track,
      .theme-scrollbar::-webkit-scrollbar-track-piece {
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
      }
      ::-webkit-scrollbar-thumb,
      html::-webkit-scrollbar-thumb,
      body::-webkit-scrollbar-thumb,
      *::-webkit-scrollbar-thumb,
      .theme-scrollbar::-webkit-scrollbar-thumb {
        background: ${thumbIdle} !important;
        background-color: ${thumbIdle} !important;
        border-radius: 9999px !important;
        border: none !important;
      }
      ::-webkit-scrollbar-thumb:hover,
      html::-webkit-scrollbar-thumb:hover,
      body::-webkit-scrollbar-thumb:hover,
      *::-webkit-scrollbar-thumb:hover,
      .theme-scrollbar::-webkit-scrollbar-thumb:hover {
        background: ${thumbHover} !important;
        background-color: ${thumbHover} !important;
      }
      ::-webkit-scrollbar-thumb:active,
      html::-webkit-scrollbar-thumb:active,
      body::-webkit-scrollbar-thumb:active,
      *::-webkit-scrollbar-thumb:active,
      .theme-scrollbar::-webkit-scrollbar-thumb:active {
        background: ${thumbActive} !important;
        background-color: ${thumbActive} !important;
      }
      ::-webkit-scrollbar-button,
      ::-webkit-scrollbar-corner,
      html::-webkit-scrollbar-button,
      html::-webkit-scrollbar-corner,
      body::-webkit-scrollbar-button,
      body::-webkit-scrollbar-corner,
      *::-webkit-scrollbar-button,
      *::-webkit-scrollbar-corner {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
    `;
  }
}

/**
 * Verifica se o usuário desativou a detecção automática do sistema ao forçar Dark/OLED/Light
 */
export function isSystemThemeDetectionDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const disabledFlag = localStorage.getItem(AUTO_DETECT_DISABLED_KEY);
    if (disabledFlag === 'true') return true;
    const forcedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (forcedTheme === 'dark' || forcedTheme === 'oled' || forcedTheme === 'light') return true;
    const mode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (mode === 'dark' || mode === 'oled' || mode === 'light') return true;
  } catch {
    // Ignora erro de leitura no localStorage
  }
  return false;
}

/**
 * Retorna o modo de tema configurado ('dark' | 'oled' | 'light' quando forçado pelo usuário, ou 'system' por padrão)
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const forcedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const autoDisabled = localStorage.getItem(AUTO_DETECT_DISABLED_KEY);
    if (autoDisabled === 'true' && (forcedTheme === 'light' || forcedTheme === 'dark' || forcedTheme === 'oled')) {
      return forcedTheme;
    }

    const mode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (mode === 'light' || mode === 'dark' || mode === 'oled') {
      return mode;
    }
    if (forcedTheme === 'light' || forcedTheme === 'dark' || forcedTheme === 'oled') {
      return forcedTheme;
    }
    if (mode === 'system') {
      return 'system';
    }
  } catch {
    // LocalStorage indisponível ou em modo anônimo estrito
  }
  return 'system';
}

/**
 * Retorna o tema efetivo ('dark', 'oled' ou 'light').
 * Se o usuário forçou o tema no localStorage, ignora a detecção automática do sistema.
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const forcedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (forcedTheme === 'light' || forcedTheme === 'dark' || forcedTheme === 'oled') {
      return forcedTheme;
    }
    const mode = getStoredThemeMode();
    if (mode === 'light' || mode === 'dark' || mode === 'oled') {
      return mode;
    }
  } catch {
    // Ignora erro de storage e usa detecção do sistema
  }
  return getSystemTheme();
}

export function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  if (document.body) {
    document.body.setAttribute('data-theme', theme);
  }
  
  if (theme === 'light') {
    root.classList.remove('dark', 'theme-oled');
    root.classList.add('theme-light');
  } else if (theme === 'oled') {
    root.classList.remove('theme-light');
    root.classList.add('dark', 'theme-oled');
  } else {
    root.classList.remove('theme-light', 'theme-oled');
    root.classList.add('dark');
  }

  // Atualiza meta theme-color para navegadores mobile (Safari / Chrome Android)
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.setAttribute('name', 'theme-color');
    document.head.appendChild(metaTheme);
  }
  metaTheme.setAttribute(
    'content',
    theme === 'light' ? '#f8fafc' : theme === 'oled' ? '#000000' : '#090d16'
  );
}

type ThemeListener = (theme: Theme, mode: ThemeMode, accent: AccentColor) => void;
const listeners = new Set<ThemeListener>();

function notifyListeners(theme: Theme, mode: ThemeMode, accent: AccentColor = getStoredAccentColor()) {
  listeners.forEach((listener) => listener(theme, mode, accent));
}

/**
 * Força o modo de visualização ('dark', 'oled' ou 'light'), salva a preferência no localStorage
 * e desativa a detecção automática do sistema operacional.
 */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, theme);
    localStorage.setItem(AUTO_DETECT_DISABLED_KEY, 'true');
  } catch {}
  applyThemeToDOM(theme);
  notifyListeners(theme, theme);
}

export function setAccentColor(accent: AccentColor) {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {}
  applyAccentToDOM(accent);
  notifyListeners(getStoredTheme(), getStoredThemeMode(), accent);
}

/**
 * Reativa a detecção automática do sistema operacional (prefers-color-scheme)
 * removendo o bloqueio manual do localStorage.
 */
export function setSystemTheme(): Theme {
  const systemTheme = getSystemTheme();
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'system');
    localStorage.setItem(AUTO_DETECT_DISABLED_KEY, 'false');
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {}
  applyThemeToDOM(systemTheme);
  notifyListeners(systemTheme, 'system');
  return systemTheme;
}

/**
 * Alterna entre Dark e Light forçando o modo escolhido no localStorage
 * e desativando a detecção automática do sistema.
 */
export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

// Inicialização automática e listener global para mudanças de tema do sistema (prefers-color-scheme)
if (typeof window !== 'undefined') {
  const initialTheme = getStoredTheme();
  const initialAccent = getStoredAccentColor();
  applyThemeToDOM(initialTheme);
  applyAccentToDOM(initialAccent);

  if (typeof window.matchMedia === 'function') {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleSystemThemeChange = (event: MediaQueryListEvent | MediaQueryList) => {
        if (isSystemThemeDetectionDisabled() || getStoredThemeMode() !== 'system') {
          return;
        }
        const nextTheme: Theme = event.matches ? 'light' : 'dark';
        applyThemeToDOM(nextTheme);
        notifyListeners(nextTheme, 'system');
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    } catch {
      // Ignora caso o navegador não suporte eventos em MediaQueryList
    }
  }
}

export function useTheme() {
  const [theme, setCurrentTheme] = useState<Theme>(getStoredTheme);
  const [themeMode, setCurrentThemeMode] = useState<ThemeMode>(getStoredThemeMode);
  const [accentColor, setCurrentAccentColor] = useState<AccentColor>(getStoredAccentColor);

  useEffect(() => {
    const resolvedTheme = getStoredTheme();
    const resolvedMode = getStoredThemeMode();
    const resolvedAccent = getStoredAccentColor();
    setCurrentTheme(resolvedTheme);
    setCurrentThemeMode(resolvedMode);
    setCurrentAccentColor(resolvedAccent);
    applyThemeToDOM(resolvedTheme);
    applyAccentToDOM(resolvedAccent);

    const handler: ThemeListener = (newTheme, newMode, newAccent) => {
      setCurrentTheme(newTheme);
      setCurrentThemeMode(newMode);
      setCurrentAccentColor(newAccent);
    };

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = toggleTheme();
    setCurrentTheme(next);
    setCurrentThemeMode(next);
  }, []);

  const setSpecificTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    setCurrentTheme(newTheme);
    setCurrentThemeMode(newTheme);
  }, []);

  const setSpecificAccent = useCallback((newAccent: AccentColor) => {
    setAccentColor(newAccent);
    setCurrentAccentColor(newAccent);
  }, []);

  const enableSystemTheme = useCallback(() => {
    const sys = setSystemTheme();
    setCurrentTheme(sys);
    setCurrentThemeMode('system');
  }, []);

  return {
    theme,
    themeMode,
    accentColor,
    isDark: theme === 'dark' || theme === 'oled',
    isOled: theme === 'oled',
    isLight: theme === 'light',
    isSystem: themeMode === 'system',
    isAutoDetectDisabled: themeMode !== 'system',
    toggleTheme: toggle,
    setTheme: setSpecificTheme,
    setAccentColor: setSpecificAccent,
    setSystemTheme: enableSystemTheme,
  };
}
