/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Cloud,
  Bell,
  Globe,
  Check,
} from 'lucide-react';
import { UserProfile, WorkoutSessionSummary } from '../../types/workout';
import { ThemeToggle } from '../ThemeToggle';
import { BiometricSettingsCard } from '../BiometricSettingsCard';
import { FirebaseSyncCard } from '../FirebaseSyncCard';
import { ProfilePushNotificationManager } from '../ProfilePushNotificationManager';
import { useI18n, LanguagePreference } from '../../utils/i18n';

export interface CollapsiblePreferencesProps {
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
}

type PrefSection = 'language' | 'theme' | 'biometric' | 'cloud' | 'notifications';

export const CollapsiblePreferences: React.FC<CollapsiblePreferencesProps> = ({
  user,
  sessions,
}) => {
  const { t, language, languagePreference, setLanguagePreference } = useI18n();
  const [openPref, setOpenPref] = useState<PrefSection | null>(null);

  const togglePref = (key: PrefSection) => {
    setOpenPref((curr) => (curr === key ? null : key));
  };

  const languageOptions: Array<{ id: LanguagePreference; label: string; desc?: string }> = [
    { id: 'auto', label: t.profile.prefLanguageAuto, desc: t.profile.prefLanguageAutoDesc },
    { id: 'pt', label: t.portuguese },
    { id: 'en', label: t.english },
    { id: 'es', label: t.spanish },
  ];

  const activeLanguageLabel =
    language === 'en' ? t.english : language === 'es' ? t.spanish : t.portuguese;

  return (
    <div className="space-y-2.5">
      {/* 0. Idioma do Aplicativo */}
      <div className="bg-[#0a101d] border border-slate-800/90 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePref('language')}
          className="w-full min-h-[52px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {t.profile.prefLanguageTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {t.profile.prefLanguageSubtitle} · {activeLanguageLabel}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openPref === 'language' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openPref === 'language' && (
          <div className="p-3.5 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-3 space-y-2">
              <p className="text-[11px] text-slate-400">
                {t.languageSectionSubtitle}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {languageOptions.map((opt) => {
                  const isSelected = languagePreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLanguagePreference(opt.id)}
                      aria-pressed={isSelected}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold block truncate">{opt.label}</span>
                        {opt.desc && (
                          <span className="text-[10px] text-slate-400 block truncate">{opt.desc}</span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-emerald-500 text-slate-950 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                {t.profile.prefLanguageCurrent}{' '}
                <strong className="text-white">{activeLanguageLabel}</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 1. Aparência & Tema Visual */}
      <div className="bg-[#0a101d] border border-slate-800/90 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePref('theme')}
          className="w-full min-h-[52px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {t.profile.prefThemeTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {t.profile.prefThemeSubtitle}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openPref === 'theme' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openPref === 'theme' && (
          <div className="p-3.5 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-3">
              <ThemeToggle variant="profile-card" />
            </div>
          </div>
        )}
      </div>

      {/* 2. Desbloqueio Biométrico */}
      <div className="bg-[#0a101d] border border-slate-800/90 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePref('biometric')}
          className="w-full min-h-[52px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {t.profile.prefBiometricTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {t.profile.prefBiometricSubtitle}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openPref === 'biometric' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openPref === 'biometric' && (
          <div className="p-3.5 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-3">
              <BiometricSettingsCard user={user} variant="full" />
            </div>
          </div>
        )}
      </div>

      {/* 3. Integridade & Nuvem */}
      <div className="bg-[#0a101d] border border-slate-800/90 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePref('cloud')}
          className="w-full min-h-[52px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {t.profile.prefCloudTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {t.profile.prefCloudSubtitle}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openPref === 'cloud' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openPref === 'cloud' && (
          <div className="p-3.5 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-3">
              <FirebaseSyncCard user={user} />
            </div>
          </div>
        )}
      </div>

      {/* 4. Lembretes e Alertas de Treino */}
      <div className="bg-[#0a101d] border border-slate-800/90 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => togglePref('notifications')}
          className="w-full min-h-[52px] p-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {t.profile.prefNotificationsTitle}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {t.profile.prefNotificationsSubtitle}
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 shrink-0">
            {openPref === 'notifications' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {openPref === 'notifications' && (
          <div className="p-3.5 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-3">
              <ProfilePushNotificationManager
                userId={user.id}
                userName={user.name}
                sessions={sessions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
