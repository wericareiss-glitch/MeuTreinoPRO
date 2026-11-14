import { describe, it, expect, beforeEach } from 'vitest';
import { ptTranslations } from '../i18nLocales/pt';
import { enTranslations } from '../i18nLocales/en';
import { esTranslations } from '../i18nLocales/es';
import {
  getDateLocale,
  getStoredLanguagePreference,
  LANGUAGE_PREF_STORAGE_KEY,
  resolveLanguage,
} from '../i18n';
import { safeStorage } from '../storage';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('i18n Dictionaries & Language Preference', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    safeStorage.remove(LANGUAGE_PREF_STORAGE_KEY);
  });

  it('maintains 100% key parity across PT, EN, and ES', () => {
    const ptKeys = collectKeys(ptTranslations as unknown as Record<string, unknown>);
    const enKeys = collectKeys(enTranslations as unknown as Record<string, unknown>);
    const esKeys = collectKeys(esTranslations as unknown as Record<string, unknown>);

    expect(enKeys).toEqual(ptKeys);
    expect(esKeys).toEqual(ptKeys);
    expect(ptTranslations.calendar.months).toHaveLength(12);
    expect(enTranslations.calendar.months).toHaveLength(12);
    expect(esTranslations.calendar.months).toHaveLength(12);
    expect(ptTranslations.calendar.weekdaysShort).toHaveLength(7);
    expect(enTranslations.calendar.weekdaysShort).toHaveLength(7);
    expect(esTranslations.calendar.weekdaysShort).toHaveLength(7);
  });

  it('contains zero internal developer/library jargon in user-facing translations', () => {
    const forbidden = /\b(firebase|firestore|safestorage|recharts|indexeddb|webauthn|pwa)\b/i;
    for (const [lang, dict] of [
      ['pt', ptTranslations],
      ['en', enTranslations],
      ['es', esTranslations],
    ] as const) {
      const serialized = JSON.stringify(dict);
      expect(serialized, `Forbidden jargon found in ${lang}`).not.toMatch(forbidden);
    }
  });

  it('returns proper BCP-47 date locales per language', () => {
    expect(getDateLocale('pt')).toBe('pt-BR');
    expect(getDateLocale('en')).toBe('en-US');
    expect(getDateLocale('es')).toBe('es-ES');
  });

  it('persists and resolves manual vs auto language preferences', () => {
    expect(getStoredLanguagePreference()).toBe('auto');

    safeStorage.set(LANGUAGE_PREF_STORAGE_KEY, 'en');
    expect(getStoredLanguagePreference()).toBe('en');
    expect(resolveLanguage('en')).toBe('en');

    safeStorage.set(LANGUAGE_PREF_STORAGE_KEY, 'es');
    expect(getStoredLanguagePreference()).toBe('es');
    expect(resolveLanguage('es')).toBe('es');

    safeStorage.set(LANGUAGE_PREF_STORAGE_KEY, 'auto');
    expect(getStoredLanguagePreference()).toBe('auto');
  });
});
