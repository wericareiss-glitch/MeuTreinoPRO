import { describe, it, expect, beforeEach, vi } from 'vitest';

// Configura mocks de window, document e localStorage para ambiente de teste node
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

const mockDocumentElement = {
  className: '',
  attributes: {} as Record<string, string>,
  style: {} as Record<string, string>,
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn().mockReturnValue(false),
  },
  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  },
  getAttribute(name: string) {
    return this.attributes[name] || null;
  },
  removeAttribute(name: string) {
    delete this.attributes[name];
  },
};

(globalThis as any).document = {
  documentElement: mockDocumentElement,
  body: mockDocumentElement,
  head: {
    appendChild: vi.fn(),
  },
  querySelector: vi.fn().mockReturnValue(null),
  createElement: vi.fn().mockReturnValue({
    setAttribute: vi.fn(),
    style: {},
  }),
};

import {
  getSystemTheme,
  getStoredThemeMode,
  isSystemThemeDetectionDisabled,
  setSystemTheme,
  setTheme,
  applyThemeToDOM,
} from '../theme';

describe('Theme System Preference & Realtime Detection', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockDocumentElement.attributes = {};
  });

  it('detects light and dark from matchMedia', () => {
    (globalThis as any).window = {
      matchMedia: vi.fn().mockImplementation((query) => ({
        matches: query.includes('light'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    };

    expect(getSystemTheme()).toBe('light');

    (globalThis as any).window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    expect(getSystemTheme()).toBe('dark');
  });

  it('isSystemThemeDetectionDisabled returns false when mode is system', () => {
    localStorage.setItem('meutreino_theme_mode', 'system');
    localStorage.setItem('meutreino_theme', 'dark'); // Tema manual anterior
    expect(isSystemThemeDetectionDisabled()).toBe(false);
  });

  it('isSystemThemeDetectionDisabled returns true when user explicitly forced dark mode', () => {
    setTheme('dark');
    expect(isSystemThemeDetectionDisabled()).toBe(true);
    expect(getStoredThemeMode()).toBe('dark');
  });

  it('setSystemTheme enables system mode and resets detection lock', () => {
    setTheme('light');
    expect(getStoredThemeMode()).toBe('light');

    setSystemTheme();
    expect(getStoredThemeMode()).toBe('system');
    expect(isSystemThemeDetectionDisabled()).toBe(false);
  });

  it('applyThemeToDOM correctly configures data-theme attribute and style', () => {
    applyThemeToDOM('light');
    expect(mockDocumentElement.getAttribute('data-theme')).toBe('light');
    expect(mockDocumentElement.style.colorScheme).toBe('light');

    applyThemeToDOM('dark');
    expect(mockDocumentElement.getAttribute('data-theme')).toBe('dark');
    expect(mockDocumentElement.style.colorScheme).toBe('dark');
  });
});
