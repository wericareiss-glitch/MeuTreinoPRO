/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Dumbbell } from 'lucide-react';
import { TabType } from '../types/navigation';
import { UserProfile } from '../types/workout';
import { useI18n } from '../utils/i18n';

interface HeaderProps {
  user?: UserProfile | null;
  activeTab?: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenProfile?: () => void;
  onOpenVolumeBudget?: () => void;
  onOpenHistory?: () => void;
  onOpenAnalytics?: () => void;
  onOpenMeasurements?: () => void;
  onShare?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  activeSetsCount?: number;
  completedSetsCount?: number;
  hasActiveWorkout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-x-clip bg-[#0d1424]/95 backdrop-blur-md border-b border-[#1f2d47]">
      <div className="max-w-6xl mx-auto w-full min-w-0 px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Marca / Logo */}
        <div 
          onClick={() => onSelectTab('inicio')}
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer group"
          title="Ir para o Início"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-transparent border border-emerald-500/35 hover:bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black shadow-sm group-hover:scale-105 transition-all">
            <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base md:text-lg text-white tracking-tight">
                {t.appTitle}
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden xl:block leading-none">
              Hipertrofia & Sobrecarga Científica
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
