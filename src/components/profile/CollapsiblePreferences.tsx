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
  Bell 
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
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. 🎨 Aparência & Tema Visual (Minimizado por padrão) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsThemeOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Aparência & Tema Visual
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {isThemeOpen ? 'Expandido' : 'Minimizado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Alterne entre modo escuro, modo claro ou contraste OLED
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {isThemeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isThemeOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 space-y-4 animate-fadeIn">
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">Seleção Rápida de Tema:</span>
              <ThemeToggle variant="segmented" />
            </div>
            <ThemeToggle variant="profile-card" />
          </div>
        )}
      </div>

      {/* 2. 🔐 Desbloqueio Biométrico (Minimizado por padrão) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsBiometricOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Desbloqueio Biométrico
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {isBiometricOpen ? 'Expandido' : 'Minimizado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Face ID / Impressão Digital via WebAuthn seguro
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {isBiometricOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isBiometricOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-4">
              <BiometricSettingsCard user={user} variant="full" />
            </div>
          </div>
        )}
      </div>

      {/* 3. ☁️ Integridade & Nuvem Firebase (Minimizado por padrão) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsCloudOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Integridade & Nuvem
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {isCloudOpen ? 'Expandido' : 'Minimizado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Backup contínuo, sincronização e resolução de conflitos offline
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {isCloudOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isCloudOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-4">
              <FirebaseSyncCard user={user} />
            </div>
          </div>
        )}
      </div>

      {/* 4. 🔔 Lembretes e Alertas de Treino (Minimizado por padrão) */}
      <div className="bg-[#0f172a]/95 border border-[#1f2b42] rounded-3xl shadow-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsNotificationsOpen((prev) => !prev)}
          className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Lembretes e Alertas de Treino
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {isNotificationsOpen ? 'Expandido' : 'Minimizado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Notificações push programadas para horário de treino e lembretes de descanso
              </p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            {isNotificationsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isNotificationsOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800 animate-fadeIn">
            <div className="pt-4">
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
