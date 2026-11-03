import React from 'react';
import { Home, Dumbbell, Zap, Activity, User } from 'lucide-react';
import { TabType } from '../types/navigation';
import { useI18n } from '../utils/i18n';

interface NavigationTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeSetsCount: number;
  completedSetsCount: number;
  sessionsCount: number;
  isCardioRunning: boolean;
  hasActiveWorkout: boolean;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  activeSetsCount,
  completedSetsCount,
  sessionsCount,
  isCardioRunning,
  hasActiveWorkout,
}) => {
  const { t } = useI18n();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#101828] border border-slate-800 rounded-2xl shadow-lg">
        <button
          type="button"
          onClick={() => onSelectTab('inicio')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeTab === 'inicio'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{t.tabHome}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('treino')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer relative ${
            activeTab === 'treino' || activeTab === 'treino_ativo'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>{hasActiveWorkout ? t.tabActiveWorkout : t.tabWorkout}</span>
          {hasActiveWorkout && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse border-2 border-slate-950" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('cardio')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer relative ${
            activeTab === 'cardio'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Cardio</span>
          {isCardioRunning && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping border-2 border-slate-950" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('perfil')}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
            activeTab === 'perfil'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t.tabProfile}</span>
        </button>
      </div>
    </div>
  );
};
