/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Dumbbell, User, Zap } from 'lucide-react';
import { TabType } from '../types/navigation';
import { useI18n } from '../utils/i18n';
import { soundManager } from '../utils/audio';

interface NavigationTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeSetsCount?: number;
  completedSetsCount?: number;
  sessionsCount?: number;
  hasActiveWorkout?: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  activeSetsCount = 0,
  completedSetsCount = 0,
  sessionsCount = 0,
  hasActiveWorkout = false,
}) => {
  const { t } = useI18n();

  const handleTabClick = (tabId: TabType) => {
    soundManager.vibrate(10);
    onSelectTab(tabId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const desktopTabs: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number | null;
    isHighlight?: boolean;
  }[] = [
    {
      id: 'inicio',
      label: t.tabHome,
      icon: Home,
      badge: sessionsCount > 0 ? sessionsCount : null,
    },
    {
      id: 'treino',
      label: t.tabWorkout,
      icon: Dumbbell,
    },
  ];

  if (hasActiveWorkout) {
    desktopTabs.push({
      id: 'treino_ativo',
      label: t.tabActiveWorkout || 'Treino Ativo',
      icon: Zap,
      badge: activeSetsCount > 0 ? `${completedSetsCount}/${activeSetsCount}` : null,
      isHighlight: true,
    });
  }

  desktopTabs.push({
    id: 'perfil',
    label: t.tabProfile,
    icon: User,
  });

  // Mobile Tabs (Clean, large touch targets)
  const mobileTabs = hasActiveWorkout
    ? [
        { id: 'inicio' as TabType, label: t.tabHome, icon: Home, badge: null },
        { id: 'treino' as TabType, label: t.tabWorkout, icon: Dumbbell, badge: null },
        {
          id: 'treino_ativo' as TabType,
          label: 'Treino Ativo',
          icon: Zap,
          badge: activeSetsCount > 0 ? `${completedSetsCount}/${activeSetsCount}` : null,
          isHighlight: true,
        },
        { id: 'perfil' as TabType, label: t.tabProfile, icon: User, badge: null },
      ]
    : [
        { id: 'inicio' as TabType, label: t.tabHome, icon: Home, badge: null },
        { id: 'treino' as TabType, label: t.tabWorkout, icon: Dumbbell, badge: null },
        { id: 'perfil' as TabType, label: t.tabProfile, icon: User, badge: null },
      ];

  const workoutProgressPct =
    activeSetsCount > 0 ? Math.min(100, Math.round((completedSetsCount / activeSetsCount) * 100)) : 0;

  // Na aba treino ativo, todos os menus e abas de navegação ficam ocultos para foco total
  if (activeTab === 'treino_ativo') {
    return null;
  }

  return (
    <>
      {/* Desktop / Tablet Subheader Tab Switcher */}
      <div className="w-full bg-[#0b101c] border-b border-[#1c273e] px-4 py-2 hidden md:block">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-[#101726] rounded-2xl border border-slate-800">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isHighlight = tab.isHighlight;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all relative cursor-pointer ${
                    isActive
                      ? isHighlight
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 font-black ring-2 ring-emerald-400/50'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 font-black'
                      : isHighlight
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/40 animate-pulse'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950 stroke-[2.5]' : isHighlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : tab.badge === '●'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick info in subheader */}
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasActiveWorkout ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span className="font-medium text-slate-300">
                {activeTab === 'inicio' && t.historySectionSubtitle}
                {activeTab === 'treino' && 'Selecione um treino para iniciar'}
                {activeTab === 'perfil' && 'Personalizar treinos e metas'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Navigation Dock (Native App Style, Thumb-Optimized) */}
      <nav
        aria-label="Navegação Principal Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090f1d]/95 backdrop-blur-xl border-t border-[#1d2942] pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 px-2 shadow-2xl"
      >
        <div className={`grid ${hasActiveWorkout ? 'grid-cols-4' : 'grid-cols-3'} gap-1 max-w-md mx-auto`}>
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isHighlight = 'isHighlight' in tab && tab.isHighlight;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl transition-all relative overflow-hidden cursor-pointer touch-manipulation min-h-[50px] ${
                  isActive
                    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-inner'
                    : isHighlight
                    ? 'text-amber-300 bg-amber-950/35 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 active:scale-95'
                }`}
              >
                {/* Top Active Indicator Pill */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-400" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'stroke-[2.5] text-emerald-400'
                        : isHighlight
                        ? 'text-amber-400 fill-amber-400/20 animate-pulse'
                        : 'text-slate-400'
                    }`}
                  />
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      className={`absolute -top-1.5 -right-4 text-[8px] font-mono px-1 py-0.2 rounded-full font-black ${
                        tab.badge === '●'
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-500 text-slate-950'
                      } leading-tight shadow-sm`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-bold mt-1 tracking-tight truncate max-w-full ${
                    isActive
                      ? 'text-emerald-300 font-extrabold'
                      : isHighlight
                      ? 'text-amber-300 font-extrabold'
                      : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Mini Progress Bar on Treino Ativo Tab */}
                {tab.id === 'treino_ativo' && activeSetsCount > 0 && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <span
                      className="block h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${workoutProgressPct}%` }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
