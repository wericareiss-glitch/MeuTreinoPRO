/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { safeStorage } from './storage';
import type { Language, LanguagePreference, Translations } from './i18nLocales/types';
import { ptTranslations } from './i18nLocales/pt';
import { enTranslations } from './i18nLocales/en';
import { esTranslations } from './i18nLocales/es';

export type { Language, LanguagePreference, Translations };

export const LANGUAGE_PREF_STORAGE_KEY = 'meutreino_language_pref';

const translations: Record<Language, Translations> = {
  pt: ptTranslations,
  en: enTranslations,
  es: esTranslations,
};

export function getDateLocale(language: Language): string {
  if (language === 'en') return 'en-US';
  if (language === 'es') return 'es-ES';
  return 'pt-BR';
}

export function detectSystemLanguage(): Language {
  if (typeof navigator === 'undefined') return 'pt';
  const navLangs = navigator.languages || [navigator.language || ''];
  for (const l of navLangs) {
    const lower = (l || '').toLowerCase();
    if (lower.startsWith('pt')) return 'pt';
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('en')) return 'en';
  }
  const single = (navigator.language || '').toLowerCase();
  if (single.startsWith('es')) return 'es';
  if (single.startsWith('en')) return 'en';
  return 'pt';
}

export function getStoredLanguagePreference(): LanguagePreference {
  try {
    const stored = safeStorage.get<string | null>(LANGUAGE_PREF_STORAGE_KEY, null);
    if (stored === 'pt' || stored === 'en' || stored === 'es' || stored === 'auto') {
      return stored;
    }
  } catch {
    // Fallback to auto
  }
  return 'auto';
}

export function resolveLanguage(pref: LanguagePreference): Language {
  return pref === 'auto' ? detectSystemLanguage() : pref;
}

export function getCurrentLanguage(): Language {
  return resolveLanguage(getStoredLanguagePreference());
}

export function getTranslations(lang?: Language): Translations {
  const resolved = lang || getCurrentLanguage();
  return translations[resolved] || translations.pt;
}

interface I18nContextType {
  language: Language;
  languagePreference: LanguagePreference;
  dateLocale: string;
  setLanguage: (lang: Language) => void;
  setLanguagePreference: (pref: LanguagePreference) => void;
  isAutoDetect: boolean;
  setIsAutoDetect: (auto: boolean) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>(() =>
    getStoredLanguagePreference()
  );
  const [systemLanguage, setSystemLanguage] = useState<Language>(() => detectSystemLanguage());

  const language: Language = languagePreference === 'auto' ? systemLanguage : languagePreference;
  const isAutoDetect = languagePreference === 'auto';
  const dateLocale = getDateLocale(language);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'pt' ? 'pt-BR' : language;
    }
  }, [language]);

  useEffect(() => {
    const handleLanguageChange = () => {
      setSystemLanguage(detectSystemLanguage());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('languagechange', handleLanguageChange);
      return () => window.removeEventListener('languagechange', handleLanguageChange);
    }
  }, []);

  const setLanguagePreference = useCallback((pref: LanguagePreference) => {
    setLanguagePreferenceState(pref);
    safeStorage.set(LANGUAGE_PREF_STORAGE_KEY, pref);
  }, []);

  const setLanguage = useCallback(
    (newLang: Language) => {
      setLanguagePreference(newLang);
    },
    [setLanguagePreference]
  );

  const setIsAutoDetect = useCallback(
    (auto: boolean) => {
      if (auto) {
        setLanguagePreference('auto');
      } else {
        setLanguagePreference(language);
      }
    },
    [language, setLanguagePreference]
  );

  return (
    <I18nContext.Provider
      value={{
        language,
        languagePreference,
        dateLocale,
        setLanguage,
        setLanguagePreference,
        isAutoDetect,
        setIsAutoDetect,
        t: translations[language] || translations.pt,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallbackLang: Language = 'pt';
    return {
      language: fallbackLang,
      languagePreference: 'auto' as LanguagePreference,
      dateLocale: getDateLocale(fallbackLang),
      setLanguage: () => {},
      setLanguagePreference: () => {},
      isAutoDetect: true,
      setIsAutoDetect: () => {},
      t: translations.pt,
    };
  }
  return ctx;
}
