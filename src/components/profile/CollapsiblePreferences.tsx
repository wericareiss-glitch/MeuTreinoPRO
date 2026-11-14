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
} from 'lucide-react';
import { UserProfile, WorkoutSessionSummary } from '../../types/workout';
import { ThemeToggle } from '../ThemeToggle';
import { BiometricSettingsCard } from '../BiometricSettingsCard';
import { FirebaseSyncCard } from '../FirebaseSyncCard';
import { ProfilePushNotificationManager } from '../ProfilePushNotificationManager';

export interface CollapsiblePreferencesProps {
  user: UserProfile;
  sessions: WorkoutSessionSummary[];
}

export const CollapsiblePreferences: React.FC<CollapsiblePreferencesProps> = ({
  user,
  sessions,
}) => {
  const [openPref, setOpenPref] = useState<'theme' | 'biometric' | 'cloud' | 'notifications' | null>(null);

  const togglePref = (key: 'theme' | 'biometric' | 'cloud' | 'notifications') => {
    setOpenPref((curr) => (curr === key ? null : key));
  };

  return (
    <div className="space-y-2.5">
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
                Aparência & Tema Visual
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Modo escuro, claro ou contraste OLED
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
                Desbloqueio Biométrico
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Desbloqueio por Face ID ou Impressão Digital
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
                Integridade & Nuvem
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Backup contínuo e sincronização entre dispositivos
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
                Lembretes e Alertas de Treino
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Notificações push programadas nos dias de treino
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
